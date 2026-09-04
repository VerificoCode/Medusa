export type AgeVerificationMode = "all" | "category" | "product"

export type AgeVerificationStatus =
  | "not_required"
  | "pending"
  | "verified"
  | "low_risk"
  | "high_risk"
  | "failed"

export type AgeVerificationModuleOptions = {
  /**
   * The storefront domain passed to the Verifico widget script
   * (matches the `domain` query param AgeChecked's WordPress plugin sends).
   */
  domain: string
  /**
   * Shared secret used to verify the HMAC-SHA256 signature Verifico sends
   * on its status callback. See the README for the expected header/contract.
   */
  webhookSecret: string
  /** Base URL of the hosted Verifico widget. Defaults to the production one. */
  widgetBaseUrl?: string
  /** Widget version passed as the `v` query param. */
  widgetVersion?: string
  /**
   * How products/orders are selected for verification:
   * - "all": every order requires verification
   * - "category": products in `categoryIds` require verification
   * - "product": products with `metadata.requires_age_verification === true` require verification (default)
   */
  mode?: AgeVerificationMode
  /** Product category IDs that require verification when `mode` is "category". */
  categoryIds?: string[]
}
