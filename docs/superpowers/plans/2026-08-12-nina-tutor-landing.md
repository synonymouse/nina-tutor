# Nina Tutor Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a fast, accessible Astro landing page for Nina Dyachenko with social-first conversion, consent-gated Yandex Metrica, and a same-origin contact form stored on Russian Timeweb infrastructure.

**Architecture:** Astro 7 runs with the Node standalone adapter. The landing, legal, and confirmation pages are prerendered; only `/api/contact` and `/api/health` execute on demand. The browser progressively enhances native HTML, while the server validates, rate-limits, stores leads in SQLite on a persistent Russian volume, and sends notifications through Russian-hosted SMTP.

**Tech Stack:** Node.js 22.12+, npm, Astro 7, TypeScript 6, `@astrojs/node`, `@astrojs/sitemap`, Zod 4, `better-sqlite3`, Nodemailer, Fontsource variable fonts, Vitest, Playwright, CSS, Docker/Timeweb.

**Process Constraint:** The user explicitly opted out of TDD. Implement each unit first, then add focused verification and tests before completion. Do not introduce a CMS, Tailwind, React, a foreign form backend, CAPTCHA, or an animation library.

---

## File Map

### Project And Configuration

- `package.json`: scripts, runtime dependencies, and Node engine.
- `package-lock.json`: reproducible dependency graph.
- `astro.config.mjs`: Node standalone output, canonical origin, sitemap filtering.
- `tsconfig.json`: strict Astro TypeScript settings and aliases.
- `.env.example`: documented non-secret runtime variables.
- `.gitignore`: generated files, secrets, databases, reports, and visual-companion files.
- `scripts/validate-env.mjs`: fail-fast production environment validation.
- `Dockerfile`: Timeweb-compatible Node image.

### Content And Assets

- `src/assets/nina-hero.jpg`: correctly oriented source photo for Astro processing.
- `public/og-cover.jpg`: 1200 by 630 social preview.
- `public/favicon.svg`: compact ND wordmark.
- `src/content/site.ts`: typed copy, prices, contacts, qualifications, and FAQ.

### Pages And Layout

- `src/layouts/BaseLayout.astro`: metadata, fonts, global shell, structured data, analytics consent.
- `src/pages/index.astro`: prerendered landing composition.
- `src/pages/privacy.astro`: prerendered draft privacy policy.
- `src/pages/consent.astro`: prerendered separate form consent.
- `src/pages/thanks.astro`: prerendered native-form confirmation.
- `src/pages/robots.txt.ts`: environment-aware robots file.
- `src/pages/api/contact.ts`: on-demand form endpoint.
- `src/pages/api/health.ts`: deployment health check.

### UI Components

- `src/components/SiteHeader.astro`: desktop anchors and native mobile disclosure.
- `src/components/Hero.astro`: primary promise, trust line, CTA, responsive photo.
- `src/components/Recognition.astro`: four parent situations.
- `src/components/Approach.astro`: systemic method and six dimensions.
- `src/components/Outcomes.astro`: child and parent changes.
- `src/components/About.astro`: experience, qualifications, and boutique format.
- `src/components/Process.astro`: five-step route.
- `src/components/Offers.astro`: five public-price cards grouped by intent.
- `src/components/PrincipleFaq.astro`: ethical statement and native FAQ.
- `src/components/Contact.astro`: messenger links, native form, status region, footer.
- `src/components/ContactDialog.astro`: progressively enhanced contact selector.
- `src/components/MobileCta.astro`: mobile fixed CTA after the hero.
- `src/components/CookieConsent.astro`: explicit analytics preference controls.

### Styling And Client Scripts

- `src/styles/tokens.css`: palette, typography, spacing, radii, shadows, breakpoints.
- `src/styles/global.css`: reset, typography, layout primitives, focus, reduced motion.
- `src/styles/sections.css`: approved editorial page composition and responsive section styles.
- `src/scripts/contact-dialog.ts`: dialog and focus behavior.
- `src/scripts/mobile-cta.ts`: hero intersection and collision-safe mobile CTA.
- `src/scripts/contact-form.ts`: progressive AJAX submission and inline errors.
- `src/scripts/analytics.ts`: consent-gated Metrica loader and typed goal bridge.

### Server Modules

- `src/server/config.ts`: parsed environment configuration.
- `src/server/lead-schema.ts`: shared request normalization and validation.
- `src/server/database.ts`: SQLite initialization and lifecycle.
- `src/server/leads.ts`: lead persistence and notification status.
- `src/server/rate-limit.ts`: keyed, expiring IP hash and request limits.
- `src/server/notify.ts`: Russian SMTP transport and message delivery.
- `src/server/http.ts`: JSON/native response helpers and client IP extraction.

### Verification

- `vitest.config.ts`: server-test configuration.
- `playwright.config.ts`: production-build browser tests.
- `tests/server/lead-schema.test.ts`: request validation.
- `tests/server/leads.test.ts`: SQLite persistence and retention.
- `tests/server/rate-limit.test.ts`: request throttling and hash expiry.
- `tests/e2e/landing.spec.ts`: navigation, content, dialog, FAQ, links.
- `tests/e2e/form.spec.ts`: form validation and progressive success/error UX.
- `tests/e2e/analytics.spec.ts`: no Metrica before opt-in.
- `docs/deployment.md`: Timeweb volume, environment, SMTP, backup, and launch checklist.

---

### Task 1: Scaffold The Astro Node Project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/env.d.ts`
- Create: `scripts/validate-env.mjs`

- [ ] **Step 1: Create the package manifest with pinned major versions and operational scripts**

```json
{
  "name": "nina-tutor",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "npm run check && astro build",
    "start": "node scripts/validate-env.mjs && node dist/server/entry.mjs",
    "preview": "node dist/server/entry.mjs",
    "test": "vitest run",
    "test:e2e": "PUBLIC_YANDEX_METRICA_ID=123456 npm run build && playwright test"
  },
  "dependencies": {
    "@astrojs/node": "^11.1.1",
    "@astrojs/sitemap": "^3.7.3",
    "@fontsource-variable/literata": "^5.3.0",
    "@fontsource-variable/onest": "^5.3.0",
    "astro": "^7.2.1",
    "better-sqlite3": "^13.0.3",
    "nodemailer": "^9.0.5",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@playwright/test": "^1.62.1",
    "@types/better-sqlite3": "^9.6.0",
    "@types/nodemailer": "^8.0.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Install dependencies and browser binaries**

Run:

```bash
npm install
npx playwright install chromium
```

Expected: `package-lock.json` is created, installation exits 0, and Chromium installation completes without an unsupported-Node warning.

- [ ] **Step 3: Configure Astro for prerendered pages plus Node API routes**

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'http://localhost:4321';
const excludedRoutes = ['/privacy/', '/consent/', '/thanks/'];

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      filter: (page) => !excludedRoutes.some((route) => page.endsWith(route))
    })
  ],
  server: { host: true }
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["node"]
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Create `src/env.d.ts`:

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_YANDEX_METRICA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Add repository hygiene and environment documentation**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
*.db
*.db-shm
*.db-wal
.DS_Store
.superpowers/
playwright-report/
test-results/
coverage/
```

Create `.env.example`:

```dotenv
SITE_URL=http://localhost:4321
PUBLIC_YANDEX_METRICA_ID=
LEADS_DB_PATH=./var/leads.db
LEADS_BACKUP_DIR=./var/backups
LEAD_NOTIFICATION_EMAIL=hello@example.ru
SMTP_HOST=smtp.example.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello@example.ru
SMTP_PASSWORD=replace-with-runtime-secret
SMTP_FROM=hello@example.ru
RATE_LIMIT_SECRET=replace-with-at-least-32-random-characters
```

- [ ] **Step 5: Add fail-fast production environment validation**

Create `scripts/validate-env.mjs`:

```js
const required = [
  'SITE_URL',
  'LEADS_DB_PATH',
  'LEAD_NOTIFICATION_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'RATE_LIMIT_SECRET'
];

if (process.env.NODE_ENV === 'production') {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.error(`Missing production environment: ${missing.join(', ')}`);
    process.exit(1);
  }

  if ((process.env.RATE_LIMIT_SECRET?.length ?? 0) < 32) {
    console.error('RATE_LIMIT_SECRET must contain at least 32 characters');
    process.exit(1);
  }
}
```

- [ ] **Step 6: Add a minimal page only long enough to verify the scaffold**

Create `src/pages/index.astro`:

```astro
---
export const prerender = true;
---

<!doctype html>
<html lang="ru">
  <head><meta charset="utf-8" /><title>Нина Дьяченко</title></head>
  <body><main><h1>Нина Дьяченко</h1></main></body>
</html>
```

- [ ] **Step 7: Verify the scaffold**

Run:

```bash
npm run check
npm run build
```

Expected: Astro reports zero errors and creates `dist/client/index.html` plus `dist/server/entry.mjs`.

- [ ] **Step 8: Commit the scaffold**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore .env.example src/env.d.ts scripts/validate-env.mjs src/pages/index.astro
git commit -m "chore: scaffold Astro landing"
```

---

### Task 2: Prepare Photography, Brand Assets, And Typed Content

**Files:**
- Create: `src/assets/nina-hero.jpg`
- Create: `public/og-cover.jpg`
- Create: `public/favicon.svg`
- Create: `src/content/site.ts`

- [ ] **Step 1: Convert and orient the supplied HEIC source**

Run from the repository root:

```bash
sips -r -90 -Z 1800 -s format jpeg -s formatOptions 88 "docs/nina_photo.HEIC" --out "/tmp/nina-sideways.jpg"
ffmpeg -y -i "/tmp/nina-sideways.jpg" -vf "transpose=clock,scale=-2:1800" -frames:v 1 -update 1 -q:v 3 "src/assets/nina-hero.jpg"
```

Expected: `src/assets/nina-hero.jpg` is portrait, Nina and the child are upright, and the long edge is 1800 pixels.

- [ ] **Step 2: Generate a Telegram/Open Graph crop without text baked into the image**

Run:

```bash
ffmpeg -y -i "src/assets/nina-hero.jpg" -vf "crop='min(iw,ih*1200/630)':'min(ih,iw*630/1200)':0:280,scale=1200:630" -frames:v 1 -update 1 -q:v 3 "public/og-cover.jpg"
```

Expected: `public/og-cover.jpg` is exactly 1200 by 630 pixels and includes both Nina and the child without rotating or stretching them. Adjust only the numeric crop Y offset if visual inspection clips a face.

- [ ] **Step 3: Add the lightweight favicon**

Create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#20382f"/>
  <path d="M17 45V19h7l16 17V19h7v26h-7L24 28v17z" fill="#f5efe5"/>
  <circle cx="49" cy="15" r="7" fill="#efd36f"/>
</svg>
```

- [ ] **Step 4: Create the typed content model and approved concise copy**

Create `src/content/site.ts`:

```ts
export const site = {
  name: 'Нина Дьяченко',
  role: 'образовательный наставник',
  title: 'Нина Дьяченко — образовательный наставник для детей 7–16 лет',
  description:
    'Помогаю детям и подросткам выстроить собственную систему учебы, развить самостоятельность и справляться без постоянного контроля.',
  hero: {
    eyebrow: 'Образовательное наставничество · онлайн',
    title: 'Ребенок может учиться самостоятельно. Я помогу ему этому научиться.',
    body:
      'Не делать уроки вместо него. Не контролировать каждый шаг. Не превращать учебу в ежедневную борьбу.',
    trust: '8 лет в образовании · дети и подростки 7–16 лет',
    cta: 'Обсудить ситуацию бесплатно',
    note: '20–30 минут знакомства без обязательств'
  },
  contacts: {
    telegram: 'https://t.me/ninixer',
    whatsapp:
      'https://wa.me/79777498243?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%2C%20%D0%9D%D0%B8%D0%BD%D0%B0!%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BE%D0%B1%D1%81%D1%83%D0%B4%D0%B8%D1%82%D1%8C%20%D1%81%D0%B8%D1%82%D1%83%D0%B0%D1%86%D0%B8%D1%8E%20%D0%B8%20%D0%B1%D0%B5%D1%81%D0%BF%D0%BB%D0%B0%D1%82%D0%BD%D0%BE%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%BA%D0%BE%D0%BC%D1%81%D1%82%D0%B2%D0%BE.',
    email: 'mailto:dyachenko.nina139@gmail.com'
  }
} as const;

export const problems = [
  {
    quote: '«Если я не напомню — он ничего не сделает»',
    text: 'Ребенок знает, что нужно делать, но откладывает. Постепенно вся ответственность за учебу оказывается на вас.'
  },
  {
    quote: '«Он способен на большее, но совершенно не хочет»',
    text: 'Оценки могут быть нормальными, но интереса нет: ребенок делает только необходимое и не понимает, зачем стараться.'
  },
  {
    quote: '«Любая ошибка превращается в катастрофу»',
    text: 'Плохая оценка пугает, сравнение с другими ранит, а сложная задача заставляет быстро сдаться.'
  },
  {
    quote: '«Я уже не понимаю, как ему помочь»',
    text: 'Чем больше вы уговариваете, объясняете и контролируете, тем привычнее ребенку рассчитывать на вас.'
  }
] as const;

export const dimensions = [
  ['Мотивация', '«Зачем мне это вообще нужно?»'],
  ['Самоорганизация', '«Я понимаю, что делать, но не могу начать»'],
  ['Уверенность', '«А вдруг у меня не получится?»'],
  ['Навыки обучения', '«Я не знаю, как организовать процесс»'],
  ['Эмоциональное состояние', '«Мне слишком тяжело, страшно или я устал»'],
  ['Будущее', '«Я не понимаю, чего хочу и куда двигаться»']
] as const;

export const childOutcomes = [
  ['Больше делает сам', 'Постепенно берет ответственность за учебу и решения.'],
  ['Понимает, как ему учиться', 'Находит способы планировать, начинать и завершать задачи.'],
  ['Лучше понимает себя', 'Видит сильные стороны, интересы и зоны роста.'],
  ['Спокойнее относится к трудностям', 'Анализирует ошибки и ищет решения вместо того, чтобы сразу сдаваться.'],
  ['Становится увереннее', 'Понимает, что может влиять на собственный результат.']
] as const;

export const parentOutcomes = [
  'Меньше напоминаний',
  'Меньше контроля',
  'Меньше конфликтов',
  'Больше пространства для нормальных отношений'
] as const;

export const qualifications = [
  ['Тьютор детей 7–16 лет', 'Индивидуальные программы, soft skills, учебная самостоятельность и адаптационные задачи.'],
  ['Профориентация 8–11 классов', 'Исследование интересов, сильных сторон и осознанный выбор образовательной траектории.'],
  ['Детская психология', 'Фундаментальное образование детского психолога в «Психодемии».'],
  ['Педагогика искусства', 'Степень бакалавра и постоянное развитие в проектировании образовательного опыта и арт-терапии.']
] as const;

export const process = [
  ['01', 'Знакомимся', 'Бесплатно обсуждаем ситуацию, запрос семьи и желаемые изменения.'],
  ['02', 'Разбираемся', 'При необходимости проводим диагностический маршрут и изучаем привычки, сильные стороны и трудности.'],
  ['03', 'Выбираем маршрут', 'Формулируем конкретные задачи и понятный формат дальнейшей работы.'],
  ['04', 'Работаем', 'Пробуем новые стратегии и постепенно передаем ребенку ответственность.'],
  ['05', 'Снижаем поддержку', 'Когда самостоятельности становится больше, объем сопровождения уменьшается.']
] as const;

export type Offer = {
  group: 'start' | 'support';
  title: string;
  price: string;
  audience: string;
  details: string;
  cta: string;
  featured?: boolean;
};

export const offers: Offer[] = [
  {
    group: 'start',
    title: 'Диагностический маршрут',
    price: '15 000 ₽ · единоразово',
    audience: 'Если сначала важно разобраться в ситуации.',
    details: '3 встречи с ребенком + встреча с родителями + письменный отчет.',
    cta: 'Узнать о диагностике',
    featured: true
  },
  {
    group: 'start',
    title: 'Стратегическая встреча',
    price: '9 000 ₽ · разово',
    audience: 'Если проблема понятна и нужен независимый взгляд и конкретный план.',
    details: 'Одна сфокусированная встреча с ребенком по актуальному запросу.',
    cta: 'Записаться на встречу'
  },
  {
    group: 'support',
    title: '«Учись учиться»',
    price: '40 000 ₽ / месяц',
    audience: 'Для школьников, которым нужна регулярная помощь с самоорганизацией и учебой.',
    details: 'До 12 часов онлайн-встреч в месяц, поддержка между встречами и обратная связь родителям.',
    cta: 'Обсудить формат',
    featured: true
  },
  {
    group: 'support',
    title: 'Коучинговый маршрут',
    price: '20 000 ₽ / месяц',
    audience: 'Для подростков, которые разбираются с мотивацией, целями, уверенностью и будущим.',
    details: '4 индивидуальные сессии в месяц.',
    cta: 'Обсудить формат'
  },
  {
    group: 'support',
    title: 'Комплексный маршрут',
    price: '40 000 ₽ / месяц',
    audience: 'Когда нужно одновременно перестроить учебный процесс и поработать с мотивацией.',
    details: 'Учебные стратегии и коучинговое сопровождение в одном маршруте.',
    cta: 'Обсудить формат'
  }
];

export const faq = [
  ['В каком возрасте вы работаете?', 'С детьми и подростками примерно от 7 до 16 лет. Конкретный формат зависит от возраста и запроса.'],
  ['Вы помогаете именно с учебными предметами?', 'Основной фокус — не репетиторство, а то, как ребенок учится: самостоятельность, самоорганизация, мотивация и стратегии. Конкретная задача может стать материалом для работы над навыками.'],
  ['А если ребенок сам не хочет заниматься?', 'Это нормально. Работа не строится на принуждении: сначала важно понять, что происходит и почему ребенок сопротивляется.'],
  ['Родители присутствуют на занятиях?', 'Как правило, нет. Ребенку нужно собственное пространство, а родители получают необходимую обратную связь по процессу и динамике.'],
  ['Можно начать не с долгой программы?', 'Да. Начните с бесплатного знакомства, стратегической встречи или диагностического маршрута.'],
  ['Что будет, если ребенку больше не нужна помощь?', 'Это хороший результат. Если поддержку можно уменьшить, работа движется именно туда, куда нужно.']
] as const;
```

- [ ] **Step 5: Verify assets and type checking**

Run:

```bash
sips -g pixelWidth -g pixelHeight "src/assets/nina-hero.jpg" "public/og-cover.jpg"
npm run check
```

Expected: the hero is upright, OG reports 1200 by 630, and Astro reports zero type errors.

- [ ] **Step 6: Commit the approved content and assets**

```bash
git add src/assets/nina-hero.jpg public/og-cover.jpg public/favicon.svg src/content/site.ts
git commit -m "feat: add Nina landing content and assets"
```

---

### Task 3: Build The Design Foundation, Header, And Hero

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/sections.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Define design tokens and global behavior**

Create `src/styles/tokens.css`:

```css
:root {
  --ink: #20382f;
  --ink-soft: #385047;
  --cream: #f5efe5;
  --paper: #fffaf2;
  --berry: #a82f56;
  --rose: #d99aad;
  --butter: #efd36f;
  --mist: #c9e5e3;
  --line: color-mix(in srgb, var(--ink) 24%, transparent);
  --font-display: 'Literata Variable', Georgia, serif;
  --font-body: 'Onest Variable', Arial, sans-serif;
  --step--1: clamp(.82rem, .79rem + .13vw, .9rem);
  --step-0: clamp(1rem, .96rem + .2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.13rem + .6vw, 1.6rem);
  --step-2: clamp(1.65rem, 1.36rem + 1.45vw, 2.45rem);
  --step-3: clamp(2.2rem, 1.67rem + 2.65vw, 3.85rem);
  --step-4: clamp(3rem, 2rem + 5vw, 6.5rem);
  --space-1: .5rem;
  --space-2: .75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;
  --space-7: clamp(4rem, 8vw, 7.5rem);
  --shell: min(1180px, calc(100% - 2rem));
  --radius-s: .75rem;
  --radius-m: 1.25rem;
  --radius-l: 2rem;
  --shadow-hard: .35rem .35rem 0 var(--ink);
  --header-height: 4.5rem;
}
```

Create `src/styles/global.css`:

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: var(--header-height); }
body { margin: 0; background: var(--cream); color: var(--ink); font: 400 var(--step-0)/1.6 var(--font-body); }
body:has(dialog[open]) { overflow: hidden; }
img, picture, svg { display: block; max-width: 100%; }
button, input, textarea { font: inherit; }
button, summary, a { -webkit-tap-highlight-color: transparent; }
a { color: inherit; text-underline-offset: .2em; }
h1, h2, h3, p { margin-block-start: 0; }
h1, h2, h3 { font-family: var(--font-display); line-height: .98; letter-spacing: -.045em; text-wrap: balance; }
p { text-wrap: pretty; }
:focus-visible { outline: .2rem solid var(--berry); outline-offset: .2rem; }
[id] { scroll-margin-top: calc(var(--header-height) + 1rem); }
.shell { width: var(--shell); margin-inline: auto; }
.section { padding-block: var(--space-7); }
.eyebrow { font-size: var(--step--1); font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
.button { display: inline-flex; min-height: 2.9rem; align-items: center; justify-content: center; border: .1rem solid var(--ink); border-radius: 999px; padding: .75rem 1.2rem; background: var(--ink); color: var(--paper); font-weight: 750; text-decoration: none; cursor: pointer; }
.button--light { background: var(--paper); color: var(--ink); }
.button--yellow { background: var(--butter); color: var(--ink); box-shadow: var(--shadow-hard); }
.skip-link { position: fixed; z-index: 100; top: .5rem; left: .5rem; transform: translateY(-150%); background: var(--paper); padding: .75rem 1rem; }
.skip-link:focus { transform: none; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

Create `src/styles/sections.css` with the initial header and hero rules:

```css
.site-header { position: sticky; z-index: 40; top: 0; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--cream) 92%, transparent); backdrop-filter: blur(.8rem); }
.site-header__inner { min-height: var(--header-height); display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.brand { font-weight: 850; text-decoration: none; letter-spacing: -.02em; }
.site-nav { display: flex; align-items: center; gap: 1.15rem; }
.site-nav a { font-size: var(--step--1); font-weight: 650; text-decoration: none; }
.site-nav__mobile { display: none; }
.hero { min-height: calc(100svh - var(--header-height)); display: grid; align-items: center; padding-block: clamp(2.5rem, 7vw, 6rem); overflow: hidden; }
.hero__grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(18rem, .85fr); gap: clamp(2rem, 6vw, 6rem); align-items: center; }
.hero h1 { max-width: 12ch; margin-bottom: 1.25rem; font-size: var(--step-4); }
.hero h1 em { color: var(--berry); font-style: italic; }
.hero__body { max-width: 43rem; font-size: var(--step-1); line-height: 1.45; }
.hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin-top: 1.75rem; }
.hero__note { max-width: 15rem; font-size: var(--step--1); }
.hero__media { position: relative; }
.hero__media picture, .hero__media img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: 50% 58%; border: .45rem solid var(--rose); border-radius: 45% 45% 1rem 1rem; }
.hero__stamp { position: absolute; top: 8%; right: -5%; width: 6.5rem; aspect-ratio: 1; display: grid; place-items: center; border: .12rem solid var(--ink); border-radius: 50%; background: var(--butter); font-size: .72rem; font-weight: 850; line-height: 1.1; text-align: center; transform: rotate(8deg); }
@media (max-width: 760px) { .site-nav { display: none; } .site-nav__mobile { display: block; } .site-nav__mobile summary { min-width: 2.9rem; min-height: 2.9rem; display: grid; place-items: center; cursor: pointer; } .site-nav__panel { position: absolute; inset: var(--header-height) 1rem auto; display: grid; gap: .35rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--paper); box-shadow: var(--shadow-hard); } .site-nav__panel a { padding: .7rem; font-weight: 700; text-decoration: none; } .hero { min-height: auto; } .hero__grid { grid-template-columns: 1fr; } .hero h1 { max-width: 11ch; } .hero__media { width: min(88%, 28rem); justify-self: end; } }
```

- [ ] **Step 2: Build the metadata and structured-data layout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import '@fontsource-variable/literata';
import '@fontsource-variable/onest';
import '@/styles/global.css';
import '@/styles/sections.css';
import CookieConsent from '@/components/CookieConsent.astro';
import { site } from '@/content/site';

interface Props {
  title?: string;
  description?: string;
  noindex?: boolean;
}

const { title = site.title, description = site.description, noindex = false } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site ?? Astro.url.origin);
const ogImage = new URL('/og-cover.jpg', Astro.site ?? Astro.url.origin);
const schema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: 'Образовательный наставник',
  url: canonical.origin,
  email: 'dyachenko.nina139@gmail.com',
  sameAs: ['https://t.me/ninixer']
};
---

<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="theme-color" content="#f5efe5" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    {noindex && <meta name="robots" content="noindex,follow" />}
    <script type="application/ld+json" is:inline set:html={JSON.stringify(schema)} />
  </head>
  <body>
    <a class="skip-link" href="#main">К основному содержанию</a>
    <slot />
    <CookieConsent />
  </body>
</html>
```

Temporarily create `src/components/CookieConsent.astro` so the layout compiles; Task 6 replaces it:

```astro
<div hidden data-cookie-consent></div>
```

- [ ] **Step 3: Build the semantic header**

Create `src/components/SiteHeader.astro`:

```astro
---
import { site } from '@/content/site';
const links = [['Подход', '#approach'], ['Обо мне', '#about'], ['Форматы', '#offers']];
---

<header class="site-header">
  <div class="shell site-header__inner">
    <a class="brand" href="#top" aria-label="Нина Дьяченко, к началу страницы">{site.name}</a>
    <nav class="site-nav" aria-label="Основная навигация">
      {links.map(([label, href]) => <a href={href}>{label}</a>)}
      <a class="button button--light" href="#contact" data-contact-trigger>{site.hero.cta}</a>
    </nav>
    <details class="site-nav__mobile">
      <summary aria-label="Открыть меню">Меню</summary>
      <nav class="site-nav__panel" aria-label="Мобильная навигация">
        {links.map(([label, href]) => <a href={href}>{label}</a>)}
        <a href="#contact">Обсудить ситуацию</a>
      </nav>
    </details>
  </div>
</header>
```

- [ ] **Step 4: Build the hero with Astro responsive image output**

Create `src/components/Hero.astro`:

```astro
---
import { Picture } from 'astro:assets';
import nina from '@/assets/nina-hero.jpg';
import { site } from '@/content/site';
---

<section class="hero" id="top" aria-labelledby="hero-title" data-hero>
  <div class="shell hero__grid">
    <div>
      <p class="eyebrow">{site.hero.eyebrow}</p>
      <h1 id="hero-title">Ребенок может учиться <em>самостоятельно.</em> Я помогу ему этому научиться.</h1>
      <p class="hero__body">{site.hero.body}</p>
      <p><strong>{site.hero.trust}</strong></p>
      <div class="hero__actions">
        <a class="button" href="#contact" data-contact-trigger>{site.hero.cta}</a>
        <span class="hero__note">{site.hero.note}</span>
      </div>
    </div>
    <div class="hero__media">
      <Picture
        src={nina}
        alt="Нина Дьяченко общается с ребенком"
        formats={['avif', 'webp']}
        widths={[480, 720, 960]}
        sizes="(max-width: 760px) 88vw, 38vw"
        loading="eager"
        fetchpriority="high"
      />
      <span class="hero__stamp" aria-hidden="true">8 ЛЕТ<br />В ОБРАЗОВАНИИ</span>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Compose the initial page**

Replace `src/pages/index.astro`:

```astro
---
export const prerender = true;
import BaseLayout from '@/layouts/BaseLayout.astro';
import SiteHeader from '@/components/SiteHeader.astro';
import Hero from '@/components/Hero.astro';
---

<BaseLayout>
  <SiteHeader />
  <main id="main">
    <Hero />
  </main>
</BaseLayout>
```

- [ ] **Step 6: Verify desktop and mobile foundations**

Run `npm run dev`, open `http://localhost:4321`, and inspect at 1440 by 900 and 375 by 812.

Expected: the photo is upright, the H1 stays readable without overflow, desktop navigation becomes a native mobile menu below 760 pixels, keyboard focus is visible, and no horizontal scrollbar appears.

- [ ] **Step 7: Commit the visual foundation**

```bash
git add src/styles src/layouts src/components/SiteHeader.astro src/components/Hero.astro src/components/CookieConsent.astro src/pages/index.astro
git commit -m "feat: build landing header and hero"
```

---

### Task 4: Build The Core Marketing Story

**Files:**
- Create: `src/components/Recognition.astro`
- Create: `src/components/Approach.astro`
- Create: `src/components/Outcomes.astro`
- Create: `src/components/About.astro`
- Create: `src/components/Process.astro`
- Modify: `src/styles/sections.css`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add the five semantic section components**

Create `src/components/Recognition.astro`:

```astro
---
import { problems } from '@/content/site';
---
<section class="section recognition" aria-labelledby="recognition-title">
  <div class="shell">
    <p class="eyebrow">Узнаете себя?</p>
    <h2 id="recognition-title">Возможно, дело <em>не в лени.</em></h2>
    <div class="recognition__grid">
      {problems.map((problem, index) => <article class="problem"><span>0{index + 1}</span><h3>{problem.quote}</h3><p>{problem.text}</p></article>)}
    </div>
    <p class="recognition__close">За трудностями часто стоят навыки и причины, которые ребенок пока не умеет распознавать и регулировать самостоятельно.</p>
  </div>
</section>
```

Create `src/components/Approach.astro`:

```astro
---
import { dimensions } from '@/content/site';
---
<section class="section approach" id="approach" aria-labelledby="approach-title">
  <div class="shell">
    <p class="eyebrow">Моя задача</p>
    <h2 id="approach-title">Не заставить ребенка учиться. А научить <em>управлять собственной учебой.</em></h2>
    <p class="approach__lead">Я начинаю не с вопроса «Как заставить?», а с вопроса «Почему ему сейчас сложно справляться самостоятельно?»</p>
    <div class="dimensions">{dimensions.map(([title, text]) => <article><h3>{title}</h3><p>{text}</p></article>)}</div>
    <p class="approach__close">Моя цель — постепенно стать ему не нужна.</p>
  </div>
</section>
```

Create `src/components/Outcomes.astro`:

