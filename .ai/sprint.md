# Sprint Tasks — SIS Controls
> **Source of Truth:** Gnomie PostgreSQL database (`work_items` table)
> **Last Synchronized:** 6/2/2026, 8:29:23 PM

- `[x]` **SIS-004**: Astro Static GraphQL Build Integration
  - **Category:** build
  - **Priority:** high
  - **Why:** To replace manual static JSON file building with automated real-time database-driven pages.
  - **Goal:** Modify Astro's build engine to execute GraphQL queries targeting Twenty CRM to dynamically generate localized pages and map internal linking structures.
  - **How:** 1. Create GraphQL data client inside Astro codebase (src/utils/twenty.ts). 2. Bind queries to getStaticPaths() loops reading Twenty CRM objects. 3. Configure build fallback caching mechanisms.

- `[ ]` **SIS-003**: 410 Spam URLs (/billion*, /xilishi*)
  - **Priority:** high
  - **Why:** Domain has inherited spam URLs that need to be killed with 410 responses.
  - **Goal:** All spam URLs (/billion*, /xilishi*) return 410 Gone. Clean index in GSC.
  - **How:** Write Cloudflare Bulk Redirects or _redirects file to 410 the spam URLs.

- `[x]` **SIS-001**: Initialize Astro Framework (Enterprise Template)
  - **Priority:** high
  - **Why:** Site needs Astro framework initialization before page building.
  - **Goal:** Astro project scaffolded with Enterprise template.
  - **How:** Run /new-site workflow with enterprise vertical.

- `[x]` **SIS-002**: Map Category Architecture
  - **Priority:** high
  - **Why:** Need product category architecture before building pages.
  - **Goal:** Category architecture mapped and aligned with Bolens structure where applicable.
  - **How:** Analyze product categories. Map to URL structure. Create parts.json schema.

