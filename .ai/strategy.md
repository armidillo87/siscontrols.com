# Strategy & Architecture

## Core Definitions
- **Vertical:** enterprise (B2B Affiliate)
- **Tier:** mid
- **Architecture:** json-hybrid
- **Retainer:** none
- **Add-Ons:** none
- **Ownership:** private

## Goal & Positioning
SIS Controls is an owned B2B affiliate/lead-gen asset. WBM history shows it was originally a massive parts catalog (`/productsar?cid=2035`, etc.) before being hijacked by pharmaceutical spammers.
Goal: Map the original industrial control parts authority and traffic directly into the Bolens ecosystem. Rebuild the core product categories programmatically to capture high-intent B2B search traffic.

## Audience & Voice
- **Audience:** Purchasing managers, industrial technicians, maintenance directors looking for specific replacement parts (e.g., Bolens compatible).
- **Voice:** Clinical, technical, spec-driven ("OEM compatible part XYZ for system ABC").
- **Colors:** Slate, industrial orange, safety yellow — high trust B2B palette.

## Funnel
- Organic Search (Part Number) -> Spec Page -> "Check Availability / Pricing" (Affiliate Link to Bolens or Lead Form).

## ⚠️ Private Notes
- Heavily spammed domain (Chinese pharmacy links). 
- Will need robust 404 handling or 410 Gone rules for the spam URLs to recover the domain's SERP health.
- Strategy relies on a `parts.json` data layer mapped programmatically to `/parts/[part-number].astro`.
- **WBM Legacy URLs:** Full list saved locally in `.ai/wbm-legacy-urls.txt` (269 URLs).
- **Spam Patterns to HTTP 410 (Gone) in Cloudflare:** `/billion*`, `*xilishi*`. This domain suffered a massive Chinese pharmacy spam injection while expired. We MUST 410 these rules before launching.
- **Legacy Structure to Rebuild (301 Map to Bolens):** The original industrial parts catalog lived at `/productsar?cid=*` and `/viewproductar?pid=*`. We must map these legacy query parameters programmatically to our new parts schema.
