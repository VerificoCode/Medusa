import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Checkbox, Container, Heading, Label, Text } from "@medusajs/ui"
import { useState } from "react"

/**
 * Lets an admin flag a product as requiring age verification without
 * hand-editing raw metadata - equivalent to the WordPress plugin's
 * per-product checkbox. Stored at `metadata.requires_age_verification`,
 * which is what `productRequiresVerification` (in "product" verify mode)
 * checks.
 */
const ProductAgeVerificationWidget = ({ data: product }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const [checked, setChecked] = useState(product.metadata?.requires_age_verification === true)
  const [saving, setSaving] = useState(false)

  const handleChange = async (value: boolean) => {
    const previous = checked
    setChecked(value)
    setSaving(true)

    try {
      const response = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { ...product.metadata, requires_age_verification: value },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }
    } catch {
      setChecked(previous)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Age Verification</Heading>
      </div>
      <div className="flex items-center gap-x-2 px-6 py-4">
        <Checkbox
          id="requires_age_verification"
          checked={checked}
          disabled={saving}
          onCheckedChange={(value) => handleChange(value === true)}
        />
        <Label htmlFor="requires_age_verification" weight="plus" className="cursor-pointer">
          Requires age verification
        </Label>
      </div>
      <div className="px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Only takes effect while the Age Verification module's verify mode (Settings &gt; Age
          Verification) is set to "Specific products".
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductAgeVerificationWidget
