# SIS Controls — Sprint

---

## SIS-001: Initialize Astro Framework (Enterprise Template)
- **Priority:** 🔴 HIGH | **Status:** ⬜ Not Started
- **WHY:** Site needs Astro framework initialization before page building.
- **GOAL:** Astro project scaffolded with Enterprise template.
- **HOW:** Run /new-site workflow with enterprise vertical.

---

## SIS-002: Map Category Architecture
- **Priority:** 🔴 HIGH | **Status:** ⬜ Not Started
- **WHY:** Need product category architecture before building pages.
- **GOAL:** Category architecture mapped and aligned with Bolens structure where applicable.
- **HOW:** Analyze product categories. Map to URL structure. Create parts.json schema.

---

## SIS-003: 410 Spam URLs (/billion*, /xilishi*)
- **Priority:** 🔴 HIGH | **Status:** ⬜ Not Started
- **WHY:** Domain has inherited spam URLs that need to be killed with 410 responses.
- **GOAL:** All spam URLs return 410 Gone. Clean index in GSC.
- **HOW:** Write Cloudflare Bulk Redirects or `_redirects` file to 410 the spam URLs.
