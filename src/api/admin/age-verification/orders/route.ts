import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrdersListWorkflow } from "@medusajs/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AGE_VERIFICATION_MODULE } from "../../../../modules/age-verification"
import type AgeVerificationModuleService from "../../../../modules/age-verification/service"

/**
 * Lists orders (all of them, like the core order list) with their age
 * verification status joined in - the data source for the admin
 * "Age Verification" page's order table.
 *
 * Uses the same getOrdersListWorkflow the core /admin/orders route uses to
 * get payment_status/fulfillment_status, since those are computed by the
 * workflow itself and aren't resolvable through Query directly. The
 * workflow's `variables` only reliably filters by `id` in practice (its `q`
 * search parameter appears to require the core route's own request
 * pipeline to do something with it that isn't reproducible by passing `q`
 * straight through - it silently no-ops here), so free-text search is
 * resolved separately via Query first, then intersected into an `id` filter
 * that's passed to the workflow.
 *
 * Supports filtering by `?status=` (one of the AgeVerificationStatus values,
 * including "not_required" for orders with no verification record at all)
 * and `?q=` (searches customer email).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ageVerificationModuleService: AgeVerificationModuleService = req.scope.resolve(
    AGE_VERIFICATION_MODULE
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Number(req.query.limit ?? 20)
  const offset = Number(req.query.offset ?? 0)
  const status = typeof req.query.status === "string" ? req.query.status : undefined
  const q = typeof req.query.q === "string" && req.query.q.length ? req.query.q : undefined

  const variables: Record<string, unknown> = {
    is_draft_order: false,
    skip: offset,
    take: limit,
    order: { created_at: "DESC" },
  }

  let matchingIds: string[] | undefined

  if (q) {
    const { data: matches } = await query.graph({
      entity: "order",
      fields: ["id"],
      filters: { email: { $ilike: `%${q}%` } },
    })
    matchingIds = matches.map((order) => order.id)
  }

  if (status && status !== "not_required") {
    const matchingStatus = await ageVerificationModuleService.listAgeVerifications({ status })
    const statusOrderIds = new Set(matchingStatus.map((record) => record.order_id))
    matchingIds = matchingIds
      ? matchingIds.filter((id) => statusOrderIds.has(id))
      : Array.from(statusOrderIds)
  } else if (status === "not_required") {
    const withRecord = await ageVerificationModuleService.listAgeVerifications({})
    const excludedOrderIds = new Set(withRecord.map((record) => record.order_id))
    matchingIds = matchingIds
      ? matchingIds.filter((id) => !excludedOrderIds.has(id))
      : undefined

    if (!matchingIds && excludedOrderIds.size) {
      variables.id = { $nin: Array.from(excludedOrderIds) }
    }
  }

  if (matchingIds) {
    if (!matchingIds.length) {
      res.json({ orders: [], count: 0, limit, offset })
      return
    }
    variables.id = matchingIds
  }

  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: ["id", "display_id", "email", "status", "currency_code", "total", "created_at"],
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
