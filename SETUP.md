# Site Setup Guide

## Quick Start (5 min)

### 1. Create New Client Site
```bash
./scripts/new-site.sh "Client Business Name"
```
This copies the template, inits git, and installs dependencies.

### 2. Fill In the Data Files
Everything is data-driven. Edit these 4 JSON files and the site builds itself:

| File | What it controls |
|------|-----------------|
| `src/data/site-config.json` | Business name, phone, email, address, tracking IDs, brand colors |
| `src/data/services.json` | All services (creates service pages + matrix pages) |
| `src/data/cities.json` | All service areas (creates city pages + matrix pages) |
| `src/data/copy.json` | Long-form copy, pain points, solutions per service |

### 3. Add Assets
- Drop logo into `src/assets/img/logo.png` (Astro auto-optimizes to WebP)
- Drop hero images into `src/assets/img/` (hero.png, residential.png, etc.)
- Drop service/project photos into `public/img/`

### 4. Create CSS Files
CSS is imported through Astro's build pipeline (NOT loaded via `<link>` tags):

1. Create `src/styles/design-system.css` — global styles, variables, typography
2. Create `src/styles/pages/residential.css` — page-specific styles
3. Uncomment the `import` lines in `BaseLayout.astro` and each page's frontmatter

**Important**: NEVER put CSS in `public/`. It bypasses Vite and you lose bundling, minification, and deduplication.

### 5. Update Config
Edit `astro.config.mjs`:
- Set `site:` to the production URL

### 6. Dev + Build
```bash
npm run dev      # http://localhost:4321
npm run build    # generates static site in dist/
```

---

## CSS Architecture

**Rule: `src/` is the single source of truth for CSS.**

| Import location | Scope | Example |
|----------------|-------|---------|
| `BaseLayout.astro` frontmatter | Global (every page) | `import '@/styles/design-system.css'` |
| Each page's frontmatter | Per-page | `import '@/styles/pages/residential.css'` |

Vite handles bundling, minification, and deduplication automatically.

**What goes in `public/`** (the exceptions):
- `favicon.ico`, `favicon.svg`
- `robots.txt`, `llms.txt`
- `og-default.png` (social platforms need a predictable URL)
- `_headers` (Cloudflare security headers)
- `_redirects` (Cloudflare redirects)
- Images referenced in CSS `background-image` rules (until migrated to `getImage()`)

---

## Page Generation Math

Pages are generated programmatically from JSON:
```
(number of cities) x (number of services) = city x service matrix pages
+ (number of cities) = city hub pages
+ (number of services) = service pages
+ about + contact + privacy + terms + thank-you + 404 + home = 7 core pages
= TOTAL PAGES
```

### Limiting Services Per City
In `cities.json`, add `excludedServices` array with service slugs to exclude:
```json
{
  "slug": "remote-town",
  "city": "Remote Town",
  "excludedServices": ["service-slug-1", "service-slug-2"]
}
```

### Coming Soon Services
Add `"status": "coming-soon"` to any service in `services.json` to keep it in the data but prevent page generation:
```json
{
  "slug": "future-service",
  "status": "coming-soon",
  ...
}
```

---

## Deployment

### Cloudflare Workers (via GitHub Actions)
1. Create GitHub repo
2. Add secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
3. Push to `main` -> auto-deploys

### Manual Deploy
```bash
npm run build
npx wrangler pages deploy dist/
```

### Security Headers
Security headers are handled by `public/_headers` (Cloudflare Pages format). Includes HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.

---

## Web3Forms Setup
1. Go to https://web3forms.com
2. Create free account with client's email
3. Get access key
4. Add key to `site-config.json -> web3forms.accessKey`
5. Forms automatically submit to that email

---

## Adding a New Service
1. Add entry to `services.json`
2. Add copy to `copy.json` (overview, painPoints, solution)
3. Add hero background image to `public/img/` if needed
4. Add CSS background rule to `residential.css` under `.pain-section--{heroClass}`
5. Build -> new service pages + city x service pages auto-generated

## Adding a New City
1. Add entry to `cities.json`
2. Build -> new city hub + city x service pages auto-generated

---

## SEO Checklist (Built In)
- [x] `<meta name="robots">` on every page (noindex on thank-you + 404)
- [x] `<link rel="canonical">` with proper URL construction
- [x] Open Graph + Twitter Card meta tags
- [x] JSON-LD schema on all pages (LocalBusiness, Service, FAQPage)
- [x] Sitemap (auto-generated, excludes thank-you + 404)
- [x] `robots.txt` + `llms.txt`
- [x] Non-render-blocking Google Fonts (preload + swap pattern)
- [x] HTML compression (`compressHTML: true`)
- [x] Image optimization via Astro `<Image>` + sharp
- [x] Skip-link for accessibility
- [x] Security headers via `_headers`
