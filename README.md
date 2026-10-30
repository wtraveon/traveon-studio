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

The consultation Function requires a D1 binding named `DB` and these environment variables: `CLOUDFLARE_EMAIL_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NOTIFICATION_EMAIL`, and `EMAIL_FROM`. Configure them in Cloudflare Pages for both the intended production/preview environments. Never commit secret values.

## Consultation form security

The endpoint currently applies same-origin checks, a honeypot, field validation, and length limits. Server-side Turnstile verification and edge rate limiting are not yet configured. Do not describe the form as bot-proof until a Turnstile widget and Siteverify validation are configured and tested, with a Cloudflare rate-limiting rule protecting `/api/consultation`.

## Operational checks

After deployment, verify the public pages, the consultation submission path, D1 record creation, and notification delivery using an approved test inquiry. Review Cloudflare logs and the Actions tab after changes.
