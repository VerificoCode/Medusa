import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AGE_VERIFICATION_MODULE } from "../../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../../modules/age-verification/service"

/**
 * Returns the customer + cart payload for the order's own confirmation
 * page to hand to the Verifico widget - equivalent to the `acTransaction`
 * JS object the WordPress plugin echoed on `checkout/order-received`.
 *
 * Restricted to the authenticated customer who placed the order (see
 * `src/api/middlewares.ts`), unlike the original which relied on the page
 * itself being private.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id },
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "metadata",
      "billing_address.first_name",
      "billing_address.last_name",
      "billing_address.phone",
      "billing_address.address_1",
      "billing_address.address_2",
      "billing_address.city",
      "billing_address.postal_code",
      "billing_address.country_code",
      "items.id",
      "items.title",
      "items.product_id",
      "items.quantity",
      "items.unit_price",
      "items.product.metadata",
      "items.product.categories.id",
    ],
  })

  const order = orders[0]

  if (!order || order.customer_id !== req.auth_context?.actor_id) {
    res.status(404).json({ message: "Order not found" })
    return
  }

  res.json(await ageVerificationModuleService.buildTransactionPayload(order))
}
