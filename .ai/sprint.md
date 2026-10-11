# Sprint Tasks — SIS Controls
> **Source of Truth:** Gnomie PostgreSQL database (`work_items` table)
> **Last Synchronized:** 10/10/2026, 7:38:34 PM

- `[/]` **SIS-008**: Execute Phase 1 Human Action Roadmap: SOS Amendment & Tech E&O Binding
  - **Category:** compliance
  - **Priority:** high
  - **Why:** Required before signing prime EPC vendor packets or quoting large-scale industrial projects.
  - **Goal:** Legally formalize the Sawtooth Industrial Systems entity, protect from software/logic liability, and prepare for prime EPC contractor onboarding.
  - **How:** Submit Certificate of Amendment at sosbiz.idaho.gov ($30), request CGL + Tech E&O quote from broker, update bank signature card.

- `[x]` **SIS-007**: Sawtooth Industrial Systems Authentic Lead-Gen Astro Platform Migration
  - **Category:** build
  - **Priority:** high
  - **Why:** Original site was a template placeholder and early prototype was isolated outside repository with unverified PE/UL claims.
  - **Goal:** Deploy authentic lead-gen Astro 5.17 static platform for Sawtooth Industrial Systems with 100% verified QA test passes and git synchronization.
  - **How:** Integrated audited Sawtooth platform into siscontrols.com, replaced fake claims with authentic distribution/partner positioning, passed 108/108 Python and 139/139 Node tests, and pushed to GitHub main.

- `[x]` **SIS-004**: Astro Static GraphQL Build Integration
  - **Category:** build
  - **Priority:** high
  - **Why:** To replace manual static JSON file building with automated real-time database-driven pages.
  - **Goal:** Modify Astro's build engine to execute GraphQL queries targeting Twenty CRM to dynamically generate localized pages and map internal linking structures.
  - **How:** 1. Create GraphQL data client inside Astro codebase (src/utils/twenty.ts). 2. Bind queries to getStaticPaths() loops reading Twenty CRM objects. 3. Configure build fallback caching mechanisms.

- `[x]` **SIS-003**: 410 Spam URLs (/billion*, /xilishi*)
  - **Priority:** high
  - **Why:** Domain has inherited spam URLs that need to be killed with 410 responses.
  - **Goal:** All spam URLs (/billion*, /xilishi*) return 410 Gone. Clean index in GSC.
  - **How:** Write Cloudflare Bulk Redirects or _redirects file to 410 the spam URLs.

- `[x]` **SIS-002**: Map Category Architecture
  - **Priority:** high
  - **Why:** Need product category architecture before building pages.
  - **Goal:** Category architecture mapped and aligned with Bolens structure where applicable.
  - **How:** Analyze product categories. Map to URL structure. Create parts.json schema.

- `[x]` **SIS-001**: Initialize Astro Framework (Enterprise Template)
  - **Priority:** high
  - **Why:** Site needs Astro framework initialization before page building.
  - **Goal:** Astro project scaffolded with Enterprise template.
  - **How:** Run /new-site workflow with enterprise vertical.

