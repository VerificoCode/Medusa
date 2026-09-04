import crypto from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import AgeVerification from "./models/age-verification"
import type { AgeVerificationModuleOptions } from "./types"

type ProductLike = {
  metadata?: Record<string, unknown> | null
  categories?: { id: string }[] | null
}

type OrderAddressLike = {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
}

type OrderLineItemLike = {
  id: string
  title: string
  product_id?: string | null
  quantity: number
  unit_price: number
  product?: ProductLike | null
}

type OrderLike = {
  id: string
  display_id?: number | string
  email?: string | null
  metadata?: Record<string, unknown> | null
  billing_address?: OrderAddressLike | null
  items?: OrderLineItemLike[] | null
}

class AgeVerificationModuleService extends MedusaService({
  AgeVerification,
}) {
  protected options_: AgeVerificationModuleOptions

  constructor(container: MedusaContainer, options: AgeVerificationModuleOptions) {
    super(...arguments)
    this.options_ = options
  }

  async getWidgetConfig() {
    return {
      domain: this.options_.domain,
      widgetBaseUrl: this.options_.widgetBaseUrl ?? "https://agechecked.verifico.io",
      widgetVersion: this.options_.widgetVersion ?? "2_0_0",
    }
  }

  /**
   * Mirrors AgeChecked's WooCommerce "Verify Mode" setting (all customers /
   * specific categories / specific products). Product-level opt-in uses
   * `product.metadata.requires_age_verification === true`, set the same way
   * the WordPress plugin used a per-product checkbox meta key.
   */
  async productRequiresVerification(product: ProductLike | null | undefined): Promise<boolean> {
    if (!product) {
      return false
    }

    switch (this.options_.mode ?? "product") {
      case "all":
        return true
      case "category":
        return (product.categories ?? []).some((category) =>
          (this.options_.categoryIds ?? []).includes(category.id)
        )
      case "product":
      default:
        return product.metadata?.requires_age_verification === true
    }
  }

  async orderRequiresVerification(order: OrderLike): Promise<boolean> {
    const flags = await Promise.all(
      (order.items ?? []).map((item) => this.productRequiresVerification(item.product))
    )
    return flags.some(Boolean)
  }

  /**
   * Builds the customer + cart payload the Verifico widget expects, in the
   * same shape as the `acTransaction` object the WordPress plugin injected
   * into the order-received page.
   */
  async buildTransactionPayload(order: OrderLike) {
    const address = order.billing_address
    const metadataDob = order.metadata?.date_of_birth
    const dob = typeof metadataDob === "string" ? metadataDob : ""

    const user = {
      email: order.email ?? "",
      firstname: address?.first_name ?? "",
      lastname: address?.last_name ?? "",
      phone: address?.phone ?? "",
      order_id: String(order.display_id ?? order.id),
      dob,
      address: {
        address1: address?.address_1 ?? "",
        address2: address?.address_2 ?? "",
        city: address?.city ?? "",
        postcode: address?.postal_code ?? "",
        country: address?.country_code ?? "",
      },
      site_transaction_ref: order.id,
    }

    const products = await Promise.all(
      (order.items ?? []).map(async (item) => ({
        id: item.product_id ?? item.id,
        name: item.title,
        price: item.unit_price,
        quantity: item.quantity,
        requires_av: await this.productRequiresVerification(item.product),
      }))
    )

    return {
      user: [user],
      cart: { products },
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature on Verifico's status callback.
   * Adjust the algorithm/header to match Verifico's actual webhook contract
   * once you have their integration docs - this assumes a shared-secret
   * HMAC over the raw request body, which is the common pattern.
   */
  async verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string | undefined | null
  ): Promise<boolean> {
    if (!this.options_.webhookSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "medusa-plugin-age-verification: `webhookSecret` option is not configured; refusing to process webhook"
      )
    }

    if (!signature) {
      return false
    }

    const expected = crypto
      .createHmac("sha256", this.options_.webhookSecret)
      .update(rawBody)
      .digest("hex")

    const expectedBuffer = Buffer.from(expected, "utf8")
    const signatureBuffer = Buffer.from(signature, "utf8")

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  }
}

export default AgeVerificationModuleService
