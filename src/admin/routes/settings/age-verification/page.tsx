import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Button, Checkbox, Container, Heading, Hint, Input, Label, Select, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type AgeVerificationMode = "all" | "category" | "product"

type Settings = {
  domain: string
  widgetBaseUrl: string
  widgetVersion: string
  mode: AgeVerificationMode
  categoryIds: string[]
  webhookSecretConfigured: boolean
}

type ProductCategory = {
  id: string
  name: string
}

const MODE_OPTIONS: { value: AgeVerificationMode; label: string; hint: string }[] = [
  { value: "product", label: "Specific products", hint: "Products with the \"Requires age verification\" checkbox set." },
  { value: "category", label: "Specific categories", hint: "Every product in the categories selected below." },
  { value: "all", label: "All orders", hint: "Every order is verified, regardless of what's in the cart." },
]

const AgeVerificationSettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/admin/age-verification/settings", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => setSettings(json.settings))

    fetch("/admin/product-categories?limit=1000&fields=id,name", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => setCategories(json.product_categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  const handleSave = async () => {
    if (!settings) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/admin/age-verification/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: settings.domain,
          widgetBaseUrl: settings.widgetBaseUrl,
          widgetVersion: settings.widgetVersion,
          mode: settings.mode,
          categoryIds: settings.categoryIds,
        }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => null)
        throw new Error(json?.message ?? "Failed to save settings")
      }

      const json = await response.json()
      setSettings(json.settings)
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (categoryId: string, checked: boolean) => {
    if (!settings) {
      return
    }
    const categoryIds = checked
      ? [...settings.categoryIds, categoryId]
      : settings.categoryIds.filter((id) => id !== categoryId)
    setSettings({ ...settings, categoryIds })
  }

  if (!settings) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Age Verification</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Configure the Verifico widget and which orders require age verification.
          </Text>
        </div>
        <div className="flex items-center gap-x-3">
          {savedAt && !saving && (
            <Text size="small" className="text-ui-fg-subtle">
              Saved
            </Text>
          )}
          <Button size="small" onClick={handleSave} isLoading={saving}>
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-y-6 px-6 py-6">
        {error && (
          <Hint variant="error" className="w-fit">
            {error}
          </Hint>
        )}

        <div className="flex flex-col gap-y-2">
          <Label size="small">Widget base URL</Label>
          <Input
            value={settings.widgetBaseUrl}
            onChange={(event) => setSettings({ ...settings, widgetBaseUrl: event.target.value })}
            placeholder="https://agechecked.verifico.io"
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label size="small">Verify mode</Label>
          <Select
            value={settings.mode}
            onValueChange={(value) => setSettings({ ...settings, mode: value as AgeVerificationMode })}
          >
            <Select.Trigger className="w-80">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {MODE_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Hint>{MODE_OPTIONS.find((option) => option.value === settings.mode)?.hint}</Hint>
        </div>

        {settings.mode === "category" && (
          <div className="flex flex-col gap-y-2">
            <Label size="small">Categories that require verification</Label>
            {categories.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                No product categories found.
              </Text>
            ) : (
              <div className="border-ui-border-base flex max-h-64 flex-col gap-y-2 overflow-y-auto rounded-md border p-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-x-2">
                    <Checkbox
                      id={category.id}
                      checked={settings.categoryIds.includes(category.id)}
                      onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                    />
                    <Label htmlFor={category.id} size="small" weight="plus" className="cursor-pointer">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Age Verification",
  icon: ShieldCheck,
})

export default AgeVerificationSettingsPage
