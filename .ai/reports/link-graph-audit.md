# Zero-Hallucination Link Graph & Anchor Scheme Audit — `siscontrols.com`

- **Scanned Root**: `/home/francis/antigravity-workspace/siscontrols.com`
- **Execution Time**: `10ms` (100% Deterministic AST + BFS Graph Math)
- **Total Routes**: `17` | **Internal Link Edges**: `45`
- **Max Click Depth from `/`**: `1` clicks (Rule 3d limit: `<= 3`)
- **Link Health Score**: **`79/100`** (`WARN_SCHEME_DRIFT`)
- **Findings**: `0` P0 Broken/Critical | `0` P1 High | `7` P2 Scheme/Rotation

## 1. Route Topology & Click Depth Table

| Route | Source File | Click Depth | Contextual In | Contextual Out | Nav/Footer |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/` | `src/pages/index.astro` | 0 | 15 | 6 | Yes |
| `/404` | `src/pages/404.astro` | ORPHAN | 0 | 2 | No |
| `/about` | `src/pages/about.astro` | 1 | 1 | 1 | Yes |
| `/accessibility` | `src/pages/accessibility.astro` | ORPHAN | 0 | 1 | No |
| `/builder` | `src/pages/builder.astro` | 1 | 0 | 1 | Yes |
| `/capabilities/data-center-cdu-power` | `src/pages/capabilities/data-center-cdu-power.astro` | 1 | 2 | 3 | Yes |
| `/capabilities/plc-scada-integration` | `src/pages/capabilities/plc-scada-integration.astro` | 1 | 1 | 3 | Yes |
| `/capabilities/safety-instrumented-systems` | `src/pages/capabilities/safety-instrumented-systems.astro` | 1 | 1 | 3 | Yes |
| `/capabilities/ul-508a-panels` | `src/pages/capabilities/ul-508a-panels.astro` | 1 | 6 | 2 | Yes |
| `/capability-statement` | `src/pages/capability-statement.astro` | 1 | 0 | 2 | Yes |
| `/contact` | `src/pages/contact.astro` | 1 | 1 | 2 | Yes |
| `/locations` | `src/pages/locations/index.astro` | 1 | 0 | 3 | Yes |
| `/privacy` | `src/pages/privacy.astro` | 1 | 0 | 1 | Yes |
| `/resources` | `src/pages/resources.astro` | 1 | 0 | 2 | Yes |
| `/review` | `src/pages/review.astro` | 1 | 0 | 0 | Yes |
| `/rfq` | `src/pages/rfq.astro` | 1 | 18 | 1 | Yes |
| `/terms` | `src/pages/terms.astro` | 1 | 0 | 1 | Yes |

## 2. Verified Findings & Deterministic Fix Recommendations

| Sev | Code | File:Line | Issue | Recommended Target | Suggested Rotating Anchor(s) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P2** | `DUPLICATE_SAME_PAGE_ANCHOR` | `src/pages/resources.astro:91` | Duplicate anchor text "REQUEST COPY →" used twice on /resources (lines 77 & 91) for /rfq | `/rfq` | `"request engineering RFQ"`, `"interactive panel RFQ wizard"` |
| **P2** | `DUPLICATE_SAME_PAGE_ANCHOR` | `src/pages/resources.astro:119` | Duplicate anchor text "REQUEST COPY →" used twice on /resources (lines 77 & 119) for /rfq | `/rfq` | `"request engineering RFQ"`, `"interactive panel RFQ wizard"` |
| **P2** | `DUPLICATE_SAME_PAGE_ANCHOR` | `src/pages/resources.astro:133` | Duplicate anchor text "REQUEST COPY →" used twice on /resources (lines 77 & 133) for /rfq | `/rfq` | `"request engineering RFQ"`, `"interactive panel RFQ wizard"` |
| **P2** | `DUPLICATE_SAME_PAGE_ANCHOR` | `src/pages/resources.astro:147` | Duplicate anchor text "REQUEST COPY →" used twice on /resources (lines 77 & 147) for /rfq | `/rfq` | `"request engineering RFQ"`, `"interactive panel RFQ wizard"` |
| **P2** | `UNDER_LINKED_PAGE` | `src/pages/about.astro:1` | Page /about has only 1 contextual outbound internal link(s) in its body (Rule 3b requires 2-3 contextual links) | `/` | `"24/7 Boise towing dispatch"`, `"local Treasure Valley towing service"` |
| **P2** | `UNDER_LINKED_PAGE` | `src/pages/builder.astro:1` | Page /builder has only 1 contextual outbound internal link(s) in its body (Rule 3b requires 2-3 contextual links) | `/` | `"24/7 Boise towing dispatch"`, `"local Treasure Valley towing service"` |
| **P2** | `UNDER_LINKED_PAGE` | `src/pages/rfq.astro:1` | Page /rfq has only 1 contextual outbound internal link(s) in its body (Rule 3b requires 2-3 contextual links) | `/` | `"24/7 Boise towing dispatch"`, `"local Treasure Valley towing service"` |
