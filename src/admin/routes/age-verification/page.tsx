import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Container, Heading, Input, Select, Table, Text } from "@medusajs/ui"
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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending" },
  { value: "pending_age_verification", label: "Pending age verification" },
  { value: "verified", label: "Verified" },
  { value: "low_risk", label: "Low risk" },
  { value: "high_risk", label: "High risk" },
  { value: "failed", label: "Failed" },
]

// Matches the dot colors @medusajs/dashboard uses for payment/fulfillment status.
type StatusColor = "grey" | "green" | "red" | "blue" | "orange" | "purple"

const AGE_VERIFICATION_STATUS: Record<string, { label: string; color: StatusColor }> = {
  not_required: { label: "Not required", color: "grey" },
  pending: { label: "Pending", color: "orange" },
  pending_age_verification: { label: "Pending age verification", color: "orange" },
  verified: { label: "Verified", color: "green" },
  low_risk: { label: "Low risk", color: "green" },
  high_risk: { label: "High risk", color: "red" },
  failed: { label: "Failed", color: "red" },
}

const PAYMENT_STATUS: Record<string, { label: string; color: StatusColor }> = {
  not_paid: { label: "Not paid", color: "red" },
  authorized: { label: "Authorized", color: "orange" },
  partially_authorized: { label: "Partially authorized", color: "red" },
  awaiting: { label: "Awaiting", color: "orange" },
  captured: { label: "Captured", color: "green" },
  refunded: { label: "Refunded", color: "red" },
  partially_refunded: { label: "Partially refunded", color: "orange" },
  partially_captured: { label: "Partially captured", color: "orange" },
  canceled: { label: "Canceled", color: "red" },
  requires_action: { label: "Requires action", color: "orange" },
}

const FULFILLMENT_STATUS: Record<string, { label: string; color: StatusColor }> = {
  not_fulfilled: { label: "Not fulfilled", color: "red" },
  partially_fulfilled: { label: "Partially fulfilled", color: "orange" },
  fulfilled: { label: "Fulfilled", color: "green" },
  partially_shipped: { label: "Partially shipped", color: "orange" },
  shipped: { label: "Shipped", color: "green" },
  delivered: { label: "Delivered", color: "green" },
  partially_delivered: { label: "Partially delivered", color: "orange" },
  partially_returned: { label: "Partially returned", color: "orange" },
  returned: { label: "Returned", color: "green" },
  canceled: { label: "Canceled", color: "red" },
  requires_action: { label: "Requires action", color: "orange" },
}

/** Same markup/classes as @medusajs/dashboard's shared table StatusCell. */
const StatusCell = ({ color, children }: { color: StatusColor; children: React.ReactNode }) => (
  <div className="txt-compact-small text-ui-fg-subtle flex h-full w-full items-center gap-x-2 overflow-hidden">
    <div role="presentation" className="flex h-5 w-2 items-center justify-center">
      <div
        className={`h-2 w-2 rounded-sm shadow-[0px_0px_0px_1px_rgba(0,0,0,0.12)_inset] ${
          {
            grey: "bg-ui-tag-neutral-icon",
            green: "bg-ui-tag-green-icon",
            red: "bg-ui-tag-red-icon",
            blue: "bg-ui-tag-blue-icon",
            orange: "bg-ui-tag-orange-icon",
            purple: "bg-ui-tag-purple-icon",
          }[color]
        }`}
      />
    </div>
    <span className="truncate">{children}</span>
  </div>
)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

/** Matches @medusajs/dashboard's MoneyAmountCell formatting, e.g. "€ 20.00 EUR". */
const formatMoney = (amount: number, currencyCode: string) => {
  const symbol = new Intl.NumberFormat([], {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
  })
    .format(0)
    .replace(/\d/g, "")
    .replace(/[.,]/g, "")
    .trim()
  const total = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol} ${total} ${currencyCode.toUpperCase()}`
}

const AgeVerificationPage = () => {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // Debounce the search box so it doesn't refetch on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    setLoaded(false)
    const params = new URLSearchParams({ limit: "50" })
    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }
    if (search) {
      params.set("q", search)
    }
    fetch(`/admin/age-verification/orders?${params.toString()}`, { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        setRows(json.orders ?? [])
        setLoaded(true)
      })
  }, [statusFilter, search])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Age Verification</Heading>
        <div className="flex items-center gap-x-2">
          <Input
            type="search"
            placeholder="Search orders"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger className="w-48">
              <Select.Value placeholder="Filter by status" />
            </Select.Trigger>
            <Select.Content>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Order</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Date</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Customer</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Payment</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Fulfillment</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center justify-end">
                <span className="truncate">Total</span>
              </div>
            </Table.HeaderCell>
            <Table.HeaderCell>
              <div className="flex h-full w-full items-center">
                <span className="truncate">Age Verification</span>
              </div>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => {
            const ageStatus = AGE_VERIFICATION_STATUS[row.age_verification?.status ?? "not_required"]
            const paymentStatus = PAYMENT_STATUS[row.payment_status]
            const fulfillmentStatus = FULFILLMENT_STATUS[row.fulfillment_status]

            return (
              <Table.Row
                key={row.id}
                className="cursor-pointer"
                onClick={() => {
                  window.location.href = `/app/orders/${row.id}`
                }}
              >
                <Table.Cell>
                  <div className="text-ui-fg-subtle txt-compact-small flex h-full w-full items-center overflow-hidden">
                    <span className="truncate">#{row.display_id}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex h-full w-full items-center overflow-hidden">
                    <span className="truncate">{formatDate(row.created_at)}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex h-full w-full items-center overflow-hidden">
                    <span className="truncate">{row.email}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {paymentStatus ? (
                    <StatusCell color={paymentStatus.color}>{paymentStatus.label}</StatusCell>
                  ) : (
                    "-"
                  )}
                </Table.Cell>
                <Table.Cell>
                  {fulfillmentStatus ? (
                    <StatusCell color={fulfillmentStatus.color}>{fulfillmentStatus.label}</StatusCell>
                  ) : (
                    "-"
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex h-full w-full items-center justify-end overflow-hidden">
                    <span className="truncate">{formatMoney(row.total, row.currency_code)}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <StatusCell color={ageStatus.color}>{ageStatus.label}</StatusCell>
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