```astro
---
import { childOutcomes, parentOutcomes } from '@/content/site';
---
<section class="section outcomes" aria-labelledby="outcomes-title">
  <div class="shell">
    <p class="eyebrow">Что изменится</p>
    <h2 id="outcomes-title">Не просто «лучше учится»</h2>
    <div class="outcomes__grid">
      <article><h3>Ребенок</h3><ul>{childOutcomes.map(([title, text]) => <li><strong>{title}</strong><span>{text}</span></li>)}</ul></article>
      <article class="outcomes__parents"><h3>А родители</h3><ul>{parentOutcomes.map((item) => <li>{item}</li>)}</ul></article>
    </div>
  </div>
</section>
```

Create `src/components/About.astro`:

```astro
---
import { qualifications } from '@/content/site';
---
<section class="section about" id="about" aria-labelledby="about-title">
  <div class="shell about__grid">
    <div><p class="eyebrow">Обо мне</p><h2 id="about-title">Нина Дьяченко.<br /><em>8 лет в образовании.</em></h2><p class="about__lead">Я работаю не ради пятерок, а ради самостоятельности ребенка.</p></div>
    <div><p>Моя специализация — образовательное наставничество. Я глубоко изучаю особенности каждого ребенка, нахожу первопричину сложностей и собираю индивидуальный маршрут.</p><div class="qualifications">{qualifications.map(([title, text]) => <article><h3>{title}</h3><p>{text}</p></article>)}</div><p>В моем опыте также подростковый подкаст о психологии, книжный клуб для развития критического мышления и работа вожатой.</p><p><strong>Я беру ограниченное количество семей, чтобы уделять максимум внимания каждому ребенку.</strong></p></div>
  </div>
</section>
```

Create `src/components/Process.astro`:

```astro
---
import { process } from '@/content/site';
---
<section class="section process" aria-labelledby="process-title">
  <div class="shell">
    <p class="eyebrow">Как мы будем работать</p>
    <h2 id="process-title">Сначала понять. <em>Потом менять.</em></h2>
    <ol>{process.map(([number, title, text], index) => <li class:list={{ 'process__final': index === process.length - 1 }}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
  </div>
</section>
```

- [ ] **Step 2: Add the exact responsive layout rules for these sections**

Append to `src/styles/sections.css`:

```css
.recognition { background: var(--rose); }
.recognition h2, .approach h2, .outcomes h2, .about h2, .process h2 { max-width: 15ch; font-size: var(--step-3); }
h2 em { color: var(--berry); font-style: italic; }
.recognition__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2.5rem; }
.problem { min-height: 13rem; padding: 1.4rem; border: 1px solid var(--ink); border-radius: var(--radius-m); background: color-mix(in srgb, var(--paper) 28%, transparent); }
.problem > span { font-weight: 850; }
.problem h3 { margin-top: 2rem; font-size: var(--step-1); }
.recognition__close { max-width: 48rem; margin: 2rem 0 0 auto; font-size: var(--step-1); font-weight: 700; }
.approach { background: var(--ink); color: var(--paper); }
.approach h2 em { color: #f2b2c7; }
.approach__lead { max-width: 50rem; font-size: var(--step-1); }
.dimensions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 2.5rem; background: color-mix(in srgb, var(--paper) 32%, transparent); border: 1px solid color-mix(in srgb, var(--paper) 32%, transparent); }
.dimensions article { min-height: 10rem; padding: 1.3rem; background: var(--ink); }
.dimensions h3 { font-size: var(--step-1); }
.approach__close { margin: 2.5rem 0 0 auto; max-width: 32rem; color: var(--butter); font: 700 var(--step-2)/1.1 var(--font-display); }
.outcomes { background: var(--mist); }
.outcomes__grid { display: grid; grid-template-columns: 1.25fr .75fr; gap: 1rem; margin-top: 2.5rem; }
.outcomes article { padding: clamp(1.5rem, 4vw, 3rem); border: 1px solid var(--ink); border-radius: var(--radius-l); background: var(--paper); }
.outcomes__parents { background: var(--butter) !important; box-shadow: var(--shadow-hard); }
.outcomes ul { list-style: none; margin: 1.5rem 0 0; padding: 0; }
.outcomes li { padding-block: .8rem; border-top: 1px solid var(--line); }
.outcomes li span, .outcomes li strong { display: block; }
.about { background: var(--paper); }
.about__grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: clamp(2rem, 7vw, 7rem); }
.about__lead { color: var(--berry); font-size: var(--step-1); font-weight: 700; }
.qualifications { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-block: 2rem; }
.qualifications article { padding-top: 1rem; border-top: .15rem solid var(--ink); }
.qualifications h3 { font-size: 1.15rem; letter-spacing: -.02em; }
.process { background: var(--butter); }
.process ol { list-style: none; margin: 2.5rem 0 0; padding: 0; }
.process li { display: grid; grid-template-columns: 5rem 1fr; gap: 1.2rem; padding-block: 1.4rem; border-top: 1px solid var(--ink); }
.process li > span { font: 700 var(--step-2)/1 var(--font-display); }
.process li h3 { margin-bottom: .4rem; font-size: var(--step-1); }
.process__final { margin-top: 1rem; padding-inline: 1rem; border: 1px solid var(--ink) !important; border-radius: var(--radius-m); background: var(--paper); box-shadow: var(--shadow-hard); }
@media (max-width: 760px) { .recognition__grid, .dimensions, .outcomes__grid, .about__grid, .qualifications { grid-template-columns: 1fr; } .problem { min-height: auto; } .dimensions article { min-height: auto; } .process li { grid-template-columns: 3.4rem 1fr; } }
```

- [ ] **Step 3: Compose the sections in the approved order**

Update `src/pages/index.astro` imports and `<main>`:

```astro
---
export const prerender = true;
import BaseLayout from '@/layouts/BaseLayout.astro';
import SiteHeader from '@/components/SiteHeader.astro';
import Hero from '@/components/Hero.astro';
import Recognition from '@/components/Recognition.astro';
import Approach from '@/components/Approach.astro';
import Outcomes from '@/components/Outcomes.astro';
import About from '@/components/About.astro';
import Process from '@/components/Process.astro';
---
<BaseLayout><SiteHeader /><main id="main"><Hero /><Recognition /><Approach /><Outcomes /><About /><Process /></main></BaseLayout>
```

- [ ] **Step 4: Verify content, hierarchy, and responsive flow**

Run `npm run check`, then inspect 320, 375, 768, and 1440 pixel widths.

Expected: exactly one H1 exists; every section has a labelled H2; grids collapse without horizontal scrolling; no paragraph exceeds roughly 70 characters per line on desktop; the five process steps remain in order.

- [ ] **Step 5: Commit the core marketing story**

```bash
git add src/components/Recognition.astro src/components/Approach.astro src/components/Outcomes.astro src/components/About.astro src/components/Process.astro src/styles/sections.css src/pages/index.astro
git commit -m "feat: add Nina mentoring story sections"
```

---

### Task 5: Add Offers, Ethical Principle, FAQ, And Contact Surfaces

**Files:**
- Create: `src/components/Offers.astro`
- Create: `src/components/PrincipleFaq.astro`
- Create: `src/components/Contact.astro`
- Create: `src/components/ContactDialog.astro`
- Create: `src/components/MobileCta.astro`
- Create: `src/scripts/contact-dialog.ts`
- Create: `src/scripts/mobile-cta.ts`
- Modify: `src/styles/sections.css`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Build approved price cards grouped by starting point and support**

Create `src/components/Offers.astro`:

```astro
---
import { offers } from '@/content/site';
const groups = [
  ['start', 'Можно начать с одного разговора'],
  ['support', 'Или выстроить долгосрочный маршрут']
] as const;
---
<section class="section offers" id="offers" aria-labelledby="offers-title">
  <div class="shell"><p class="eyebrow">Форматы работы</p><h2 id="offers-title">Выберите не программу, а <em>подходящую точку старта.</em></h2>
    {groups.map(([key, label]) => <div class="offer-group"><h3>{label}</h3><div class="offer-grid">{offers.filter((offer) => offer.group === key).map((offer) => <article class:list={['offer', { 'offer--featured': offer.featured }]}><h4>{offer.title}</h4><p class="offer__price">{offer.price}</p><p>{offer.audience}</p><p class="offer__details">{offer.details}</p><a class="button button--light" href="#contact" data-contact-trigger>{offer.cta}</a></article>)}</div></div>)}
  </div>
</section>
```

- [ ] **Step 2: Build the ethical statement and accessible FAQ**

Create `src/components/PrincipleFaq.astro`:

```astro
---
import { faq } from '@/content/site';
---
<section class="section principle" aria-labelledby="principle-title"><div class="shell"><p class="eyebrow">Важно</p><h2 id="principle-title">Я не обещаю <em>«исправить ребенка».</em></h2><p>Ребенок — не проект, который нужно оптимизировать. Мне важно, чтобы он понимал себя, принимал решения, не боялся пробовать и учился на своих ошибках.</p></div></section>
<section class="section faq" aria-labelledby="faq-title"><div class="shell"><p class="eyebrow">FAQ</p><h2 id="faq-title">Коротко о важном</h2><div class="faq__list">{faq.map(([question, answer]) => <details><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
```

- [ ] **Step 3: Build the always-present final contact and native form**

Create `src/components/Contact.astro`:

