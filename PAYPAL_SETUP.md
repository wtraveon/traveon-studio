# PayPal setup for Traveon Studio

The site uses PayPal Checkout Orders v2 with the PayPal JavaScript SDK v6. Prices are fixed server-side in USD; the browser cannot choose or change an amount.

## Cloudflare Pages configuration

In the Cloudflare dashboard, open the Pages project connected to this repository, then **Settings → Variables and Secrets**. Add these values for both Preview (sandbox) and Production (live) as appropriate:

| Variable | Value |
|---|---|
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal app secret (**mark as secret**) |
| `PAYPAL_ENV` | `sandbox` for testing; change to `live` only after approval |

Do not put the client secret in website HTML, JavaScript, GitHub, or a chat message. The public client ID is returned by the config endpoint; the secret stays server-side.

The existing Cloudflare Pages D1 binding must be named `DB`. The payment endpoint creates its own `paypal_orders` table when the first order is created.

## Sandbox test

1. In the PayPal Developer Dashboard, create or select a sandbox REST app.
2. Copy its sandbox client ID and secret into Cloudflare Preview environment variables.
3. Set `PAYPAL_ENV=sandbox`.
4. Deploy and open `https://traveonstudio.com/checkout/` on the preview URL or a protected preview deployment.
5. Use a PayPal sandbox personal buyer account to test both the $300 website deposit and $200 workbook checkout.
6. Confirm the PayPal order shows as completed and the D1 `paypal_orders` record is marked `COMPLETED`.

## Production activation

After sandbox tests pass, add the live REST app credentials as Production secrets and set `PAYPAL_ENV=live`. Deploy and perform a small live payment/refund test before announcing checkout as active.

## Current checkout scope

- Website package: $600 total; checkout collects the 50% ($300) deposit. Remaining $300 is due after final approval and before launch.
- Business & Productivity Workbook: $200 one-time purchase.
- Website care: $99/month is not yet offered through automated checkout. A PayPal subscription plan must be created and its plan ID configured before recurring billing is enabled.

## Security notes

- Product IDs map to fixed prices in `functions/_lib/paypal.js`; submitted browser amounts are ignored.
- The server creates and captures orders using the REST API and validates currency, amount, product reference, and completed capture status.
- The client secret is never sent to the browser.
- PayPal webhooks for refunds, disputes, and post-payment lifecycle updates are a recommended follow-on before expanding payment operations.
