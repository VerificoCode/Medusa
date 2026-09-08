import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGE_VERIFICATION_MODULE } from "../../../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../../../modules/age-verification/service"

/**
 * Public status lookup for a single order - backs the "Verify age" button
 * the storefront's account order pages show while status is "pending", so a
 * customer can re-open the widget's verification modal from their own order
 * history rather than only getting one shot at it on the confirmation page.
 *
 * Open by order id + publishable key, same posture as the other store
 * routes in this plugin (order id is the bearer capability, matching core's
 * own `/store/orders/:id`).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const [record] = await ageVerificationModuleService.listAgeVerifications({ order_id: id })

  res.json({ status: record?.status ?? "not_required" })
}