```astro
---
import { site } from '@/content/site';
---
<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="shell contact__grid">
    <div><p class="eyebrow">Начните со знакомства</p><h2 id="contact-title" tabindex="-1">А что, если ребенку нужен взрослый, который поможет <em>обходиться без постоянного контроля?</em></h2><p>За 20–30 минут мы обсудим вашу ситуацию и поймем, могу ли я быть полезна семье.</p><div class="contact__links"><a href={site.contacts.telegram} target="_blank" rel="noreferrer" data-goal="telegram_click">Telegram ↗</a><a href={site.contacts.whatsapp} target="_blank" rel="noreferrer" data-goal="whatsapp_click">WhatsApp ↗</a><a href={site.contacts.email}>Email ↗</a></div></div>
    <form class="contact-form" method="post" action="/api/contact" data-contact-form>
      <div data-form-summary class="form-summary" tabindex="-1" hidden></div>
      <label>Ваше имя<input class="ym-disable-keys" name="name" autocomplete="name" minlength="2" maxlength="80" required /></label>
      <label>Удобный контакт<input class="ym-disable-keys" name="preferredContact" autocomplete="email" minlength="3" maxlength="120" aria-describedby="contact-hint" required /></label>
      <small id="contact-hint">Телефон, email или ник в мессенджере</small>
      <label>Коротко о ситуации<textarea class="ym-disable-keys" name="situation" rows="5" minlength="10" maxlength="1000" aria-describedby="situation-hint" required></textarea></label>
      <small id="situation-hint">Не указывайте фамилию ребенка, диагнозы, документы и другие чувствительные сведения.</small>
      <label class="consent-check"><input type="checkbox" name="consent" required /> <span>Даю <a href="/consent/" target="_blank">согласие на обработку персональных данных</a> и ознакомился(-ась) с <a href="/privacy/" target="_blank">политикой</a>.</span></label>
      <input type="hidden" name="consentVersion" value="1.0" />
      <input type="hidden" name="startedAt" value="" data-started-at />
      <label class="honeypot" aria-hidden="true">Ваш сайт<input name="website" tabindex="-1" autocomplete="off" /></label>
      <button class="button button--yellow" type="submit">Отправить заявку</button>
      <p class="form-status" role="status" aria-live="polite" data-form-status></p>
    </form>
  </div>
</section>
<footer class="site-footer"><div class="shell"><p>© {new Date().getFullYear()} Нина Дьяченко</p><nav aria-label="Правовая информация"><a href="/privacy/">Политика</a><a href="/consent/">Согласие</a><button type="button" data-open-cookie-settings>Настройки аналитики</button></nav><p>Онлайн · русскоязычные семьи по всему миру</p></div></footer>
```

- [ ] **Step 4: Add the progressive contact dialog and mobile CTA**

Create `src/components/ContactDialog.astro`:

```astro
---
import { site } from '@/content/site';
---
<dialog class="contact-dialog" data-contact-dialog aria-labelledby="contact-dialog-title"><div class="contact-dialog__head"><h2 id="contact-dialog-title">Как вам удобнее?</h2><button type="button" data-dialog-close aria-label="Закрыть">×</button></div><p>Выберите способ для бесплатного знакомства.</p><div class="contact-dialog__options"><a href={site.contacts.telegram} target="_blank" rel="noreferrer" data-goal="telegram_click">Написать в Telegram <span>↗</span></a><a href={site.contacts.whatsapp} target="_blank" rel="noreferrer" data-goal="whatsapp_click">Написать в WhatsApp <span>↗</span></a><button type="button" data-dialog-form>Оставить заявку <span>↓</span></button></div></dialog>
<script src="../scripts/contact-dialog.ts"></script>
```

Create `src/components/MobileCta.astro`:

```astro
<a class="mobile-cta button" href="#contact" data-mobile-cta data-contact-trigger hidden>Обсудить ситуацию</a>
<script src="../scripts/mobile-cta.ts"></script>
```

Create `src/scripts/contact-dialog.ts`:

```ts
const dialog = document.querySelector<HTMLDialogElement>('[data-contact-dialog]');
if (dialog) {
  document.querySelectorAll<HTMLAnchorElement>('[data-contact-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      dialog.showModal();
      window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'contact_open' }));
    });
  });
  dialog.querySelector<HTMLElement>('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector<HTMLElement>('[data-dialog-form]')?.addEventListener('click', () => {
    dialog.close();
    document.querySelector<HTMLElement>('#contact-title')?.focus({ preventScroll: true });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#contact')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
}
```

Create `src/scripts/mobile-cta.ts`:

```ts
const hero = document.querySelector('[data-hero]');
const cta = document.querySelector<HTMLElement>('[data-mobile-cta]');
const contact = document.querySelector('#contact');
if (hero && cta && contact) {
  let heroVisible = true;
  let contactVisible = false;
  const render = () => { cta.hidden = heroVisible || contactVisible; };
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; render(); }, { threshold: .05 }).observe(hero);
  new IntersectionObserver(([entry]) => { contactVisible = entry.isIntersecting; render(); }, { threshold: .05 }).observe(contact);
}
```

- [ ] **Step 5: Add section, form, dialog, and mobile CTA styling**

Append to `src/styles/sections.css`:

```css
.offers { background: var(--cream); }
.offers h2, .principle h2, .faq h2, .contact h2 { max-width: 16ch; font-size: var(--step-3); }
.offer-group { margin-top: 3rem; }
.offer-group > h3 { font-size: var(--step-1); }
.offer-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem; }
.offer { grid-column: span 2; display: flex; min-height: 24rem; flex-direction: column; padding: 1.4rem; border: 1px solid var(--ink); border-radius: var(--radius-m); background: var(--paper); }
.offer-grid .offer:first-child:nth-last-child(2), .offer-grid .offer:first-child:nth-last-child(2) ~ .offer { grid-column: span 3; }
.offer--featured { background: var(--mist); box-shadow: var(--shadow-hard); }
.offer h4 { font-size: var(--step-1); }
.offer__price { color: var(--berry); font-weight: 850; }
.offer__details { padding-top: 1rem; border-top: 1px solid var(--line); }
.offer .button { margin-top: auto; }
.principle { background: var(--ink); color: var(--paper); }
.principle h2 em { color: #f2b2c7; }
.principle p:last-child { max-width: 50rem; font-size: var(--step-1); }
.faq { background: var(--paper); }
.faq__list { margin-top: 2rem; border-top: 1px solid var(--ink); }
.faq details { border-bottom: 1px solid var(--ink); }
.faq summary { display: flex; min-height: 4rem; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; font-weight: 750; }
.faq summary::-webkit-details-marker { display: none; }
.faq details[open] summary span { transform: rotate(45deg); }
.faq details p { max-width: 50rem; padding-bottom: 1.2rem; }
.contact { background: var(--ink); color: var(--paper); }
.contact h2 em { color: #f2b2c7; }
.contact__grid { display: grid; grid-template-columns: 1fr .8fr; gap: clamp(2rem, 7vw, 7rem); }
.contact__links { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
.contact__links a { padding: .65rem .9rem; border: 1px solid currentColor; border-radius: 999px; text-decoration: none; }
.contact-form { display: grid; gap: .65rem; padding: clamp(1.2rem, 4vw, 2rem); border-radius: var(--radius-l); background: var(--paper); color: var(--ink); }
.contact-form label:not(.consent-check, .honeypot) { display: grid; gap: .35rem; font-weight: 700; }
.contact-form input, .contact-form textarea { width: 100%; border: 1px solid var(--ink); border-radius: var(--radius-s); padding: .75rem; background: #fff; }
.contact-form [aria-invalid='true'] { border-color: var(--berry); }
.consent-check { display: grid; grid-template-columns: auto 1fr; gap: .65rem; font-size: var(--step--1); }
.consent-check input { width: 1.25rem; height: 1.25rem; }
.honeypot { position: absolute !important; left: -10000px !important; }
.form-summary { border-left: .25rem solid var(--berry); padding: .75rem; background: #fff0f4; }
.site-footer { padding-block: 1.5rem; background: var(--ink); color: var(--paper); border-top: 1px solid color-mix(in srgb, var(--paper) 25%, transparent); font-size: var(--step--1); }
.site-footer .shell, .site-footer nav { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
.site-footer nav { justify-content: flex-start; }
.site-footer button { border: 0; padding: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; }
.contact-dialog { width: min(34rem, calc(100% - 2rem)); border: 1px solid var(--ink); border-radius: var(--radius-l); padding: 1.4rem; background: var(--ink); color: var(--paper); }
.contact-dialog::backdrop { background: rgb(12 23 19 / .68); backdrop-filter: blur(.25rem); }
.contact-dialog__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.contact-dialog__head h2 { font-size: var(--step-2); }
.contact-dialog__head button { border: 0; background: transparent; color: inherit; font-size: 2rem; cursor: pointer; }
.contact-dialog__options { display: grid; gap: .6rem; margin-top: 1rem; }
.contact-dialog__options :is(a, button) { display: flex; min-height: 3.2rem; align-items: center; justify-content: space-between; border: 1px solid var(--ink); border-radius: var(--radius-s); padding: .8rem 1rem; background: var(--paper); color: var(--ink); font-weight: 750; text-decoration: none; cursor: pointer; }
.contact-dialog__options :nth-child(2) { background: var(--butter); }
.mobile-cta { position: fixed; z-index: 35; right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); display: none; box-shadow: 0 .5rem 2rem rgb(0 0 0 / .25); }
@media (max-width: 760px) { .offer-grid, .contact__grid { grid-template-columns: 1fr; } .offer, .offer-grid .offer:first-child:nth-last-child(2), .offer-grid .offer:first-child:nth-last-child(2) ~ .offer { grid-column: auto; min-height: auto; } .mobile-cta:not([hidden]) { display: inline-flex; } .contact-dialog { margin: auto 1rem 1rem; border-radius: var(--radius-l) var(--radius-l) var(--radius-s) var(--radius-s); } }
```

- [ ] **Step 6: Complete page composition**

Import `Offers`, `PrincipleFaq`, `Contact`, `ContactDialog`, and `MobileCta` in `src/pages/index.astro`; place them after `Process` in that order, then place the dialog and mobile CTA after `</main>`.

```astro
<Process />
<Offers />
<PrincipleFaq />
<Contact />
</main>
<ContactDialog />
<MobileCta />
```

- [ ] **Step 7: Verify the complete static experience**

Run `npm run check`, then test with JavaScript disabled.

Expected: every CTA still reaches `#contact`; Telegram, WhatsApp, and email links work; all prices are visible; FAQ disclosures work; the form remains visible; the page has no invented testimonials.

- [ ] **Step 8: Commit the conversion surfaces**

```bash
git add src/components/Offers.astro src/components/PrincipleFaq.astro src/components/Contact.astro src/components/ContactDialog.astro src/components/MobileCta.astro src/scripts/contact-dialog.ts src/scripts/mobile-cta.ts src/styles/sections.css src/pages/index.astro
git commit -m "feat: add offers FAQ and contact flow"
```

---

### Task 6: Add Legal Pages And Consent-Gated Yandex Metrica

