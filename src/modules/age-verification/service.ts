import crypto from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import AgeVerification from "./models/age-verification"
import AgeVerificationSettings from "./models/age-verification-settings"
import type { AgeVerificationMode, AgeVerificationModuleOptions } from "./types"

type ResolvedSettings = {
  domain: string
  widgetBaseUrl: string
  widgetVersion: string
  mode: AgeVerificationMode
  categoryIds: string[]
  webhookSecretConfigured: boolean
}

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
  AgeVerificationSettings,
}) {
  protected options_: AgeVerificationModuleOptions

  constructor(container: MedusaContainer, options: AgeVerificationModuleOptions) {
    super(...arguments)
    this.options_ = options
  }

  /**
   * The saved settings row, if the admin Settings > Age Verification page
   * has ever been submitted. There's only ever one (or zero) rows.
   */
  async getSettingsRecord() {
    const [record] = await this.listAgeVerificationSettings({}, { take: 1 })
    return record ?? null
  }

  /**
   * Merges the saved settings row over the plugin's static `medusa-config.ts`
   * options - any field left unset (null) in the DB row falls back to the
   * option, so the module keeps working with zero rows saved. The webhook
   * secret is deliberately excluded: it's a credential, so it stays
   * env/options-only rather than round-tripping through the admin UI.
   */
  async resolveSettings(): Promise<ResolvedSettings> {
    const record = await this.getSettingsRecord()

    return {
      domain: record?.domain || this.options_.domain,
      widgetBaseUrl:
        record?.widget_base_url || this.options_.widgetBaseUrl || "https://agechecked.verifico.io",
      widgetVersion: record?.widget_version || this.options_.widgetVersion || "2_0_0",
      mode: (record?.mode as AgeVerificationMode | undefined) ?? this.options_.mode ?? "product",
      categoryIds: (record?.category_ids as unknown as string[] | undefined) ?? this.options_.categoryIds ?? [],
      webhookSecretConfigured: Boolean(this.options_.webhookSecret),
    }
  }

  async updateSettings(data: {
    domain?: string | null
    widgetBaseUrl?: string | null
    widgetVersion?: string | null
    mode?: AgeVerificationMode | null
    categoryIds?: string[] | null
  }): Promise<ResolvedSettings> {
    const record = await this.getSettingsRecord()
    const payload = {
      domain: data.domain?.trim() || null,
      widget_base_url: data.widgetBaseUrl?.trim() || null,
      widget_version: data.widgetVersion?.trim() || null,
      mode: data.mode || null,
      category_ids: (data.categoryIds?.length ? data.categoryIds : null) as unknown as Record<
        string,
        unknown
      > | null,
    }

    if (record) {
      await this.updateAgeVerificationSettings({ id: record.id, ...payload })
    } else {
      await this.createAgeVerificationSettings(payload)
    }

    return this.resolveSettings()
  }

  async getWidgetConfig() {
    const { domain, widgetBaseUrl, widgetVersion } = await this.resolveSettings()
    return { domain, widgetBaseUrl, widgetVersion }
  }

  /**
   * Mirrors AgeChecked's WooCommerce "Verify Mode" setting (all customers /
   * specific categories / specific products). Product-level opt-in uses
   * `product.metadata.requires_age_verification === true`, set the same way
   * the WordPress plugin used a per-product checkbox meta key.
   *
   * `settings` can be passed in by callers (like `buildTransactionPayload`)
   * that already resolved it, to avoid re-querying per line item.
   */
  async productRequiresVerification(
    product: ProductLike | null | undefined,
    settings?: ResolvedSettings
  ): Promise<boolean> {
    if (!product) {
      return false
    }

    const resolved = settings ?? (await this.resolveSettings())

    switch (resolved.mode) {
      case "all":
        return true
      case "category":
        return (product.categories ?? []).some((category) =>
          resolved.categoryIds.includes(category.id)
        )
      case "product":
      default:
        return product.metadata?.requires_age_verification === true
    }
  }

  async orderRequiresVerification(order: OrderLike): Promise<boolean> {
    const settings = await this.resolveSettings()
    const flags = await Promise.all(
      (order.items ?? []).map((item) => this.productRequiresVerification(item.product, settings))
    )
    return flags.some(Boolean)
  }

  /**
   * Builds the customer + cart payload the Verifico widget expects, in the
   * same shape as the `acTransaction` object the WordPress plugin injected
   * into the order-received page.
   */
  async buildTransactionPayload(order: OrderLike) {
    const settings = await this.resolveSettings()
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
        requires_av: await this.productRequiresVerification(item.product, settings),
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
