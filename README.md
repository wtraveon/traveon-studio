# Traveon Studio Website

Static website files for [traveonstudio.com](https://traveonstudio.com/).

## Repository

- `index.html` — responsive homepage and service overview
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
- `robots.txt` and `sitemap.xml` — crawler discovery files

## Migration status and limitations

The original source repository or downloadable source archive was not available. The homepage has been rebuilt from publicly visible website content and is a migration baseline, not a byte-for-byte copy of the prior production site. The current source's original images, all individual page templates, form processing, analytics, and third-party integrations have not been migrated or validated. Review copy, pricing, links, forms, and integrations before switching production hosting.

## Deploy

In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source. Check the Actions tab for the deployment result.

Custom-domain DNS and HTTPS must be verified before routing `traveonstudio.com` to GitHub Pages. This repository change does not alter DNS or the current live host.