**Files:**
- Replace: `src/components/CookieConsent.astro`
- Create: `src/scripts/analytics.ts`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/consent.astro`
- Create: `src/pages/thanks.astro`
- Create: `src/pages/robots.txt.ts`
- Modify: `src/styles/sections.css`

- [ ] **Step 1: Add the standalone legal and confirmation pages**

Create `src/pages/privacy.astro`:

```astro
---
export const prerender = true;
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Политика обработки персональных данных — Нина Дьяченко" noindex>
  <main id="main" class="legal shell">
    <p class="eyebrow">Документ для проверки перед публикацией</p>
    <h1>Политика обработки персональных данных</h1>
    <p>Оператор: Нина Дьяченко. Контакт для обращений: <a href="mailto:dyachenko.nina139@gmail.com">dyachenko.nina139@gmail.com</a>.</p>
    <h2>Какие данные обрабатываются</h2><p>Имя родителя, указанный им способ связи, текст обращения, дата и технический номер заявки, версия и дата согласия, а также UTM-метки источника.</p>
    <h2>Цели и срок</h2><p>Данные используются только для ответа на обращение и организации знакомства. Срок хранения обращения — 12 месяцев, если закон или отзыв согласия не требует иного.</p>
    <h2>Хранение и передача</h2><p>Первичная запись заявок граждан России выполняется на инфраструктуре Timeweb в России. Данные формы не отправляются в Яндекс Метрику. Автоматическое уведомление направляется на почтовый ящик, размещенный в России.</p>
    <h2>Аналитика</h2><p>Яндекс Метрика загружается только после отдельного согласия. Согласие можно изменить через ссылку «Настройки аналитики» в подвале сайта.</p>
    <h2>Права пользователя</h2><p>Пользователь может запросить сведения, уточнение или удаление данных и отозвать согласие по указанному email.</p>
    <p><strong>Перед публичным запуском этот текст и реквизиты оператора проверяются профильным специалистом.</strong></p>
    <a href="/">Вернуться на сайт</a>
  </main>
</BaseLayout>
```

Create `src/pages/consent.astro`:

```astro
---
export const prerender = true;
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Согласие на обработку персональных данных — Нина Дьяченко" noindex>
  <main id="main" class="legal shell">
    <p class="eyebrow">Версия 1.0 · документ для проверки перед публикацией</p>
    <h1>Согласие на обработку персональных данных</h1>
    <p>Отправляя форму с отдельно отмеченной галочкой, пользователь свободно, конкретно, информированно и однозначно соглашается на обработку Ниной Дьяченко имени, предпочтительного контакта и текста обращения.</p>
    <h2>Цель</h2><p>Ответить на обращение, провести бесплатное знакомство и предложить подходящий формат работы.</p>
    <h2>Действия</h2><p>Сбор, запись, систематизация, накопление, хранение, уточнение, использование, блокирование и удаление данных автоматизированным и неавтоматизированным способом.</p>
    <h2>Срок и отзыв</h2><p>Согласие действует 12 месяцев со дня отправки или до отзыва. Отзыв направляется на <a href="mailto:dyachenko.nina139@gmail.com">dyachenko.nina139@gmail.com</a>.</p>
    <p>Пользователь не должен указывать фамилию ребенка, диагнозы, документы или другие чувствительные сведения.</p>
    <p><strong>Перед публичным запуском этот текст и реквизиты оператора проверяются профильным специалистом.</strong></p>
    <a href="/">Вернуться на сайт</a>
  </main>
</BaseLayout>
```

Create `src/pages/thanks.astro`:

```astro
---
export const prerender = true;
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Заявка сохранена — Нина Дьяченко" noindex><main id="main" class="legal shell"><p class="eyebrow">Заявка сохранена</p><h1>Спасибо за доверие.</h1><p>Мы сохранили обращение. Нина свяжется по указанному контакту.</p><a class="button" href="/">Вернуться на сайт</a></main></BaseLayout>
```

- [ ] **Step 2: Implement explicit analytics preference and Metrica loading**

Replace `src/components/CookieConsent.astro`:

```astro
<aside class="cookie-consent" data-cookie-panel hidden aria-labelledby="cookie-title">
  <div><h2 id="cookie-title">Аналитика посещений</h2><p>Можно разрешить Яндекс Метрику, чтобы понимать источники заявок. Отказ не влияет на сайт.</p><a href="/privacy/">Подробнее</a></div>
  <div class="cookie-consent__actions"><button class="button button--light" type="button" data-cookie-decline>Не разрешать</button><button class="button" type="button" data-cookie-accept>Разрешить</button></div>
</aside>
<script src="../scripts/analytics.ts"></script>
```

Create `src/scripts/analytics.ts`:

```ts
type Consent = 'accepted' | 'declined';
declare global { interface Window { ym?: ((id: number, action: string, ...args: unknown[]) => void) & { a?: IArguments[]; l?: number }; } }
const storageKey = 'nina:analytics-consent:v1';
const id = Number(import.meta.env.PUBLIC_YANDEX_METRICA_ID);
const panel = document.querySelector<HTMLElement>('[data-cookie-panel]');
const enabled = Number.isInteger(id) && id > 0;
let loaded = false;

function loadMetrica() {
  if (loaded || !Number.isInteger(id) || id <= 0) return;
  loaded = true;
  window.ym = window.ym || function () { (window.ym!.a ||= []).push(arguments); };
  window.ym.l = Date.now();
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(script);
  window.ym(id, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true, webvisor: false });
}

function setConsent(value: Consent) {
  const reloadToStopAnalytics = value === 'declined' && loaded;
  localStorage.setItem(storageKey, value);
  if (panel) panel.hidden = true;
  if (value === 'accepted') scheduleMetrica();
  if (reloadToStopAnalytics) location.reload();
}

function scheduleMetrica() {
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadMetrica, { timeout: 1500 });
  else window.setTimeout(loadMetrica, 0);
}

