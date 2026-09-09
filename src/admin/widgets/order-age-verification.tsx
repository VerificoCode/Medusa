import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, OrderDTO } from "@medusajs/framework/types"
import { Badge, Container, Heading, Select, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type AgeVerificationRecord = {
  id: string
  status: string
  provider: string
  provider_reference: string | null
  verified_at: string | null
}

const STATUS_OPTIONS = [
  "not_required",
  "pending",
  "pending_age_verification",
  "verified",
  "low_risk",
  "high_risk",
  "failed",
]

const STATUS_COLORS: Record<string, "grey" | "orange" | "green" | "red"> = {
  not_required: "grey",
  pending: "orange",
  pending_age_verification: "orange",
  verified: "green",
  low_risk: "green",
  high_risk: "red",
  failed: "red",
}

const OrderAgeVerificationWidget = ({ data: order }: DetailWidgetProps<OrderDTO>) => {
  const [record, setRecord] = useState<AgeVerificationRecord | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchRecord = async () => {
    const response = await fetch(`/admin/age-verification/orders/${order.id}`, {
      credentials: "include",
    })
    const json = await response.json()
    setRecord(json.age_verification)
    setLoaded(true)
  }

  useEffect(() => {
    fetchRecord()
  }, [order.id])

  const handleStatusChange = async (status: string) => {
    await fetch(`/admin/age-verification/orders/${order.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchRecord()
  }

  if (!loaded || !record) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Age Verification</Heading>
        <Badge color={STATUS_COLORS[record.status] ?? "grey"}>
          {record.status.replace(/_/g, " ")}
        </Badge>
      </div>
      <div className="flex flex-col gap-y-2 px-6 py-4">
        {record.provider_reference && (
          <Text size="small" leading="compact">
            Provider reference: {record.provider_reference}
          </Text>
        )}
        <Select value={record.status} onValueChange={handleStatusChange}>
          <Select.Trigger>
            <Select.Value placeholder="Override status" />
          </Select.Trigger>
          <Select.Content>
            {STATUS_OPTIONS.map((status) => (
              <Select.Item key={status} value={status}>
                {status.replace(/_/g, " ")}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderAgeVerificationWidget
