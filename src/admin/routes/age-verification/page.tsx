import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Badge, Container, Heading, Select, Table, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type AgeVerificationRecord = {
  status: string
  provider_reference: string | null
}

type OrderRow = {
  id: string
  display_id: number
  email: string
  status: string
  payment_status: string
  fulfillment_status: string
  currency_code: string
  total: number
  created_at: string
  age_verification: AgeVerificationRecord | null
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "low_risk", label: "Low risk" },
  { value: "high_risk", label: "High risk" },
  { value: "failed", label: "Failed" },
]

const STATUS_COLORS: Record<string, "grey" | "orange" | "green" | "red"> = {
  not_required: "grey",
  pending: "orange",
  verified: "green",
  low_risk: "green",
  high_risk: "red",
  failed: "red",
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

const formatMoney = (total: number, currencyCode: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode.toUpperCase() }).format(
    total
  )

const AgeVerificationPage = () => {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    setLoaded(false)
    const params = new URLSearchParams({ limit: "50" })
    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }
    fetch(`/admin/age-verification/orders?${params.toString()}`, { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        setRows(json.orders ?? [])
        setLoaded(true)
      })
  }, [statusFilter])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Age Verification</Heading>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger className="w-48">
            <Select.Value placeholder="Filter by status" />
          </Select.Trigger>
          <Select.Content>
            {STATUS_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Payment</Table.HeaderCell>
            <Table.HeaderCell>Fulfillment</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Age Verification</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => {
            const status = row.age_verification?.status ?? "not_required"
            return (
              <Table.Row key={row.id}>
                <Table.Cell>
                  <a href={`/app/orders/${row.id}`} className="text-ui-fg-interactive">
                    #{row.display_id}
                  </a>
                </Table.Cell>
                <Table.Cell>{formatDate(row.created_at)}</Table.Cell>
                <Table.Cell>{row.email}</Table.Cell>
                <Table.Cell className="capitalize">{row.payment_status?.replace(/_/g, " ")}</Table.Cell>
                <Table.Cell className="capitalize">
                  {row.fulfillment_status?.replace(/_/g, " ")}
                </Table.Cell>
                <Table.Cell>{formatMoney(row.total, row.currency_code)}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[status] ?? "grey"}>{status.replace(/_/g, " ")}</Badge>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
      {loaded && rows.length === 0 && (
        <div className="px-6 py-8 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            No orders match this filter.
          </Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Age Verification",
  icon: ShieldCheck,
  nested: "/orders",
})

export default AgeVerificationPage
