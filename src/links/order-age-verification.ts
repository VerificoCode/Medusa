import OrderModule from "@medusajs/medusa/order"
import { defineLink } from "@medusajs/framework/utils"
import AgeVerificationModule from "../modules/age-verification"

export default defineLink(OrderModule.linkable.order, AgeVerificationModule.linkable.ageVerification)
