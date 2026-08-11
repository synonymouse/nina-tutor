# Nina Tutor Landing: Design Specification

## Summary

Build a single-page, mobile-first marketing site for Nina Dyachenko, an educational mentor for children and teenagers aged 7-16. The site is aimed primarily at warm Russian-speaking parents arriving from Instagram, Telegram, and other social channels.

The first release is a focused landing page rather than a marketing multipage site. It preserves the useful content from `docs/site_structure.md`, removes repetition, and leads the visitor through one conversion path: recognition, understanding, trust, offer selection, and free introductory contact.

The visual direction is warm editorial: cream backgrounds, deep green typography, berry accents, restrained supporting colors, oversized editorial headings, and a limited number of playful graphic devices inspired by `docs/example.jpg`.

The application uses Astro with the Node adapter. Marketing and legal pages are prerendered. A single same-origin API route processes contact forms on a Russian Timeweb host. No CMS, SPA framework, foreign form backend, or client-side UI library is used.

## Decisions

- Product format: one marketing landing page plus separate legal pages.
- Primary traffic: warm visitors from social networks.
- Primary conversion: a free 20-30 minute introductory conversation.
- Contact choices: Telegram, WhatsApp, or a three-field site form.
- Public prices: included.
- Testimonials and cases: omitted until real materials exist.
- Editing: source-controlled content; no CMS.
- Analytics: Yandex Metrica after explicit analytics consent because the stated audience includes Russian-speaking families worldwide.
- Hosting: Russian Timeweb infrastructure with Node.js support.
- Form processing: same Astro/Node application, same domain, primary storage in Russia.
- Testing process: no TDD; automated build checks and end-to-end acceptance verification are still required.

## Goals

- Convert warm mobile traffic into qualified introductory conversations.
- Explain educational mentoring without framing the child as lazy, broken, or a project to optimize.
- Establish trust without fabricated social proof.
- Make Nina's approach, qualifications, process, formats, and prices understandable in one visit.
- Keep the experience fast on mobile networks and resilient when optional JavaScript or analytics fail.
- Meet current accessibility expectations and include the necessary privacy and consent surfaces for launch.
- Preserve an easy path to add service or SEO pages later without rebuilding the project.

## Non-Goals

- A blog or editorial publishing system.
- Search-first content marketing in the first release.
- A client account, payment flow, booking calendar, or CRM.
- Online lessons or course delivery.
- An administrative content editor.
- Invented reviews, outcome claims, guarantees, or medical language.
- Collection of a child's name, diagnosis, documents, or other sensitive data in the inquiry form.

## Audience And Positioning

The purchasing audience is parents of children and teenagers aged 7-16. The child may influence the decision, but the page speaks to the parent who currently carries too much responsibility for schoolwork.

The main emotional movement is from tension and self-blame to clarity and a safe first step. The site must feel human, intelligent, and optimistic without looking childish, clinical, or like a generic tutoring marketplace.

The core promise remains:

> Ребенок может учиться самостоятельно. Я помогу ему этому научиться.

The offer is not better grades at any cost. It is a gradual transfer of planning, decision-making, emotional regulation, and responsibility to the child.

## Conversion Model

All primary CTA buttons use a consistent label such as `Обсудить ситуацию бесплатно`. With JavaScript available, the CTA opens an accessible contact sheet. Without JavaScript, it links to the final contact section.

The contact sheet offers three equal choices:

- Telegram: `https://t.me/ninixer`.
- WhatsApp: `https://wa.me/79777498243` with a short prefilled introductory message.
- Site form: closes the contact sheet, scrolls to the always-present form, and moves focus to its heading.

The provided email `dyachenko.nina139@gmail.com` is available as a direct `mailto:` fallback in the footer and error state. It is not the primary automated form notification destination unless cross-border processing has been separately reviewed.

## Information Architecture

### Header

A compact header contains the Nina Dyachenko wordmark, anchors to `Подход`, `Обо мне`, `Форматы`, and a contact CTA. Desktop navigation is visible. Mobile navigation uses a simple disclosure panel with native semantics and no menu library.

### 1. Hero

Use the current core headline, a shortened explanatory paragraph, the trust line `8 лет в образовании · онлайн · дети и подростки 7-16 лет`, and one primary CTA.

