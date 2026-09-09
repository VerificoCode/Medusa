import { model } from "@medusajs/framework/utils"

const AgeVerification = model.define("age_verification", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  status: model
    .enum([
      "not_required",
      "pending",
      "pending_age_verification",
      "verified",
      "low_risk",
      "high_risk",
      "failed",
    ])
    .default("pending"),
  provider: model.text().default("verifico"),
  provider_reference: model.text().nullable(),
  verified_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export default AgeVerification
