import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type ResolvedOrder = { id: string; display_id: number }

/**
 * Verifico identifies an order by the `site_transaction_ref` this plugin put
 * in the widget payload: the order's display number, the one the customer
 * sees. Every Medusa API needs the `order_…` id instead, so callbacks and
 * lookups go through here. Accepts the display number (with or without a
 * leading `#`) or an `order_…` id (for transactions created before the
 * payload carried the display number). Returns null when no order matches.
 */
export async function resolveOrder(
  container: MedusaContainer,
  ref: string | undefined | null
): Promise<ResolvedOrder | null> {
  const trimmed = ref?.trim() ?? ""

  if (!trimmed) {
    return null
  }

  let filters: { id: string } | { display_id: number }

  if (trimmed.startsWith("order_")) {
    filters = { id: trimmed }
  } else {
    const displayId = Number(trimmed.replace(/^#/, ""))

    if (!Number.isInteger(displayId) || displayId <= 0) {
      return null
    }

    filters = { display_id: displayId }
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id"],
    filters,
  })

  const order = orders[0]

  return order ? { id: order.id, display_id: Number(order.display_id) } : null
}