The supplied photo is the human focal point. It is shown once with art-directed desktop and mobile crops. The image is not duplicated in the About section.

### 2. Recognition

Present four concise parent quotes based on the current `Узнаете себя?` content:

- The child starts only after repeated reminders.
- The child seems capable but has lost interest.
- Mistakes or grades cause disproportionate distress.
- The parent no longer knows how to help without increasing dependence.

Close with the statement that the issue may not be laziness. Keep the tone observational rather than diagnostic.

### 3. Approach

Merge the current `Моя задача`, `Почему это работает`, and the overlapping parts of `Кому я помогаю`.

Lead with `Не заставить ребенка учиться. А научить его управлять собственной учебой.` Explain that Nina first identifies why independent work is difficult. Show six possible dimensions: motivation, self-organization, confidence, learning skills, emotional state, and the sense of future direction.

End with the key differentiator: the aim is to reduce dependency on the mentor over time.

### 4. Outcomes

Use two visually distinct columns.

The child outcomes are greater initiative, usable learning strategies, self-understanding, a calmer response to difficulty, and confidence in influencing results.

The parent outcomes are fewer reminders, less monitoring, fewer conflicts, and more space for a normal parent-child relationship.

No outcome is phrased as a guarantee or a fixed-duration promise.

### 5. About Nina

Introduce Nina Dyachenko and foreground eight years in education, educational mentoring, work with ages 7-16, career guidance for grades 8-11, current child psychology education at Psychodemia, and the bachelor's degree in art pedagogy.

Condense secondary portfolio items into a short supporting line rather than a long resume. Emphasize the boutique format and limited number of families.

Trust comes from specificity, transparent scope, qualifications, the personal photo, and a clear process. No placeholder testimonial component is rendered.

### 6. Process

Present the current five steps as a readable timeline:

- 01. Free 20-30 minute introduction.
- 02. Deeper diagnostic route when needed.
- 03. A concrete proposed route.
- 04. Work with the child and gradual transfer of responsibility.
- 05. Reduction of support as independence increases.

The last step is visually emphasized because it differentiates the service from indefinite tutoring.

### 7. Formats And Prices

Keep all five approved formats and current public prices:

- Diagnostic route: 15,000 RUB once.
- Strategic session: 9,000 RUB once.
- `Учись учиться`: 40,000 RUB per month.
- Coaching route: 20,000 RUB per month.
- Comprehensive route: 40,000 RUB per month.

Group the first two as ways to start and the remaining three as ongoing support. Each card includes audience fit, concrete contents, price, and a CTA. Cards must remain comparable without forcing equal text height on narrow screens.

### 8. Principle And FAQ

Use `Я не обещаю исправить ребенка` as a high-contrast ethical statement. Retain the message that the child is not a project to optimize.

Follow with six accessible FAQ disclosures covering age, subject tutoring, lack of initial motivation, parent participation, starting without a long program, and reducing support.

### 9. Final Contact

Retain the current final idea about learning to function without constant control. Repeat the free introductory offer and the international online format.

Show Telegram, WhatsApp, the site form, and direct email. The form remains visible in the page even if the contact sheet enhancement is unavailable.

## Visual System

### Direction

Use the approved warm editorial direction. Borrow the confidence, large typography, colored bands, stamps, and graphic rhythm from `docs/example.jpg`, but not its finance-specific black-heavy palette or exact composition.

The visual result should be distinctive and personal, not a generic pastel coaching template.

### Palette

- Ink: deep green around `#20382F` for primary text and dark sections.
- Cream: warm neutral around `#F5EFE5` for the main surface.
- Berry: raspberry around `#B93460` for selective emphasis and active states.
- Rose: muted pink around `#D99AAD` for large supporting fields.
- Butter: warm yellow around `#EFD36F` for trust notes and process accents.
- Mist: pale blue-green around `#C9E5E3` for outcome and offer surfaces.

Final token values may be adjusted during implementation to meet WCAG AA contrast. Body text never relies on berry, rose, or yellow alone when contrast is insufficient.

### Typography

Use self-hosted Cyrillic subsets of Literata for editorial display headings and Onest for body text and UI. Only required weights and styles are shipped.

Headings use tight but readable line height and responsive `clamp()` sizing. Body copy stays at least 16 CSS pixels on mobile with a comfortable line length. Uppercase display text is reserved for short labels.

