# Billing

Stripe Checkout is available through POST /api/billing/checkout when STRIPE_SECRET_KEY and STRIPE_PRICE_PRO/TEAM are configured. Stripe webhook signature verification is implemented at POST /api/billing/webhook. Billing remains inactive until real Stripe prices and secrets are configured.
