import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/age-verification/orders*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
