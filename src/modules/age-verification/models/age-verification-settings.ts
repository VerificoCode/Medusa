import { model } from "@medusajs/framework/utils"

/**
 * A single row, edited from the admin Settings > Age Verification page.
 * Any field left null falls back to the plugin's static `medusa-config.ts`
 * options, so the module works with zero DB rows on a fresh install.
 */
const AgeVerificationSettings = model.define("age_verification_settings", {
  id: model.id().primaryKey(),
  domain: model.text().nullable(),
  widget_base_url: model.text().nullable(),
  widget_version: model.text().nullable(),
  mode: model.enum(["all", "category", "product"]).nullable(),
  category_ids: model.json().nullable(),
})

export default AgeVerificationSettings
