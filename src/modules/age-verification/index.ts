import { Module } from "@medusajs/framework/utils"
import AgeVerificationModuleService from "./service"

export const AGE_VERIFICATION_MODULE = "age_verification"

export default Module(AGE_VERIFICATION_MODULE, {
  service: AgeVerificationModuleService,
})
