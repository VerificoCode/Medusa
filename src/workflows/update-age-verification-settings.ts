import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { AGE_VERIFICATION_MODULE } from "../modules/age-verification"
import type AgeVerificationModuleService from "../modules/age-verification/service"
import type { AgeVerificationMode } from "../modules/age-verification/types"

type UpdateAgeVerificationSettingsInput = {
  domain?: string | null
  widgetBaseUrl?: string | null
  widgetVersion?: string | null
  mode?: AgeVerificationMode | null
  categoryIds?: string[] | null
}

const updateAgeVerificationSettingsStep = createStep(
  "update-age-verification-settings",
  async (input: UpdateAgeVerificationSettingsInput, { container }) => {
    const ageVerificationModuleService: AgeVerificationModuleService = container.resolve(
      AGE_VERIFICATION_MODULE
    )

    const previous = await ageVerificationModuleService.getSettingsRecord()
    const settings = await ageVerificationModuleService.updateSettings(input)

    return new StepResponse(settings, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const ageVerificationModuleService: AgeVerificationModuleService = container.resolve(
      AGE_VERIFICATION_MODULE
    )
    await ageVerificationModuleService.updateSettings({
      domain: previous.domain,
      widgetBaseUrl: previous.widget_base_url,
      widgetVersion: previous.widget_version,
      mode: previous.mode as AgeVerificationMode | null,
      categoryIds: previous.category_ids as unknown as string[] | null,
    })
  }
)

const updateAgeVerificationSettingsWorkflow = createWorkflow(
  "update-age-verification-settings",
  (input: UpdateAgeVerificationSettingsInput) => {
    const settings = updateAgeVerificationSettingsStep(input)
    return new WorkflowResponse(settings)
  }
)

export default updateAgeVerificationSettingsWorkflow
