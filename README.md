# Traveon Studio Website

Source repository for [traveonstudio.com](https://traveonstudio.com/).

## Site structure

- `index.html` — homepage and service overview
- `about/`, `services/`, `work/`, `pricing/`, `contact/`, `resources/`, and `privacy/` — public site pages
- `assets/` — shared styles, logo, and favicon
- `functions/api/consultation.js` — Cloudflare Pages Function for consultation submissions
- `database/consultation_requests.sql` — D1 schema for consultation records
- `robots.txt` and `sitemap.xml` — search crawler discovery
- `.github/workflows/pages.yml` — repository integrity checks; this workflow does not deploy the production site

## Hosting and deployment

The site is structured for Cloudflare Pages, including the `functions/` directory. Production deployment, custom-domain routing, D1 bindings, and environment variables are managed in the Cloudflare dashboard or the configured Cloudflare deployment pipeline. GitHub repository commits alone do not verify a successful production deployment.

The consultation Function requires a D1 binding named `DB` and these environment variables: `CLOUDFLARE_EMAIL_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NOTIFICATION_EMAIL`, `EMAIL_FROM`, and `TURNSTILE_SECRET_KEY`. Configure them in Cloudflare Pages for both the intended production/preview environments. Never commit secret values.

## Consultation form security

The endpoint requires a configured Turnstile secret and validates each token through Siteverify, including the expected action and hostname. It also enforces same-origin POSTs, a honeypot, field validation, request-size limits, and a D1-backed limit of five submissions per IP digest per 15-minute window. The contact page still requires the real public Turnstile site key to replace `REPLACE_WITH_TURNSTILE_SITE_KEY`; set `TURNSTILE_SECRET_KEY` as a Cloudflare Pages secret. Add a Cloudflare edge rate-limiting rule for `/api/consultation` as a second layer.

## Operational checks

After deployment, verify the public pages, the consultation submission path, D1 record creation, and notification delivery using an approved test inquiry. Review Cloudflare logs and the Actions tab after changes.


## Automated release checks

GitHub Actions runs structural checks and the consultation Function syntax check on pushes and pull requests. A scheduled/manual production smoke check verifies the public site independently of a GitHub Pages build. The smoke check does not submit a real customer form, create database records, or send notification emails.

### Required Cloudflare Pages configuration

Set these values in the Cloudflare Pages project (production and preview as appropriate):

- D1 database binding: `DB` (bound to the production consultation database)
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_EMAIL_API_TOKEN` (secret with the required Email Sending permission)
- `NOTIFICATION_EMAIL`
- `EMAIL_FROM` (a verified sender for Cloudflare Email Sending)
- `TURNSTILE_SECRET_KEY` (secret)
- `TURNSTILE_SITE_KEY` (public site key used by the contact page)

Replace the contact page's public Turnstile placeholder only with the real site key configured for `traveonstudio.com`. Never commit the secret key or API token. The production smoke check intentionally reports a configuration warning when the public site key is still a placeholder; it does not pretend the form is ready.

After configuration, submit one approved test inquiry and confirm all three outcomes: a success response in the browser, a new D1 record, and a notification email received at the configured inbox. A green static or smoke workflow alone does not prove real delivery.

### Workbook checkout

The workbook page is informational only until a payment provider and fulfillment process are configured. Do not present a purchase button or collect payment until the real checkout URL, price, delivery file, tax/refund terms, and support process have been confirmed.
