import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { AGE_VERIFICATION_MODULE } from "../modules/age-verification"
import type AgeVerificationModuleService from "../modules/age-verification/service"
import type { AgeVerificationStatus } from "../modules/age-verification/types"

type SetAgeVerificationStatusInput = {
  order_id: string
  status: AgeVerificationStatus
  provider_reference?: string | null
}

const setAgeVerificationStatusStep = createStep(
  "set-age-verification-status",
  async ({ order_id, status, provider_reference }: SetAgeVerificationStatusInput, { container }) => {
    const ageVerificationModuleService: AgeVerificationModuleService = container.resolve(
      AGE_VERIFICATION_MODULE
    )

    const [existing] = await ageVerificationModuleService.listAgeVerifications({ order_id })
    const verified_at = status === "verified" ? new Date() : (existing?.verified_at ?? null)

    const record = existing
      ? await ageVerificationModuleService.updateAgeVerifications({
          id: existing.id,
          status,
          provider_reference: provider_reference ?? existing.provider_reference,
          verified_at,
        })
      : await ageVerificationModuleService.createAgeVerifications({
          order_id,
          status,
          provider_reference: provider_reference ?? null,
          verified_at,
        })

    return new StepResponse(record)
  }
)

const setAgeVerificationStatusWorkflow = createWorkflow(
  "set-age-verification-status",
  (input: SetAgeVerificationStatusInput) => {
    const record = setAgeVerificationStatusStep(input)
    return new WorkflowResponse(record)
  }
)

export default setAgeVerificationStatusWorkflow
