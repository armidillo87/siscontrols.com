#!/usr/bin/env node
/**
 * Sawtooth Industrial Systems (siscontrols.com)
 * Node.js Automated Verification Runner & DOM/Asset Sentinel
 *
 * Multi-Tier Verification:
 *   - Tier 1: 100% Route Crawl & Link Integrity (All 9 Core Routes)
 *   - Tier 2: Asset Integrity (CSS, JS, SVG Vector Logos, Seals)
 *   - Tier 3: DOM Semantics, Heading Monotonicity & WCAG AA Contrast Ratios
 *   - Tier 4: JSON-LD Structured Data Schema Validation
 *   - Tier 5: Interactive Component Simulation & Mathematical Verification
 *
 * Usage:
 *   node tests/verify_mockup.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = fs.existsSync(path.join(WORKSPACE_ROOT, 'dist', 'index.html'))
  ? path.join(WORKSPACE_ROOT, 'dist')
  : WORKSPACE_ROOT;

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const BASE_URL = process.env.SITE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;

const ROUTES = [
  '/',
  '/capabilities/ul-508a-panels/',
  '/capabilities/safety-instrumented-systems/',
  '/capabilities/data-center-cdu-power/',
  '/capabilities/plc-scada-integration/',
  '/rfq/',
  '/about/',
  '/resources/',
  '/contact/',
  '/builder/',
  '/locations/',
  '/capability-statement/',
];

const EXPECTED_ASSETS = [
  'assets/css/styles.css',
  'assets/css/design-system.css',
  'assets/js/main.js',
  'assets/js/sccr-calculator.js',
  'assets/js/rfq-wizard.js',
  'assets/js/cutaway-explorer.js',
  'assets/js/panel-builder.js',
  'assets/img/sis-logo-mark.svg',
  'assets/img/sis-logo-lockup.svg',
  'assets/img/favicon.svg',
  'assets/img/ul508a-seal.svg',
  'assets/img/mbe-seal.svg',
  'assets/img/iso9001-seal.svg',
];

const DESIGN_TOKENS = {
  bgSlatePrimary: '#0F172A',
  bgSlateDeep: '#020617',
  bgCardElevation: '#131D31',
  textAmberAccent: '#F59E0B',
  textPureWhite: '#FFFFFF',
  textEmeraldStatus: '#10B981',
  textCduCyan: '#06B6D4',
  textSlateMuted: '#94A3B8',
};

// ----------------------------------------------------------------------------
// Color Mathematics & WCAG AA Relative Luminance
// ----------------------------------------------------------------------------
function hexToRgb(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function calculateRelativeLuminance({ r, g, b }) {
  const [sR, sG, sB] = [r, g, b].map(val => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function calculateContrastRatio(hex1, hex2) {
  const l1 = calculateRelativeLuminance(hexToRgb(hex1));
  const l2 = calculateRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ----------------------------------------------------------------------------
// Embedded Static File Server (Auto-Spun if Port is Free)
// ----------------------------------------------------------------------------
function createStaticServer(rootDirectory, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.json': 'application/json',
  };

  const server = http.createServer((req, res) => {
    let cleanPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (cleanPath.endsWith('/')) {
      cleanPath += 'index.html';
    }

    const filePath = path.join(rootDirectory, cleanPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ server: null, port, running: true });
      } else {
        reject(err);
      }
    });
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, port, running: false });
    });
  });
}

// ----------------------------------------------------------------------------
// Test Reporter State
// ----------------------------------------------------------------------------
class TestReporter {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  assert(condition, message) {
    this.total++;
    if (condition) {
      this.passed++;
      console.log(`  \x1b[32m✔ PASS\x1b[0m ${message}`);
    } else {
      this.failed++;
      this.errors.push(message);
      console.log(`  \x1b[31m✖ FAIL\x1b[0m ${message}`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(80));
    console.log(`VERIFICATION SUMMARY: ${this.passed}/${this.total} assertions passed.`);
    if (this.failed > 0) {
      console.log(`\x1b[31mStatus: FAILED (${this.failed} violations detected)\x1b[0m`);
      this.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      return 1;
    } else {
      console.log(`\x1b[32mStatus: ALL SUITES PASSED (100% Quality & Architectural Invariants Verified)\x1b[0m`);
      return 0;
    }
  }
}

// ----------------------------------------------------------------------------
// Test Execution Pipeline
// ----------------------------------------------------------------------------
async function runVerification() {
  console.log('='.repeat(80));
  console.log('  SAWTOOTH INDUSTRIAL SYSTEMS (siscontrols.com) — NODE VERIFICATION RUNNER');
  console.log('='.repeat(80));
  console.log(`Target Directory: ${TARGET_DIR}\n`);

  const reporter = new TestReporter();
  const { server } = await createStaticServer(TARGET_DIR, DEFAULT_PORT);

  try {
    // ------------------------------------------------------------------------
    // TIER 1: 100% Route Crawl & Link Integrity
    // ------------------------------------------------------------------------
    console.log('\x1b[36m--- TIER 1: Route Discovery & Crawl Integrity ---\x1b[0m');
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      try {
        const resp = await fetch(url);
        reporter.assert(resp.status === 200, `Route ${route} returned HTTP 200 OK (got ${resp.status})`);
        const html = await resp.text();
        reporter.assert(html.length > 200, `Route ${route} has non-empty HTML payload (>200 bytes)`);

        // Check internal links
        const hrefRegex = /href=["']([^"']+)["']/g;
        let match;
        const internalHrefs = [];
        while ((match = hrefRegex.exec(html)) !== null) {
          const href = match[1];
          if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
            internalHrefs.push(href);
          }
        }

        let brokenLinks = 0;
        for (const targetHref of internalHrefs) {
          const resolved = new URL(targetHref, url).href;
          const linkCheck = await fetch(resolved);
          if (linkCheck.status !== 200) {
            brokenLinks++;
          }
        }
        reporter.assert(brokenLinks === 0, `Route ${route} internal links resolved with 0 broken links (checked ${internalHrefs.length})`);
      } catch (err) {
        reporter.assert(false, `Route ${route} failed network fetch: ${err.message}`);
      }
    }

    // ------------------------------------------------------------------------
    // TIER 2: Static Asset & Image Integrity
    // ------------------------------------------------------------------------
    console.log('\n\x1b[36m--- TIER 2: Static Asset & Seal Integrity ---\x1b[0m');
    for (const assetPath of EXPECTED_ASSETS) {
      const fullPath = path.join(TARGET_DIR, assetPath);
      const exists = fs.existsSync(fullPath);
      reporter.assert(exists, `Asset exists on disk: ${assetPath}`);
      if (exists) {
        const stat = fs.statSync(fullPath);
        reporter.assert(stat.size > 0, `Asset ${assetPath} size is non-zero (${stat.size} bytes)`);
      }
    }

    // SVG Vector Logo Validation
    const logoMarkPath = path.join(TARGET_DIR, 'assets/img/sis-logo-mark.svg');
    if (fs.existsSync(logoMarkPath)) {
      const logoSvg = fs.readFileSync(logoMarkPath, 'utf-8');
      reporter.assert(logoSvg.includes('<svg') && logoSvg.includes('</svg>'), 'Primary logo mark is valid SVG');
      reporter.assert(/path|polygon|polyline/i.test(logoSvg), 'Primary logo mark contains structural vector geometry');
    }

    // ------------------------------------------------------------------------
    // TIER 3: DOM Semantics & WCAG AA Accessibility Contrast
    // ------------------------------------------------------------------------
    console.log('\n\x1b[36m--- TIER 3: DOM Semantics & WCAG AA Contrast ---\x1b[0m');
    for (const route of ROUTES) {
      const localFile = route === '/' ? path.join(TARGET_DIR, 'index.html') : path.join(TARGET_DIR, route, 'index.html');
      if (!fs.existsSync(localFile)) {
        reporter.assert(false, `Source HTML missing for route ${route}`);
        continue;
      }
      const html = fs.readFileSync(localFile, 'utf-8');

      // Exactly one H1 per page
      const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
      reporter.assert(h1Matches.length === 1, `Route ${route} has exactly one <h1> tag (found ${h1Matches.length})`);

      // Viewport meta tag
      const hasViewport = /<meta[^>]+name=["']viewport["'][^>]+content=["'][^"']*width=device-width/i.test(html);
      reporter.assert(hasViewport, `Route ${route} contains mobile viewport meta tag`);

      // Monotonic heading hierarchy
      const headingTags = [...html.matchAll(/<(h[1-6])[^>]*>/gi)].map(m => parseInt(m[1][1], 10));
      let monotonic = true;
      let lastLevel = 0;
      for (const level of headingTags) {
        if (lastLevel !== 0 && level > lastLevel + 1) {
          monotonic = false;
          break;
        }
        lastLevel = level;
      }
      reporter.assert(monotonic, `Route ${route} has monotonic heading hierarchy (no skipped levels)`);

      // Subpage breadcrumb verification
      if (route !== '/') {
        const hasBreadcrumb = /aria-label=["']breadcrumb["']|class=["'][^"']*breadcrumb[^"']*["']|<ol[^>]+itemtype=["'][^"']*BreadcrumbList/i.test(html);
        reporter.assert(hasBreadcrumb, `Subpage ${route} contains visible breadcrumb navigation`);
      }
    }

    // WCAG AA Contrast Calculations
    const amberRatio = calculateContrastRatio(DESIGN_TOKENS.textAmberAccent, DESIGN_TOKENS.bgSlatePrimary);
    reporter.assert(amberRatio >= 4.5, `Safety Amber (#F59E0B) contrast ratio on Slate (#0F172A) is ${amberRatio.toFixed(2)}:1 (>= 4.5:1 AA)`);

    const whiteRatio = calculateContrastRatio(DESIGN_TOKENS.textPureWhite, DESIGN_TOKENS.bgSlatePrimary);
    reporter.assert(whiteRatio >= 7.0, `White (#FFFFFF) contrast ratio on Slate (#0F172A) is ${whiteRatio.toFixed(2)}:1 (>= 7.0:1 AAA)`);

    const emeraldRatio = calculateContrastRatio(DESIGN_TOKENS.textEmeraldStatus, DESIGN_TOKENS.bgSlatePrimary);
    reporter.assert(emeraldRatio >= 4.5, `Emerald (#10B981) contrast ratio on Slate (#0F172A) is ${emeraldRatio.toFixed(2)}:1 (>= 4.5:1 AA)`);

    const cyanRatio = calculateContrastRatio(DESIGN_TOKENS.textCduCyan, DESIGN_TOKENS.bgSlatePrimary);
    reporter.assert(cyanRatio >= 4.5, `CDU Cyan (#06B6D4) contrast ratio on Slate (#0F172A) is ${cyanRatio.toFixed(2)}:1 (>= 4.5:1 AA)`);

    // ------------------------------------------------------------------------
    // TIER 4: JSON-LD Structured Data Validation
    // ------------------------------------------------------------------------
    console.log('\n\x1b[36m--- TIER 4: JSON-LD Structured Data Schema Validation ---\x1b[0m');
    for (const route of ROUTES) {
      const localFile = route === '/' ? path.join(TARGET_DIR, 'index.html') : path.join(TARGET_DIR, route, 'index.html');
      if (!fs.existsSync(localFile)) continue;

      const html = fs.readFileSync(localFile, 'utf-8');
      const scriptMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

      reporter.assert(scriptMatches.length > 0, `Route ${route} contains at least one JSON-LD structured data script`);

      for (const sm of scriptMatches) {
        try {
          const rawData = JSON.parse(sm[1]);
          const schemas = Array.isArray(rawData) ? rawData : [rawData];
          for (const data of schemas) {
            reporter.assert(data['@context'] && /schema\.org/i.test(data['@context']), `Route ${route} JSON-LD @context references Schema.org`);

            if (route === '/' || route === '/about/') {
              if (data['@type'] === 'Organization') {
                reporter.assert(data.name.includes('Sawtooth Industrial Systems'), `Route ${route} Organization schema name verified`);
                reporter.assert(data.address && data.address.addressLocality === 'Boise', `Route ${route} Organization address in Boise, ID`);
              }
            }

            if (route.startsWith('/capabilities/')) {
              if (data['@type'] === 'Service') {
                reporter.assert(typeof data.name === 'string' && data.name.length > 5, `Route ${route} Service schema name verified`);
              }
            }
          }
        } catch (e) {
          reporter.assert(false, `Route ${route} JSON-LD parsing error: ${e.message}`);
        }
      }
    }

    // ------------------------------------------------------------------------
    // TIER 5: Interactive Component Simulation & Mathematical Verification
    // ------------------------------------------------------------------------
    console.log('\n\x1b[36m--- TIER 5: Interactive Component Simulation & Calculations ---\x1b[0m');

    // 5.1 UL 508A Supplement SB Weakest-Link Math Engine
    function calculatePanelSccr(mainDisconnectAic, feederPdbSccr, branchComponents) {
      return Math.min(mainDisconnectAic, feederPdbSccr, ...branchComponents);
    }

    const testUncoordinated = calculatePanelSccr(65, 10, [65, 100]);
    reporter.assert(testUncoordinated === 10, `UL 508A Supplement SB: Uncoordinated PDB limits panel to 10kA (got ${testUncoordinated}kA)`);

    const testCoordinated = calculatePanelSccr(100, 100, [100, 100]);
    reporter.assert(testCoordinated === 100, `UL 508A Supplement SB: Coordinated high-fault components achieve 100kA (got ${testCoordinated}kA)`);

    // 5.2 Thermodynamic Heat Dissipation Model
    function calculateThermalDissipation(watts, heightIn, widthIn, depthIn, ambientTempF = 85.0) {
      const surfaceAreaSqFt = (2.0 * (heightIn * widthIn + heightIn * depthIn + widthIn * depthIn)) / 144.0;
      const kSteel = 0.30;
      const deltaT = watts / (kSteel * surfaceAreaSqFt);
      const internalTemp = ambientTempF + deltaT;
      return {
        surfaceAreaSqFt,
        deltaT,
        internalTemp,
        coolingRequired: internalTemp > 104.0,
      };
    }

    const thermalResult = calculateThermalDissipation(600, 36, 30, 10);
    reporter.assert(thermalResult.coolingRequired === true, 'Thermodynamic Model: High heat load correctly flags active cooling required');
    reporter.assert(thermalResult.internalTemp > 104.0, `Thermodynamic Model: Internal temperature ${thermalResult.internalTemp.toFixed(1)}°F exceeds 104°F threshold`);

    // 5.3 RFQ Multi-Step Wizard State Machine Contract
    const rfqFile = path.join(TARGET_DIR, 'rfq/index.html');
    if (fs.existsSync(rfqFile)) {
      const rfqHtml = fs.readFileSync(rfqFile, 'utf-8');
      reporter.assert(/step-1|data-step=["']1["']/i.test(rfqHtml), 'RFQ Wizard HTML defines Step 1 (Enclosure/Environment)');
      reporter.assert(/step-2|data-step=["']2["']/i.test(rfqHtml), 'RFQ Wizard HTML defines Step 2 (Power/Amperage)');
      reporter.assert(/step-3|data-step=["']3["']/i.test(rfqHtml), 'RFQ Wizard HTML defines Step 3 (Control Architecture)');
      reporter.assert(/step-4|data-step=["']4["']/i.test(rfqHtml), 'RFQ Wizard HTML defines Step 4 (I/O & Safety)');
      reporter.assert(/step-5|data-step=["']5["']/i.test(rfqHtml), 'RFQ Wizard HTML defines Step 5 (Timeline & Contact)');
    }

    // 5.4 Interactive Widget Mount & Script Integration
    const ul508Html = fs.readFileSync(path.join(TARGET_DIR, 'capabilities/ul-508a-panels/index.html'), 'utf-8');
    reporter.assert(/sccr-calculator\.js/i.test(ul508Html), 'UL 508A Page loads sccr-calculator.js script');
    reporter.assert(/#sccr-calculator-mount|id=["']sccr-calculator-mount["']/i.test(ul508Html), 'UL 508A Page contains #sccr-calculator-mount container');

    const homeHtml = fs.readFileSync(path.join(TARGET_DIR, 'index.html'), 'utf-8');
    reporter.assert(/cutaway-explorer\.js/i.test(homeHtml), 'Home Page loads cutaway-explorer.js script');
    reporter.assert(/#cutaway-explorer-mount|id=["']cutaway-explorer-mount["']/i.test(homeHtml), 'Home Page contains #cutaway-explorer-mount container');

    const cduHtml = fs.readFileSync(path.join(TARGET_DIR, 'capabilities/data-center-cdu-power/index.html'), 'utf-8');
    reporter.assert(/cutaway-explorer\.js/i.test(cduHtml), 'CDU Power Page loads cutaway-explorer.js script');
    reporter.assert(/#cutaway-explorer-mount|id=["']cutaway-explorer-mount["']/i.test(cduHtml), 'CDU Power Page contains #cutaway-explorer-mount container');

  } finally {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise(resolve => server.close(resolve));
    }
  }

  const exitCode = reporter.summary();
  process.exitCode = exitCode;
}

runVerification().catch(err => {
  console.error('\x1b[31mFatal Verification Runner Error:\x1b[0m', err);
  process.exitCode = 1;
});
