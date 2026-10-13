import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveOrder } from "../../../../../utils/resolve-order"

/**
 * Exact lookup of an order by the display number Verifico holds as
 * `site_transaction_ref`, so its callback engine can resolve the
 * `order_…` id it needs for every other call. The core order list's `q`
 * search only matches the number as a substring.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query.display_id
  const displayId = Array.isArray(raw) ? raw[0] : raw

  if (typeof displayId !== "string" || !displayId.trim()) {
    res.status(400).json({ message: "display_id query parameter is required" })
    return
  }

  const order = await resolveOrder(req.scope, displayId)

  if (!order) {
    res.status(404).json({ message: "Order not found" })
    return
  }

  res.json({ order })
}
