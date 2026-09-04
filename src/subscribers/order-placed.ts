import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AGE_VERIFICATION_MODULE } from "../modules/age-verification"
import type AgeVerificationModuleService from "../modules/age-verification/service"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const ageVerificationModuleService: AgeVerificationModuleService = container.resolve(
    AGE_VERIFICATION_MODULE
  )

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id: data.id },
    fields: [
      "id",
      "items.id",
      "items.product.id",
      "items.product.metadata",
      "items.product.categories.id",
    ],
  })

  const order = orders[0]

  if (!order) {
    return
  }

  const requiresVerification = await ageVerificationModuleService.orderRequiresVerification(order)

  await ageVerificationModuleService.createAgeVerifications({
    order_id: order.id,
    status: requiresVerification ? "pending" : "not_required",
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
