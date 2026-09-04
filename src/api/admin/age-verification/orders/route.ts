import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AGE_VERIFICATION_MODULE } from "../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../modules/age-verification/service"

/** Lists age verification records, enriched with basic order info, for the admin page. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Number(req.query.limit ?? 20)
  const offset = Number(req.query.offset ?? 0)
  const status = typeof req.query.status === "string" ? req.query.status : undefined

  const [records, count] = await ageVerificationModuleService.listAndCountAgeVerifications(
    status ? { status } : {},
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )

  const orderIds = records.map((record) => record.order_id)

  const { data: orders } = orderIds.length
    ? await query.graph({
        entity: "order",
        filters: { id: orderIds },
        fields: ["id", "display_id", "email"],
      })
    : { data: [] as { id: string; display_id: number; email: string }[] }

  const ordersById = new Map(orders.map((order) => [order.id, order]))

  const age_verifications = records.map((record) => ({
    ...record,
    order: ordersById.get(record.order_id) ?? null,
  }))

  res.json({ age_verifications, count, limit, offset })
}
