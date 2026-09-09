# medusa-plugin-age-verification

A Medusa v2 plugin that adds Verifico/AgeChecked age verification to a Medusa
store. Ported from the [AgeChecked Plus+](https://www.agechecked.com) plugin
for WooCommerce, so the behavior it replicates is:

- Flag age-restricted products (or whole categories, or every order).
- Embed the Verifico widget script on every storefront page.
- Hand the widget a customer + cart payload on the order confirmation page.
- Track a per-order verification status (`pending`, `verified`, `low_risk`,
  `high_risk`, `failed`, `not_required`) and let admins override it manually.
- Receive a status callback from Verifico and update the order accordingly.

**The webhook payload contract (the `STATUS_MAP` and field names in
`src/api/webhooks/age-verification/route.ts`) is inferred from the WordPress
integration's `site_transaction_ref` field, not confirmed against Verifico's
actual server-to-server API docs.** Check that against your Verifico account
before relying on it, and adjust the mapping/signature header as needed.

## Install

Published to GitHub Packages under the `VerificoCode` org, not the public npm
registry. Add the registry mapping to the consuming app's `.npmrc`:

```
@verificocode:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then install with a GitHub token (needs `read:packages` scope) available as
`NODE_AUTH_TOKEN`:

```bash
NODE_AUTH_TOKEN=$(gh auth token) pnpm add @verificocode/medusa-plugin-age-verification
```

Add it to `medusa-config.ts` in your Medusa application:

```ts
import { loadEnv, defineConfig } from "@medusajs/framework/utils"

module.exports = defineConfig({
  // ...
  plugins: [
    {
      resolve: "@verificocode/medusa-plugin-age-verification",
      options: {
        domain: process.env.AGE_VERIFICATION_DOMAIN,
        webhookSecret: process.env.AGE_VERIFICATION_WEBHOOK_SECRET,
        widgetBaseUrl: process.env.AGE_VERIFICATION_WIDGET_BASE_URL, // optional, defaults to https://agechecked.verifico.io
        widgetVersion: process.env.AGE_VERIFICATION_WIDGET_VERSION, // optional, defaults to "2_0_0"
        mode: "product", // "all" | "category" | "product" (default)
        categoryIds: [], // used when mode is "category"
      },
    },
  ],
})
```

Then run migrations in the application using the plugin:

```bash
npx medusa db:migrate
```

## Flagging products

With the default `mode: "product"`, tag a product as age-restricted by
setting metadata on it (e.g. from the admin dashboard's product metadata
editor, or via the admin API):

```json
{ "requires_age_verification": true }
```

With `mode: "category"`, list the restricted category IDs in the `categoryIds`
option instead. With `mode: "all"`, every order requires verification.

## Storefront integration

This plugin is backend-only - the storefront (a separate Next.js/other app)
needs two small integrations:

1. **Embed the widget on every page.** Fetch `GET /store/age-verification/config`
   and inject the script it describes, e.g.:

   ```ts
   const { domain, widgetBaseUrl, widgetVersion } = await fetch(
     `${MEDUSA_BACKEND_URL}/store/age-verification/config`
   ).then((r) => r.json())

   const script = document.createElement("script")
   script.src = `${widgetBaseUrl}/tr/?domain=${domain}&v=${widgetVersion}`
   script.async = true
   document.head.appendChild(script)
   ```

2. **Feed the widget the order payload on the confirmation page.** Call
   `GET /store/age-verification/orders/:id` (as the authenticated customer who
   placed the order - send the customer's session cookie or bearer token) and
   set the result as `window.acTransaction` before/after the widget script
   loads, matching Verifico's expected client-side data shape.

## Order metadata

`buildTransactionPayload` reads date of birth from `order.metadata.date_of_birth`.
Your storefront's checkout needs to collect DOB and pass it through as cart/order
metadata under that key - Medusa has no built-in DOB field.

## Admin

An order detail widget shows the current verification status and lets an
admin manually override it (useful while testing, or if Verifico's callback
fails). Status can also be read/set directly via
`GET`/`POST /admin/age-verification/orders/:id`.

## Development

```bash
pnpm install
pnpm dev
```

`medusa plugin:develop` watches this package and syncs it into a linked test
Medusa application - see the
[plugin development docs](https://docs.medusajs.com/learn/fundamentals/plugins)
for how to set one up and link it (`medusa plugin:add` from the test app).

## Publishing

1. Bump `version` in `package.json` (GitHub Packages rejects re-publishing an
   existing version).
2. Build and publish:
   ```bash
   pnpm build
   NODE_AUTH_TOKEN=$(gh auth token) pnpm publish --no-git-checks
   ```
   Needs a GitHub PAT with `write:packages` scope (`gh auth token` works if
   you're logged in with that scope). Package is private - visibility follows
   this repo (`VerificoCode/Medusa`).
3. Bump the version in each consuming site's `package.json` and reinstall.
   Publishing here does **not** redeploy any site automatically - upgrade one
   pilot site first, verify, then roll out to the rest.

Pinned to `pnpm@9.12.3` (`packageManager` field) - newer pnpm (11.x) refuses
to expand `${NODE_AUTH_TOKEN}` from a *committed* `.npmrc` for security
reasons and errors out on publish.

## Compatibility

Built against `@medusajs/medusa@2.19.0`; requires Medusa v2 (>= 2.4.0 per
Medusa's plugin system).
