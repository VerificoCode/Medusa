import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGE_VERIFICATION_MODULE } from "../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../modules/age-verification/service"

/**
 * Public config the storefront uses to embed the Verifico widget script on
 * every page - equivalent to the WordPress plugin's `wp_footer` hook.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  res.json(await ageVerificationModuleService.getWidgetConfig())
}
