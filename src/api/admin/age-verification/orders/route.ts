import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrdersListWorkflow } from "@medusajs/core-flows"
import { AGE_VERIFICATION_MODULE } from "../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../modules/age-verification/service"

/**
 * Lists orders (all of them, like the core order list) with their age
 * verification status joined in - the data source for the admin
 * "Age Verification" page's order table.
 *
 * Uses the same getOrdersListWorkflow the core /admin/orders route uses,
 * rather than a raw Query call, because computed fields like
 * payment_status/fulfillment_status are decorated by this workflow and
 * aren't resolvable through Query directly.
 *
 * Supports filtering by `?status=` (one of the AgeVerificationStatus values,
 * including "not_required" for orders with no verification record at all).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )

  const limit = Number(req.query.limit ?? 20)
  const offset = Number(req.query.offset ?? 0)
  const status = typeof req.query.status === "string" ? req.query.status : undefined

  const variables: Record<string, unknown> = {
    is_draft_order: false,
    skip: offset,
    take: limit,
    order: { created_at: "DESC" },
  }

  if (status && status !== "not_required") {
    const matching = await ageVerificationModuleService.listAgeVerifications({ status })
    const orderIds = matching.map((record) => record.order_id)

    if (!orderIds.length) {
      res.json({ orders: [], count: 0, limit, offset })
      return
    }

    variables.id = orderIds
  } else if (status === "not_required") {
    const withRecord = await ageVerificationModuleService.listAgeVerifications({})
    const orderIds = withRecord.map((record) => record.order_id)

    if (orderIds.length) {
      variables.id = { $nin: orderIds }
    }
  }

  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: [
        "id",
        "display_id",
        "email",
        "status",
        "+payment_status",
        "+fulfillment_status",
        "currency_code",
        "total",
        "created_at",
      ],
      variables,
    },
  })

  if (Array.isArray(result)) {
    // Can't happen when `variables.skip`/`take` are provided, but satisfies
    // the workflow's union return type.
    res.json({ orders: [], count: 0, limit, offset })
    return
  }

  const { rows, metadata } = result
  const orders = rows as unknown as Array<Record<string, unknown> & { id: string }>

  const orderIds = orders.map((order) => order.id)

  const records = orderIds.length
    ? await ageVerificationModuleService.listAgeVerifications({ order_id: orderIds })
    : []

  const recordByOrderId = new Map(records.map((record) => [record.order_id, record]))

  const results = orders.map((order) => ({
    ...order,
    age_verification: recordByOrderId.get(order.id) ?? null,
  }))

  res.json({ orders: results, count: metadata.count, limit: metadata.take, offset: metadata.skip })
}