### Layout Language

- Alternate full-width color bands with structured cream sections.
- Use oversized section numbers and occasional circular notes as navigation cues.
- Keep corners varied but systematic rather than making every element a rounded card.
- Use asymmetry on desktop and a disciplined single-column rhythm on mobile.
- Avoid gradients, glassmorphism, generic icon grids, stock illustrations, and decorative dashboard-like UI.

### Photography

Convert `docs/nina_photo.HEIC` during the build workflow to correctly oriented source assets. Produce AVIF and WebP variants with JPEG fallback and explicit dimensions.

Use separate crops for desktop and mobile through Astro's image pipeline and responsive picture output. Preserve Nina and the child as the focal point. Do not apply aggressive background removal or AI reconstruction.

Publication assumes the client has permission to use the child's image. This permission is a launch responsibility, not inferred by the application.

### Motion

Use only small CSS-driven entrance and hover transitions. No animation library, parallax, scroll-jacking, or continuous decorative motion.

All nonessential motion is disabled under `prefers-reduced-motion: reduce`. Content and controls are never hidden when animation JavaScript fails.

## Interaction Design

### Navigation

Anchor navigation uses native links and accounts for the sticky header with `scroll-margin`. The first release does not add scrollspy or an active-section script.

### Contact Sheet

Use a native `<dialog>` progressively enhanced as a bottom sheet on small screens and centered panel on desktop. Focus moves into the dialog, is trapped by native dialog behavior, returns to the triggering CTA, and closes with Escape.

The dialog contains direct Telegram and WhatsApp links plus an action that moves to the form. A non-dialog contact block remains present in the page.

### Mobile CTA

After the hero leaves the viewport, a compact fixed CTA appears at the bottom of small screens. It must not cover focused inputs, the cookie consent panel, or the final contact section. It hides while the contact dialog is open.

### FAQ

Use `<details>` and `<summary>`. The page works with all items collapsed by default and remains fully usable without JavaScript.

## Form Design

### Fields

- Parent name, required, 2-80 characters.
- Preferred contact, required, 3-120 characters. The label explicitly accepts phone, messenger handle, or email.
- Brief situation, required, 10-1,000 characters.
- Personal-data consent checkbox, required and unchecked by default.
- Invisible honeypot field, which legitimate users leave empty.

The form states: `Не указывайте фамилию ребенка, диагнозы, документы и другие чувствительные сведения.`

The markup uses a normal same-origin HTML `POST` action. JavaScript enhances it with inline status updates but is not required to deliver the request.

### Separate Consent

The checkbox label links to a standalone consent document. The privacy policy is a separate link. Analytics consent is not bundled with form consent.

The consent document is versioned. Each accepted submission records the consent version and acceptance timestamp. The initial implementation uses version `1.0` and a 12-month inquiry retention period. The client must have the legal wording reviewed before publication.

### Submission States

- Idle: fields and consent are editable.
- Invalid: a summary and field-level messages appear without deleting entered values.
- Submitting: the submit button is disabled and exposes an accessible busy state.
- Success: enhanced submissions show a generated request reference; the native thank-you page confirms that the inquiry was saved without exposing form data in the URL.
- Server error: retain data, explain that the request was not confirmed, allow retry, and show Telegram, WhatsApp, and direct email fallbacks.
- Notification error after storage: return success because the canonical lead is saved; log and alert the delivery failure server-side.

## Privacy And Data Handling

### Legal Surfaces

Provide prerendered routes for:

- `/privacy/`: privacy and personal-data processing policy.
- `/consent/`: separate consent text for the inquiry form.

Footer links expose both documents and analytics preferences. Legal text is a clearly marked draft for review before launch; the code does not claim that technical implementation alone guarantees legal compliance.

### Russian Data Localization

The form must not submit to FormSubmit, Formspree, Google Forms, or another unverified foreign form backend.

`POST /api/contact` first writes the canonical lead and consent record to storage on Timeweb infrastructure in Russia. The application uses a persistent SQLite database on the Timeweb volume because expected traffic and write concurrency are low.

The record contains:

- Generated request ID.
- Creation timestamp.
- Parent name.
- Preferred contact.
- Situation text.
- Consent version and timestamp.
- Relevant UTM values.
- Notification delivery state.

