# Client Onboarding Questionnaire
> Fill this out COMPLETELY before building the site. Every answer maps directly to a JSON field.

---

## 1. Business Info
| Field | Answer | Maps To |
|-------|--------|---------|
| Full legal business name | | `site-config.json → business.legalName` |
| DBA / brand name | | `site-config.json → business.name` |
| Street address | | `site-config.json → business.address` |
| City, State, ZIP | | `site-config.json → business.address` |
| Phone number | | `site-config.json → business.phone` |
| Email (for leads) | | `site-config.json → business.email` |
| Year founded | | `site-config.json → business.founded` |
| Number of employees | | `site-config.json → business.employees` |
| License number(s) | | |
| Insurance carrier | | |
| Workers' comp? (Y/N) | | |
| BBB profile URL | | `site-config.json → business.bbbUrl` |
| Google Business Profile URL | | `site-config.json → social.google` |
| Owner name + title | | About page content |
| Owner bio (50-100 words, first person) | | About page content |

---

## 2. Brand
| Field | Answer | Maps To |
|-------|--------|---------|
| Logo files (PNG + SVG, light + dark) | | `src/assets/img/logo.png` |
| Primary brand color (hex) | | `site-config.json → brand.primaryColor` |
| Accent/secondary color (hex) | | `site-config.json → brand.accent` |
| Brand fonts (if any) | | `site-config.json → brand.fonts` |
| Tagline(s) | | `site-config.json → business.tagline` |
| Facebook URL | | `site-config.json → social.facebook` |
| Instagram URL | | `site-config.json → social.instagram` |
| Yelp URL | | `site-config.json → social.yelp` |
| Other social media | | `site-config.json → social` |

---

## 3. Services Offered
> List every service the business provides. Each becomes a page.

| # | Service Name | Short Description | Starting Price | Pricing Unit |
|---|-------------|-------------------|---------------|-------------|
| 1 | | | $ | |
| 2 | | | $ | |
| 3 | | | $ | |
| 4 | | | $ | |
| 5 | | | $ | |

For each service, also need:
- [ ] 2-3 FAQ questions + answers
- [ ] 3 customer pain points (frustrations that lead to hiring)
- [ ] How you solve those pain points (your differentiator)
- [ ] Related/complementary services

---

## 4. Service Areas (Cities)
> List every city/area you serve. Each becomes a city hub page + city×service matrix pages.

| # | City | State | Full Services? | If Limited, Which Services? | Travel Fee? |
|---|------|-------|---------------|---------------------------|------------|
| 1 | | | Y/N | | $ |
| 2 | | | Y/N | | $ |
| 3 | | | Y/N | | $ |
| 4 | | | Y/N | | $ |
| 5 | | | Y/N | | $ |

For each city, also helpful (but optional):
- Soil/terrain info
- Climate challenges
- Key neighborhoods
- Local context relevant to services

---

## 5. City × Service Availability Matrix
> For each city, check which services you actively offer there.

| City | Service 1 | Service 2 | Service 3 | Service 4 | Service 5 | Travel Fee |
|------|-----------|-----------|-----------|-----------|-----------|------------|
| | x | x | x | x | x | |
| | x | x | | | | $ |

---

## 6. Reviews & Trust
| Field | Answer | Maps To |
|-------|--------|---------|
| Google rating (e.g., 4.9) | | `site-config.json → business.rating` |
| Number of Google reviews | | `site-config.json → business.reviewCount` |
| Any awards or certifications? | | About page |
| BBB rating | | About page |

---

## 7. Tracking & Forms
| Field | Answer | Maps To |
|-------|--------|---------|
| Google Tag Manager ID | | `site-config.json → tracking.gtmId` |
| GA4 Measurement ID | | `site-config.json → tracking.ga4Id` |
| Google Ads ID | | `site-config.json → tracking.adsId` |
| Google Ads conversion label | | `site-config.json → tracking.adsConversionLabel` |
| Web3Forms access key | | `site-config.json → web3forms.accessKey` |
| Form submissions go to (email) | | Set in Web3Forms dashboard |

---

## 8. Content & Photos
- [ ] Owner/team headshot
- [ ] 3-5 best project photos (before/after if possible)
- [ ] Job site photos with location info (which city, which service)
- [ ] Equipment/truck photos
- [ ] Video testimonials or owner videos
- [ ] Drone footage
- [ ] Company story (100-200 words) — when started, why, mission
- [ ] Key differentiators (3 specific things, NOT generic "quality service")
- [ ] Preferred CTA language
- [ ] Response time for estimates
- [ ] Do you require contracts for recurring services?
- [ ] Emergency/after-hours service?
- [ ] Payment methods accepted
- [ ] Financing available?

---

## 9. Legal
- [ ] Privacy policy (use template or provide)
- [ ] Terms of service (use template or provide)
- [ ] TCPA consent language (required for web forms)

---

## Post-Onboarding Checklist
After filling this out:
1. Run `scripts/new-site.sh "Client Name"`
2. Drop logo into `src/assets/img/logo.png`
3. Drop photos into `public/img/`
4. Fill in `src/data/site-config.json`
5. Fill in `src/data/services.json`
6. Fill in `src/data/cities.json`
7. Fill in `src/data/copy.json`
8. Update `astro.config.mjs` with production URL
9. `npm run dev` to verify
10. `npm run build` to test
11. Push to GitHub → auto-deploys via GitHub Actions
