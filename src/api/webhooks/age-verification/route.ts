import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGE_VERIFICATION_MODULE } from "../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../modules/age-verification/service"
import type { AgeVerificationStatus } from "../../../modules/age-verification/types"
import setAgeVerificationStatusWorkflow from "../../../workflows/set-age-verification-status"

type VerificationCallbackBody = {
  site_transaction_ref?: string
  status?: string
  reference?: string
}

/**
 * Maps Verifico's status values to our internal status enum. This - and the
 * whole payload shape below - is inferred from the WordPress integration's
 * `site_transaction_ref` field and isn't confirmed against Verifico's actual
 * webhook docs. Adjust to match once you have their callback contract.
 */
const STATUS_MAP: Record<string, AgeVerificationStatus> = {
  verified: "verified",
  approved: "verified",
  low_risk: "low_risk",
  high_risk: "high_risk",
  failed: "failed",
  rejected: "failed",
  pending_age_verification: "pending_age_verification",
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const signatureHeader = req.headers["x-verifico-signature"]
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader

  if (!req.rawBody) {
    // Requires `bodyParser: { preserveRawBody: true }` on this route - see
    // src/api/middlewares.ts. Without the true raw bytes, a signature check
    // can never reliably match what Verifico actually signed.
    res.status(500).json({ message: "Raw request body is not available for signature verification" })
    return
  }

  let isValid: boolean
  try {
    isValid = await ageVerificationModuleService.verifyWebhookSignature(req.rawBody, signature)
  } catch (error) {
    res.status(500).json({ message: (error as Error).message })
    return
  }

  if (!isValid) {
    res.status(401).json({ message: "Invalid signature" })
    return
  }

  const body = req.body as VerificationCallbackBody
  const orderId = body.site_transaction_ref
  const status = body.status ? STATUS_MAP[body.status] : undefined

  if (!orderId || !status) {
    res.status(400).json({ message: "Invalid payload" })
    return
  }

  const [existing] = await ageVerificationModuleService.listAgeVerifications({
    order_id: orderId,
  })

  if (!existing) {
    res.status(404).json({ message: "No age verification record for order" })
    return
  }

  await setAgeVerificationStatusWorkflow(req.scope).run({
    input: {
      order_id: orderId,
      status,
      provider_reference: body.reference,
    },
  })

  res.status(200).json({ received: true })
}
