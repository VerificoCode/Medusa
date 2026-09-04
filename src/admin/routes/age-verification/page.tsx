import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
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

  useEffect(() => {
    fetch("/admin/age-verification/orders?limit=50", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        setRows(json.orders ?? [])
        setLoaded(true)
      })
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Age Verification</Heading>
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
            No orders yet.
          </Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Age Verification",
  icon: ShieldCheck,
})

export default AgeVerificationPage
