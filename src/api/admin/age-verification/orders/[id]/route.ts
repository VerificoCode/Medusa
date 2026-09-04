import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGE_VERIFICATION_MODULE } from "../../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../../modules/age-verification/service"
import type { AgeVerificationStatus } from "../../../../../modules/age-verification/types"
import setAgeVerificationStatusWorkflow from "../../../../../workflows/set-age-verification-status"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const [record] = await ageVerificationModuleService.listAgeVerifications({
    order_id: id,
  })

  res.json({ age_verification: record ?? null })
}

/** Lets an admin manually override the verification status from the order detail page. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { status } = req.body as { status: AgeVerificationStatus }

  const { result: record } = await setAgeVerificationStatusWorkflow(req.scope).run({
    input: {
      order_id: id,
      status,
    },
  })

  res.json({ age_verification: record })
}
