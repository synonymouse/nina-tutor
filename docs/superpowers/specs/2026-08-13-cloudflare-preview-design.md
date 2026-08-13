# Cloudflare Pages Preview: Design Specification

## Goal

Publish the current Nina Dyachenko landing page at a temporary public Cloudflare Pages URL so the client can review the design before the production Timeweb infrastructure and final domain are ready.

Target project name and URL:

- Project: `nina-dyachenko`
- URL: `https://nina-dyachenko.pages.dev`

## Scope

The preview must reproduce the current production-facing page without visual demo labels or changes to the contact form.

The following remain functional:

- All landing sections, navigation, FAQ, responsive behavior, and contact dialog.
- Telegram, WhatsApp, and email links.
- Legal pages and static assets.

The following are intentionally unavailable:

- `POST /api/contact` and server-side form processing.
- SQLite lead storage.
- SMTP notifications and retry jobs.
- Yandex Metrica.

The contact form remains visible and unchanged. Submitting it on the preview returns the existing client-side error state because `/api/contact` is not deployed. Entered data is not transmitted to the production lead service.

## Build Approach

Keep the existing Astro Node production build unchanged.

The preview command will:

1. Run the existing build with `SITE_URL=https://nina-dyachenko.pages.dev` and no Metrica ID.
2. Copy only `dist/client` to a separate `dist-preview` directory.
3. Add Cloudflare Pages headers that set `X-Robots-Tag: noindex, nofollow` for every route.
4. Replace preview `robots.txt` with `User-agent: *` and `Disallow: /`.
5. Upload only `dist-preview`; `dist/server`, API code, databases, SMTP credentials, and runtime secrets are never uploaded.

The normal `npm run build`, Docker image, Compose deployment, and Timeweb documentation remain production-oriented and unchanged.

## Deployment

Use Wrangler Direct Upload:

1. Authenticate through the browser with `npx wrangler login`.
2. Create the Direct Upload Pages project `nina-dyachenko` with production branch `master`.
3. Deploy `dist-preview` with Wrangler.
4. Return the generated `pages.dev` URL.

No custom domain, Cloudflare Worker, Pages Function, database, or paid Cloudflare service is required.

## Verification

Before sharing the URL:

- The home page, legal pages, CSS, fonts, and responsive image assets return successfully.
- The page has no console errors on initial load.
- Telegram, WhatsApp, and email links retain their production destinations.
- No Yandex Metrica request is made.
- Response headers include `X-Robots-Tag: noindex, nofollow`.
- `robots.txt` disallows crawling.
- Form submission displays an error and does not create a network request to any external form backend.
- The production build configuration and Timeweb deployment files remain unchanged.

## Updating The Preview

Future client-review updates rebuild `dist-preview` and redeploy it to the same Cloudflare Pages project. The public URL remains stable.
