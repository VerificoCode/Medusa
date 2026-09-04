import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type AgeVerificationRow = {
  id: string
  order_id: string
  status: string
  provider_reference: string | null
  order: { id: string; display_id: number; email: string } | null
}

const STATUS_COLORS: Record<string, "grey" | "orange" | "green" | "red"> = {
  not_required: "grey",
  pending: "orange",
  verified: "green",
  low_risk: "green",
  high_risk: "red",
  failed: "red",
}

const AgeVerificationPage = () => {
  const [rows, setRows] = useState<AgeVerificationRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/admin/age-verification/orders?limit=50", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        setRows(json.age_verifications ?? [])
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
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Provider reference</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>
                {row.order ? (
                  <a href={`/app/orders/${row.order.id}`} className="text-ui-fg-interactive">
                    #{row.order.display_id}
                  </a>
                ) : (
                  row.order_id
                )}
              </Table.Cell>
              <Table.Cell>{row.order?.email ?? "-"}</Table.Cell>
              <Table.Cell>
                <Badge color={STATUS_COLORS[row.status] ?? "grey"}>
                  {row.status.replace(/_/g, " ")}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">{row.provider_reference ?? "-"}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {loaded && rows.length === 0 && (
        <div className="px-6 py-8 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            No orders require age verification yet.
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