The application does not retain the full IP address or user-agent string. Rate limiting uses a short-lived keyed hash of the IP address and automatically expires it.

Automated form notifications must go to a mailbox hosted in Russia. The provided Gmail address remains a direct visitor-controlled contact fallback. Sending form contents to Gmail is excluded from the default implementation.

### Analytics Consent

Because the audience is described as Russian-speaking families worldwide, Yandex Metrica loads only after explicit analytics opt-in.

The consent panel offers equally understandable accept and decline actions. A footer control allows the visitor to reopen preferences. Refusal does not affect reading, contact links, or form submission.

The site does not enable Webvisor, advanced matching, CRM imports, or ecommerce features. Form fields are excluded from any session recording capability even if settings change later.

## Technical Architecture

### Runtime

Use current Astro with `@astrojs/node` in standalone mode:

```js
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' })
});
```

The landing page and legal pages export `prerender = true`. The contact API route remains on-demand. This follows Astro's current server output model while keeping all public content statically generated.

### Boundaries

- `src/pages/index.astro`: assembles the marketing page and declares prerendering.
- `src/pages/privacy.astro`: prerendered privacy policy.
- `src/pages/consent.astro`: prerendered standalone form consent.
- `src/pages/thanks.astro`: prerendered no-JavaScript submission confirmation.
- `src/pages/api/contact.ts`: same-origin POST endpoint.
- `src/layouts/BaseLayout.astro`: metadata, fonts, global shell, and consent bootstrap.
- `src/components/`: focused page sections and reusable interaction components.
- `src/content/site.ts`: approved text, offers, prices, contacts, and FAQ data.
- `src/styles/`: tokens, base rules, layout, and component styles without a utility framework.
- `src/server/`: validation, rate limiting, SQLite persistence, and notification modules.
- `src/scripts/`: small progressive scripts for dialog, form enhancement, analytics consent, and goals.

Components receive typed content and do not query storage or environment variables directly. Server modules are not imported into prerendered UI code.

### Data Flow

1. A visitor arrives with optional UTM parameters.
2. The static page renders immediately without analytics.
3. Analytics loads only after explicit consent and reads allowed attribution values.
4. A CTA opens the contact sheet or moves to the fallback contact section.
5. Messenger choices navigate directly and emit a Metrica goal only when analytics is active.
6. The form POSTs to `/api/contact` as JSON when enhanced or as standard form data without JavaScript.
7. The server checks origin, supported content type, lengths, consent, honeypot, and rate limit.
8. The server writes the canonical request and consent record to SQLite on Russian storage.
9. The server attempts a notification through a Russian-hosted SMTP mailbox.
10. Enhanced requests receive JSON with a request ID; native HTML submissions receive a `303` redirect to `/thanks/`.
11. A `form_success` goal is emitted only after a successful enhanced API response and only when analytics is active.

### Error Handling

- Reject unsupported methods with `405` and an `Allow` header.
- Reject wrong-origin state-changing requests with `403`.
- Return structured field errors with `400` for enhanced requests and a small accessible HTML error response for native submissions.
- Return `429` with a calm retry message when the short rate limit is exceeded.
- Return `503` if canonical storage is unavailable; never claim a request was accepted before persistence succeeds.
- Treat notification failure as a saved lead with a pending notification status, not as lost data.
- Log technical errors without form text, contact data, or raw IP addresses.

### Spam And Abuse Controls

Use same-origin checks, the honeypot, strict length limits, and a conservative per-IP-hash rate limit. Enhanced submissions also carry a start timestamp for a minimum-completion-time check; native submissions remain valid without it. Do not introduce a CAPTCHA in the first release. Add one only if observed abuse justifies its accessibility, privacy, and performance cost.

## SEO And Sharing

The page includes a unique Russian title and description, canonical URL, Open Graph metadata, Telegram-friendly preview image, semantic headings, descriptive image alt text, and structured data appropriate to a person/professional service without invented ratings.

Generate `robots.txt` and `sitemap.xml`. Legal and submission-confirmation pages use `noindex,follow` and are excluded from the sitemap.

The first release targets brand and service relevance, not broad organic acquisition. Later service pages may be added under stable routes without changing the landing page structure.