function openSettings() { if (panel) panel.hidden = false; }
if (!enabled) {
  panel?.remove();
  document.querySelectorAll('[data-open-cookie-settings]').forEach((button) => button.remove());
} else {
  const saved = localStorage.getItem(storageKey) as Consent | null;
  if (saved === 'accepted') scheduleMetrica(); else if (saved !== 'declined') openSettings();
  panel?.querySelector('[data-cookie-accept]')?.addEventListener('click', () => setConsent('accepted'));
  panel?.querySelector('[data-cookie-decline]')?.addEventListener('click', () => setConsent('declined'));
  document.querySelectorAll('[data-open-cookie-settings]').forEach((button) => button.addEventListener('click', openSettings));
  window.addEventListener('nina:goal', (event) => {
    const goal = (event as CustomEvent<string>).detail;
    if (loaded && goal) window.ym?.(id, 'reachGoal', goal);
  });
  document.querySelectorAll<HTMLElement>('[data-goal]').forEach((element) => element.addEventListener('click', () => window.dispatchEvent(new CustomEvent('nina:goal', { detail: element.dataset.goal }))));
}
```

- [ ] **Step 3: Add legal and consent panel styling**

Append to `src/styles/sections.css`:

```css
.legal { min-height: 100svh; padding-block: var(--space-7); }
.legal h1 { max-width: 18ch; font-size: var(--step-3); }
.legal h2 { margin-top: 2.5rem; font-size: var(--step-1); letter-spacing: -.02em; }
.legal p { max-width: 52rem; }
.cookie-consent { position: fixed; z-index: 90; right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); width: min(42rem, calc(100% - 2rem)); display: grid; grid-template-columns: 1fr auto; gap: 1rem; padding: 1.1rem; border: 1px solid var(--ink); border-radius: var(--radius-m); background: var(--paper); box-shadow: 0 1rem 3rem rgb(0 0 0 / .25); }
.cookie-consent[hidden] { display: none; }
.cookie-consent h2 { margin-bottom: .3rem; font-size: 1.2rem; letter-spacing: -.02em; }
.cookie-consent p { margin-bottom: .3rem; font-size: var(--step--1); }
.cookie-consent__actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
@media (max-width: 680px) { .cookie-consent { grid-template-columns: 1fr; } .cookie-consent__actions .button { flex: 1; } }
```

- [ ] **Step 4: Generate a canonical robots file**

Create `src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';
export const prerender = true;
export const GET: APIRoute = ({ site }) => new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml', site)}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
```

- [ ] **Step 5: Verify consent behavior**

Clear site storage, reload, and inspect Network.

Expected: no request to `mc.yandex.ru` occurs before acceptance; decline closes the panel and persists; reopening preferences works; form consent remains a separate unchecked checkbox; legal pages contain `noindex,follow`.

- [ ] **Step 6: Commit legal and analytics consent surfaces**

```bash
git add src/components/CookieConsent.astro src/scripts/analytics.ts src/pages/privacy.astro src/pages/consent.astro src/pages/thanks.astro src/pages/robots.txt.ts src/styles/sections.css
git commit -m "feat: add privacy and analytics consent"
```

---

### Task 7: Implement Russian-Hosted Lead Storage, Rate Limiting, And SMTP

**Files:**
- Create: `src/server/config.ts`
- Create: `src/server/lead-schema.ts`
- Create: `src/server/database.ts`
- Create: `src/server/leads.ts`
- Create: `src/server/rate-limit.ts`
- Create: `src/server/notify.ts`
- Create: `src/server/http.ts`

- [ ] **Step 1: Parse server environment only at runtime**

Create `src/server/config.ts`:

```ts
import { z } from 'zod';
const schema = z.object({
  LEADS_DB_PATH: z.string().min(1).default('./var/leads.db'),
  LEAD_NOTIFICATION_EMAIL: z.email(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.stringbool().default(true),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.email(),
  RATE_LIMIT_SECRET: z.string().min(32)
});
export type ServerConfig = z.infer<typeof schema>;
let cached: ServerConfig | undefined;
export function getServerConfig(): ServerConfig { cached ||= schema.parse(process.env); return cached; }
export function resetServerConfigForTests() { cached = undefined; }
```

- [ ] **Step 2: Normalize and validate JSON and native form payloads**

Create `src/server/lead-schema.ts`:

```ts
import { z } from 'zod';
const optionalUtm = z.string().trim().max(120).optional().default('');
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  preferredContact: z.string().trim().min(3).max(120),
  situation: z.string().trim().min(10).max(1000),
  consent: z.literal(true),
  consentVersion: z.literal('1.0'),
  website: z.string().max(0).optional().default(''),
  startedAt: z.coerce.number().int().positive().optional(),
  utmSource: optionalUtm,
  utmMedium: optionalUtm,
  utmCampaign: optionalUtm,
  utmContent: optionalUtm,
  utmTerm: optionalUtm
});
export type LeadInput = z.infer<typeof leadSchema>;
export async function parseLeadRequest(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const raw = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  const source = raw as Record<string, unknown>;
  return leadSchema.safeParse({ ...source, consent: source.consent === true || source.consent === 'on' || source.consent === 'true', startedAt: source.startedAt || undefined });
}
```

- [ ] **Step 3: Initialize SQLite outside the public directory**

Create `src/server/database.ts`:

```ts
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getServerConfig } from './config';
let database: Database.Database | undefined;
export function getDatabase() {
  if (database) return database;
  const path = getServerConfig().LEADS_DB_PATH;
  mkdirSync(dirname(path), { recursive: true });
  database = new Database(path);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      preferred_contact TEXT NOT NULL,
      situation TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      consent_at TEXT NOT NULL,
      utm_json TEXT NOT NULL,
      notification_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS rate_events (
      ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS rate_events_lookup ON rate_events(ip_hash, created_at);
  `);
  return database;
}
export function closeDatabase() { database?.close(); database = undefined; }
```

- [ ] **Step 4: Add lead persistence and 12-month retention**

Create `src/server/leads.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { getDatabase } from './database';
import type { LeadInput } from './lead-schema';
export function saveLead(input: LeadInput) {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO leads (id, created_at, name, preferred_contact, situation, consent_version, consent_at, utm_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, now, input.name, input.preferredContact, input.situation, input.consentVersion, now, JSON.stringify({ source: input.utmSource, medium: input.utmMedium, campaign: input.utmCampaign, content: input.utmContent, term: input.utmTerm }));
  db.prepare(`DELETE FROM leads WHERE created_at < ?`).run(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
  return { id, createdAt: now };
}
export function setNotificationStatus(id: string, status: 'sent' | 'failed') { getDatabase().prepare(`UPDATE leads SET notification_status = ? WHERE id = ?`).run(status, id); }
export function getLead(id: string) { return getDatabase().prepare(`SELECT * FROM leads WHERE id = ?`).get(id) as Record<string, string> | undefined; }
```

- [ ] **Step 5: Add expiring keyed-IP rate limiting without storing raw addresses**

Create `src/server/rate-limit.ts`:

```ts
import { createHmac } from 'node:crypto';
import { getServerConfig } from './config';
import { getDatabase } from './database';
const windowMs = 10 * 60 * 1000;
const maxRequests = 5;
export function hashClientIp(ip: string, now = Date.now()) { const day = new Date(now).toISOString().slice(0, 10); return createHmac('sha256', getServerConfig().RATE_LIMIT_SECRET).update(`${day}:${ip}`).digest('hex'); }
export function consumeRateLimit(ip: string, now = Date.now()) {
  const db = getDatabase();
  const hash = hashClientIp(ip, now);
  db.prepare(`DELETE FROM rate_events WHERE created_at < ?`).run(now - windowMs);
  const count = (db.prepare(`SELECT COUNT(*) AS count FROM rate_events WHERE ip_hash = ? AND created_at >= ?`).get(hash, now - windowMs) as { count: number }).count;
  if (count >= maxRequests) return false;
  db.prepare(`INSERT INTO rate_events (ip_hash, created_at) VALUES (?, ?)`).run(hash, now);
  return true;
}
```

- [ ] **Step 6: Add Russian SMTP notification delivery**

Create `src/server/notify.ts`:

```ts
import nodemailer from 'nodemailer';
import { getServerConfig } from './config';
import type { LeadInput } from './lead-schema';
export async function notifyLead(id: string, input: LeadInput) {
  const config = getServerConfig();
  const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } });
  await transport.sendMail({
    from: config.SMTP_FROM,
    to: config.LEAD_NOTIFICATION_EMAIL,
    subject: `Новая заявка ${id}`,
    text: [`Заявка: ${id}`, `Имя: ${input.name}`, `Контакт: ${input.preferredContact}`, '', 'Ситуация:', input.situation, '', `Согласие: ${input.consentVersion}`].join('\n')
  });
}
```

- [ ] **Step 7: Add safe HTTP helpers**

Create `src/server/http.ts`:

```ts
export function getClientIp(headers: Headers) { return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; }
export function wantsJson(request: Request) { return request.headers.get('content-type')?.includes('application/json') || request.headers.get('accept')?.includes('application/json') || false; }
export function errorResponse(json: boolean, status: number, message: string, fields?: Record<string, string>) {
  if (json) return Response.json({ ok: false, message, fields }, { status });
  return new Response(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Заявка не отправлена</title><main><h1>Заявка не отправлена</h1><p>${message}</p><p><a href="/#contact">Вернуться к форме</a></p></main></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
```

- [ ] **Step 8: Verify server modules type-check**

Run `npm run check`.

Expected: zero errors; no server module is bundled into a prerendered page.

- [ ] **Step 9: Commit the server core**

```bash
git add src/server
git commit -m "feat: add localized lead storage"
```

---

### Task 8: Connect The API And Progressive Form Enhancement

**Files:**
- Create: `src/pages/api/contact.ts`
- Create: `src/pages/api/health.ts`
- Create: `src/scripts/contact-form.ts`
- Modify: `src/components/Contact.astro`

- [ ] **Step 1: Implement the same-origin API route**

Create `src/pages/api/contact.ts`:

```ts
import type { APIRoute } from 'astro';
import { parseLeadRequest } from '@/server/lead-schema';
import { consumeRateLimit } from '@/server/rate-limit';
import { saveLead, setNotificationStatus } from '@/server/leads';
import { notifyLead } from '@/server/notify';
import { errorResponse, getClientIp, wantsJson } from '@/server/http';
export const prerender = false;

export const POST: APIRoute = async ({ request, url, redirect }) => {
  const json = wantsJson(request);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return errorResponse(json, 403, 'Запрос отклонен. Обновите страницу и попробуйте снова.');
  const parsed = await parseLeadRequest(request).catch(() => null);
  if (!parsed?.success) {
    const fields = parsed?.error.issues.reduce<Record<string, string>>((result, issue) => { result[String(issue.path[0] ?? 'form')] = issue.message; return result; }, {});
    return errorResponse(json, 400, 'Проверьте обязательные поля и отдельное согласие.', fields);
  }
  if (parsed.data.startedAt && Date.now() - parsed.data.startedAt < 2500) return errorResponse(json, 400, 'Форма отправлена слишком быстро. Попробуйте еще раз.');
  if (!consumeRateLimit(getClientIp(request.headers))) return errorResponse(json, 429, 'Слишком много попыток. Подождите 10 минут или напишите в мессенджер.');
  let lead: { id: string; createdAt: string };
  try { lead = saveLead(parsed.data); } catch (error) { console.error('lead_storage_failed'); return errorResponse(json, 503, 'Не удалось подтвердить сохранение заявки. Попробуйте еще раз или напишите в мессенджер.'); }
  try { await notifyLead(lead.id, parsed.data); setNotificationStatus(lead.id, 'sent'); } catch (error) { setNotificationStatus(lead.id, 'failed'); console.error('lead_notification_failed', lead.id); }
  if (!json) return redirect('/thanks/', 303);
  return Response.json({ ok: true, requestId: lead.id });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
```

- [ ] **Step 2: Add a deployment health endpoint**

Create `src/pages/api/health.ts`:

```ts
import type { APIRoute } from 'astro';
export const prerender = false;
export const GET: APIRoute = () => Response.json({ ok: true });
```

- [ ] **Step 3: Add progressive AJAX enhancement without changing native form behavior**

Create `src/scripts/contact-form.ts`:

```ts
const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
if (form) {
  const started = form.querySelector<HTMLInputElement>('[data-started-at]');
  if (started) started.value = String(Date.now());
  const params = new URLSearchParams(location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); input.value = params.get(key) ?? ''; form.append(input);
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const summary = form.querySelector<HTMLElement>('[data-form-summary]');
    const status = form.querySelector<HTMLElement>('[data-form-status]');
    if (!form.reportValidity()) { if (summary) { summary.hidden = false; summary.textContent = 'Проверьте выделенные поля и согласие.'; summary.focus(); } return; }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Сохраняем заявку…';
    const data: Record<string, unknown> = Object.fromEntries(new FormData(form));
    data.consent = true;
    try {
      const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Не удалось отправить заявку.');
      form.reset();
      if (started) started.value = String(Date.now());
      if (summary) summary.hidden = true;
      if (status) status.textContent = `Заявка сохранена. Номер: ${result.requestId}`;
      window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'form_success' }));
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : 'Не удалось отправить заявку. Попробуйте снова или используйте прямой контакт.';
    } finally { if (button) button.disabled = false; }
  });
}
```

- [ ] **Step 4: Load the enhancement from the contact component**

Append to `src/components/Contact.astro` after the footer:

```astro
<script src="../scripts/contact-form.ts"></script>
```

- [ ] **Step 5: Verify native and enhanced submission paths locally**

Create a temporary `.env` from `.env.example` with a Russian test SMTP account, run `npm run build && npm run preview`, then submit once with JavaScript and once without JavaScript.

Expected: enhanced submission returns a request ID inline; native submission redirects to `/thanks/`; the SQLite row exists before notification status becomes `sent` or `failed`; no form value appears in logs or the URL.

- [ ] **Step 6: Commit the working lead flow**

```bash
git add src/pages/api/contact.ts src/pages/api/health.ts src/scripts/contact-form.ts src/components/Contact.astro
git commit -m "feat: connect contact form endpoint"
```

---

### Task 9: Add Post-Implementation Server And Browser Tests

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/server/lead-schema.test.ts`
- Create: `tests/server/leads.test.ts`
- Create: `tests/server/rate-limit.test.ts`
- Create: `tests/e2e/landing.spec.ts`
- Create: `tests/e2e/form.spec.ts`
- Create: `tests/e2e/analytics.spec.ts`

- [ ] **Step 1: Configure Vitest and Playwright**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/server/**/*.test.ts'], env: { LEADS_DB_PATH: '/tmp/nina-vitest-leads.db', LEAD_NOTIFICATION_EMAIL: 'hello@example.ru', SMTP_HOST: 'smtp.example.ru', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'hello@example.ru', SMTP_PASSWORD: 'test-secret', SMTP_FROM: 'hello@example.ru', RATE_LIMIT_SECRET: '0123456789abcdef0123456789abcdef' } } });
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ],
  webServer: { command: 'LEADS_DB_PATH=/tmp/nina-e2e.db NODE_ENV=test node dist/server/entry.mjs', port: 4321, reuseExistingServer: !process.env.CI }
});
```

- [ ] **Step 2: Test validation after implementation**

Create `tests/server/lead-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { leadSchema } from '../../src/server/lead-schema';
const valid = { name: 'Анна', preferredContact: '@anna', situation: 'Ребенку сложно начинать задания самостоятельно.', consent: true, consentVersion: '1.0', website: '' };
describe('leadSchema', () => {
  it('accepts the minimal approved payload', () => expect(leadSchema.safeParse(valid).success).toBe(true));
  it('rejects absent separate consent', () => expect(leadSchema.safeParse({ ...valid, consent: false }).success).toBe(false));
  it('rejects the honeypot', () => expect(leadSchema.safeParse({ ...valid, website: 'spam.example' }).success).toBe(false));
  it('rejects oversized free text', () => expect(leadSchema.safeParse({ ...valid, situation: 'а'.repeat(1001) }).success).toBe(false));
});
```

- [ ] **Step 3: Test SQLite persistence and status without exposing raw IPs**

Create `tests/server/leads.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
describe('lead persistence', () => {
  beforeEach(async () => {
    const { closeDatabase } = await import('../../src/server/database');
    const { resetServerConfigForTests } = await import('../../src/server/config');
    closeDatabase();
    resetServerConfigForTests();
    process.env.LEADS_DB_PATH = join(mkdtempSync(join(tmpdir(), 'nina-leads-')), 'leads.db');
  });
  it('stores consent version and updates notification status', async () => {
    const { saveLead, getLead, setNotificationStatus } = await import('../../src/server/leads');
    const saved = saveLead({ name: 'Анна', preferredContact: '@anna', situation: 'Ребенку сложно начинать задания самостоятельно.', consent: true, consentVersion: '1.0', website: '', utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '' });
    expect(getLead(saved.id)?.consent_version).toBe('1.0');
    setNotificationStatus(saved.id, 'sent');
    expect(getLead(saved.id)?.notification_status).toBe('sent');
  });
});
```

Create `tests/server/rate-limit.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { consumeRateLimit, hashClientIp } from '../../src/server/rate-limit';
describe('rate limiting', () => {
  beforeEach(async () => {
    const { closeDatabase } = await import('../../src/server/database');
    closeDatabase();
    rmSync('/tmp/nina-vitest-leads.db', { force: true });
  });
  it('never returns the raw IP and rejects the sixth request', () => {
    const ip = '203.0.113.12';
    expect(hashClientIp(ip)).not.toContain(ip);
    for (let index = 0; index < 5; index += 1) expect(consumeRateLimit(ip)).toBe(true);
    expect(consumeRateLimit(ip)).toBe(false);
  });
});
```

- [ ] **Step 4: Add landing interaction smoke tests**

Create `tests/e2e/landing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
test('shows the approved story and contact choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('самостоятельно');
  await expect(page.getByText('15 000 ₽ · единоразово')).toBeVisible();
  await page.getByRole('link', { name: 'Обсудить ситуацию бесплатно' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Telegram/ })).toHaveAttribute('href', 'https://t.me/ninixer');
  await page.keyboard.press('Escape');
  await page.getByText('В каком возрасте вы работаете?').click();
  await expect(page.getByText(/от 7 до 16 лет/)).toBeVisible();
});
```

- [ ] **Step 5: Add client form-state tests with a mocked same-origin API**

Create `tests/e2e/form.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
test('requires separate consent and confirms an enhanced submission', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, requestId: 'test-request-1' }) }));
  await page.goto('/#contact');
  await page.getByRole('button', { name: 'Не разрешать' }).click();
  const form = page.locator('[data-contact-form]');
  await form.getByLabel('Ваше имя').fill('Анна');
  await form.getByLabel('Удобный контакт').fill('@anna');
  await form.getByLabel('Коротко о ситуации').fill('Ребенку сложно самостоятельно начинать задания.');
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(form.locator('[data-form-summary]')).toBeVisible();
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(form.locator('[data-form-status]')).toContainText('test-request-1');
});
```

- [ ] **Step 6: Add analytics opt-in tests**

Create `tests/e2e/analytics.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
test('does not request Metrica before explicit acceptance', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('mc.yandex.ru')) requests.push(request.url()); });
  await page.goto('/');
  await page.waitForTimeout(300);
  expect(requests).toHaveLength(0);
  await expect(page.getByRole('heading', { name: 'Аналитика посещений' })).toBeVisible();
  await page.getByRole('button', { name: 'Не разрешать' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Аналитика посещений' })).toBeHidden();
  expect(requests).toHaveLength(0);
});
```

- [ ] **Step 7: Run all automated verification**

Run:

```bash
npm test
npm run test:e2e
```

Expected: all Vitest and Playwright tests pass on desktop and mobile projects, and each server test starts with a clean SQLite database.

- [ ] **Step 8: Commit post-implementation tests**

```bash
git add vitest.config.ts playwright.config.ts tests
git commit -m "test: cover lead flow and landing UX"
```

---

### Task 10: Package For Timeweb And Complete Acceptance Verification

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docs/deployment.md`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: any files identified by accessibility, responsive, or Lighthouse verification

- [ ] **Step 1: Add a production container compatible with native SQLite bindings**

Create `Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG SITE_URL
ARG PUBLIC_YANDEX_METRICA_ID
ENV SITE_URL=$SITE_URL PUBLIC_YANDEX_METRICA_ID=$PUBLIC_YANDEX_METRICA_ID
RUN test -n "$SITE_URL"
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:4321/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
```

Create `.dockerignore`:

```dockerignore
node_modules
dist
.git
.env
.superpowers
playwright-report
test-results
*.db
*.db-shm
*.db-wal
```

- [ ] **Step 2: Add a database backup script**

Add to `package.json` scripts:

```json
"backup": "node scripts/backup-db.mjs"
```

Create `scripts/backup-db.mjs`:

```js
import Database from 'better-sqlite3';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const source = process.env.LEADS_DB_PATH;
const backupDir = process.env.LEADS_BACKUP_DIR ?? './var/backups';
if (!source) throw new Error('LEADS_DB_PATH is required');
await mkdir(backupDir, { recursive: true });
const target = join(backupDir, `leads-${new Date().toISOString().slice(0, 10)}.db`);
const db = new Database(source, { readonly: true });
await db.backup(target);
db.close();
console.log(`Backup written to ${target}`);
```

- [ ] **Step 3: Document exact Timeweb deployment and launch inputs**

Create `docs/deployment.md` with these commands and requirements:

```markdown
# Timeweb Deployment

1. Create a Timeweb Cloud application from the repository Dockerfile in a Russian region.
2. Attach a persistent volume at `/data` and set `LEADS_DB_PATH=/data/leads.db` and `LEADS_BACKUP_DIR=/data/backups`.
3. Configure Docker build arguments `SITE_URL` and `PUBLIC_YANDEX_METRICA_ID`; prerendered canonical metadata and the client analytics loader are produced at build time.
4. Add all runtime variables from `.env.example`; use a Russian-hosted domain mailbox for `LEAD_NOTIFICATION_EMAIL` and SMTP.
5. Set runtime `SITE_URL` to the same final HTTPS origin used at build time.
6. Map container port `4321`, enable HTTPS, and verify `/api/health` returns `{"ok":true}`.
7. Schedule `npm run backup` daily and retain encrypted backups according to the approved policy.
8. Before public launch, confirm child-photo permission, review `/privacy/` and `/consent/`, confirm operator procedures, and activate the Russian mailbox.
9. Submit one real test request; confirm the row exists on the Timeweb volume and the Russian mailbox receives it.

Do not configure Gmail as the automated form destination without a separate review of cross-border processing.
```

- [ ] **Step 4: Run final production checks**

Run:

```bash
npm run check
npm test
npm run build
npm run test:e2e
docker build --build-arg SITE_URL=http://localhost:4321 --build-arg PUBLIC_YANDEX_METRICA_ID=123456 -t nina-tutor:local .
```

Expected: every command exits 0 and the Docker health check becomes healthy when the required test environment is supplied.

- [ ] **Step 5: Verify accessibility and responsive behavior in Chromium**

Inspect at 320 by 700, 375 by 812, 768 by 1024, 1024 by 768, and 1440 by 900.

Expected: no horizontal overflow; body text stays at least 16 pixels; touch targets are at least 44 pixels; keyboard reaches skip link, menu, every CTA, dialog choices, FAQ, form, consent controls, and footer; Escape closes the dialog and returns focus; 200% zoom remains usable; reduced motion removes smooth scrolling and transitions.

- [ ] **Step 6: Run Lighthouse against the production container**

Run the container with a local test environment, open it in Chrome, and run Lighthouse mobile navigation audits for Performance, Accessibility, Best Practices, and SEO.

Expected: every category is at least 95, LCP is under 2.5 seconds, CLS is under 0.1, and no accessibility error is caused by contrast, labels, heading order, or focus. Fix measured failures in the smallest responsible component and rerun the full audit.

- [ ] **Step 7: Inspect console and network privacy behavior**

Expected: no console errors; no Metrica request before acceptance; no form data in URLs, analytics calls, or logs; no Webvisor initialization; failed SMTP still leaves a canonical SQLite record with `failed` notification status.

- [ ] **Step 8: Commit deployment and acceptance fixes**

```bash
git add Dockerfile .dockerignore package.json package-lock.json .env.example scripts/backup-db.mjs docs/deployment.md src tests
git commit -m "chore: prepare Nina landing for Timeweb"
```

---

## Completion Gate

Before declaring the implementation complete, confirm all of the following with fresh command output:

- `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e` pass.
- The production container starts only with valid required environment.
- Timeweb persistence and Russian SMTP are tested with one real non-sensitive request.
- Yandex Metrica remains absent before opt-in and tracks only the four approved goals afterward.
- The separate form checkbox is unchecked by default and consent version `1.0` is stored.
- Legal drafts and child-photo permission are explicitly marked as launch approvals, not silently assumed.
- Desktop and mobile Lighthouse categories are at least 95.
- Git status contains no generated assets, secrets, SQLite databases, reports, or visual-companion files.
