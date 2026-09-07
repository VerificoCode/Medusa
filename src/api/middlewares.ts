import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/webhooks/age-verification",
      bodyParser: { preserveRawBody: true },
    },
  ],
})