## Analytics

Yandex Metrica is configured by `PUBLIC_YANDEX_METRICA_ID`. If the variable is absent or invalid, the loader remains disabled without console errors.

Track only these named goals:

- `contact_open`.
- `telegram_click`.
- `whatsapp_click`.
- `form_success`.

Preserve standard UTM parameters for attribution. Do not send form contents, names, contact values, free text, or request IDs to Metrica.

## Accessibility

- Target WCAG 2.2 AA for color contrast, focus, semantics, keyboard operation, and reduced motion.
- Keep body text at least 16 CSS pixels on mobile.
- Provide a skip link and logical heading hierarchy.
- Maintain visible focus states that fit the visual language.
- Keep touch targets at least 44 by 44 CSS pixels where practical.
- Use live regions for form status without moving focus unexpectedly.
- Ensure all functionality works at 200% browser zoom and at a 320 CSS pixel viewport.
- Do not encode meaning through color alone.

## Performance

- Ship no hydrated UI framework.
- Keep first-party client JavaScript small and split by purpose.
- Self-host only required font subsets and weights.
- Preload only the critical font and hero image resources justified by measured LCP.
- Set image dimensions and responsive sources to prevent layout shift.
- Defer analytics until consent and browser idle time.
- Avoid third-party widgets, icon fonts, video, carousels, and animation libraries.

Targets on the production-like mobile profile:

- Lighthouse Performance, Accessibility, Best Practices, and SEO at least 95.
- LCP below 2.5 seconds.
- INP below 200 milliseconds.
- CLS below 0.1.

## Configuration And Deployment

The Node standalone build is deployed to Timeweb in Russia. Public pages are prerendered during CI/build and served by the Astro Node process. Persistent storage for SQLite must survive application restarts and deployments.

Required launch configuration:

- `SITE_URL`: final canonical HTTPS origin.
- `PUBLIC_YANDEX_METRICA_ID`: approved counter ID.
- `LEADS_DB_PATH`: persistent Timeweb path outside the public directory.
- `LEAD_NOTIFICATION_EMAIL`: Russian-hosted recipient mailbox.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: Russian-hosted SMTP credentials.
- `RATE_LIMIT_SECRET`: random secret used for short-lived IP hashing.

The application must refuse to start in production if database or rate-limit configuration is missing. Missing analytics configuration does not block startup. Notification configuration may start in disabled development mode but is mandatory for production acceptance.

## Verification

TDD is explicitly not required. Verification still includes:

- Astro type and content checks.
- Production build and standalone server startup.
- Desktop and mobile browser smoke tests.
- Navigation anchors, mobile menu, dialog focus, Escape, and focus return.
- Telegram, WhatsApp, and email destinations.
- Form validation, consent, success, storage failure, notification failure, and rate-limit states.
- Analytics accept, decline, reopen preferences, and goal suppression before consent.
- Keyboard-only and reduced-motion checks.
- Responsive checks at 320, 375, 768, 1024, and wide desktop widths.
- Lighthouse runs against the production build.
- A real pre-launch form submission that confirms SQLite persistence and notification delivery.

## Acceptance Criteria

- A parent can understand Nina's offer, audience, method, and starting options without opening another page.
- The landing page follows the approved nine-section sequence and warm editorial direction.
- All approved prices and contact details are present and correct.
- No invented review, result, credential, or guarantee appears.
- Direct contact remains possible if JavaScript, analytics, or the form endpoint fails.
- The form cannot submit without separate personal-data consent.
- Canonical form data is first stored on Russian Timeweb infrastructure.
- Yandex Metrica does not load before analytics opt-in.
- The page meets the stated accessibility and performance targets in a production-like environment.
- Legal text, child-photo permission, final domain, Metrica ID, Russian mailbox, and SMTP credentials are confirmed before public launch.

## Risks And Launch Responsibilities

- The privacy policy and consent text require client-specific legal review.
- Nina or the site operator may need to complete applicable personal-data operator notifications and internal procedures; this is outside the codebase.
- Publication requires confirmed permission to use the child's image.
- SQLite requires a persistent Timeweb volume and a backup procedure.
- The provided Gmail address is not used as the automated form destination by default because the chosen architecture prioritizes Russian primary storage and avoids unreviewed cross-border form delivery.
