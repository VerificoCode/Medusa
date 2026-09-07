import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGE_VERIFICATION_MODULE } from "../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../modules/age-verification/service"
import updateAgeVerificationSettingsWorkflow from "../../../../workflows/update-age-verification-settings"

const VALID_MODES = ["all", "category", "product"]

/** Backs the admin Settings > Age Verification page. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  res.json({ settings: await ageVerificationModuleService.resolveSettings() })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const body = (req.body ?? {}) as Record<string, unknown>

  if (body.mode !== undefined && body.mode !== null && !VALID_MODES.includes(body.mode as string)) {
    res.status(400).json({ message: `mode must be one of: ${VALID_MODES.join(", ")}` })
    return
  }

  if (
    body.categoryIds !== undefined &&
    body.categoryIds !== null &&
    (!Array.isArray(body.categoryIds) || body.categoryIds.some((id) => typeof id !== "string"))
  ) {
    res.status(400).json({ message: "categoryIds must be an array of strings" })
    return
  }

  const { result: settings } = await updateAgeVerificationSettingsWorkflow(req.scope).run({
    input: {
      domain: typeof body.domain === "string" ? body.domain : null,
      widgetBaseUrl: typeof body.widgetBaseUrl === "string" ? body.widgetBaseUrl : null,
      widgetVersion: typeof body.widgetVersion === "string" ? body.widgetVersion : null,
      mode: (body.mode as "all" | "category" | "product" | null) ?? null,
      categoryIds: (body.categoryIds as string[] | null) ?? null,
    },
  })

  res.json({ settings })
}
