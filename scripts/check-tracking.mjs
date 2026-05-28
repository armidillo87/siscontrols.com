import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');

console.log(`\n🔍 PFD E2E Tracking Integrity Checker: Auditing build folder at ${distDir}...`);

if (!fs.existsSync(distDir)) {
  console.error(`❌ ERROR: Build directory 'dist' not found. Please run 'npm run build' first.`);
  process.exit(1);
}

let totalTrackingErrors = 0;
let checkedFilesCount = 0;

// Recursive directory crawler
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

// Audit an individual HTML file for tracking
function auditHtmlTracking(filePath) {
  const relativePath = path.relative(distDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip redirect pages (e.g. Astro redirects)
  if (content.includes('http-equiv="refresh"') || content.includes('Redirecting to:')) {
    return;
  }

  const errors = [];

  // 1. Google Tag Manager (GTM) Container Ingestion Check
  const hasGtmHead = /www\.googletagmanager\.com\/gtm\.js\?id=GTM-/i.test(content) || /googletagmanager\.com\/gtm\.js/i.test(content);
  const hasGtmBody = /www\.googletagmanager\.com\/ns\.html\?id=GTM-/i.test(content);

  if (!hasGtmHead) {
    errors.push('GTM Ingestion: Missing Google Tag Manager script injection in <head>.');
  }
  if (!hasGtmBody) {
    errors.push('GTM Ingestion: Missing Google Tag Manager <noscript> iframe injection in <body>.');
  }

  // 2. Form Telemetry, Endpoints, & ID Integrity Checks
  const formTags = content.match(/<form\b[^>]*>([^]*?)<\/form>/gi) || [];
  
  formTags.forEach((form, idx) => {
    const formSnippet = form.match(/<form\b[^>]*>/i)?.[0] || '';
    
    // A. Endpoint validation: Ensure secure form handlers
    const actionMatch = formSnippet.match(/action=["']([^"']*)["']/i);
    const formAction = actionMatch ? actionMatch[1] : '';

    if (!formAction) {
      errors.push(`Form [${idx + 1}]: Missing form action handler.`);
    } else if (
      !formAction.includes('form-handler.brandon-c29.workers.dev') && 
      !formAction.includes('workers.dev') && 
      !formAction.includes('n8n') &&
      !formAction.startsWith('/') && // Local dynamic form routers are allowed
      formAction !== 'javascript:void(0);' && // JS-controlled forms are allowed
      formAction !== 'return false;'
    ) {
      errors.push(`Form [${idx + 1}]: Action points to non-agency or unverified endpoint: "${formAction}"`);
    }

    // B. Interactive Input Descriptive Unique IDs
    // Find all <input>, <textarea>, and <button> elements inside the form
    const inputs = form.match(/<(input|textarea|select|button)\b[^>]*>/gi) || [];
    inputs.forEach((input) => {
      // Skip hidden botcheck/honeypot or GTM hidden fields that don't require public labels
      const isHoneypot = /name=["'](botcheck|honeypot)["']/i.test(input) || /type=["']hidden["']/i.test(input);
      if (isHoneypot) return;

      const hasId = /id=["']([^"']+)["']/i.test(input);
      if (!hasId) {
        errors.push(`Form [${idx + 1}]: Input/Interactive tag missing descriptive "id" attribute: "${input.substring(0, 80)}..."`);
      } else {
        const idVal = input.match(/id=["']([^"']+)["']/i)?.[1]?.trim();
        if (!idVal || idVal.toLowerCase() === 'input' || idVal.toLowerCase() === 'field') {
          errors.push(`Form [${idx + 1}]: Generic or empty input "id" found: "${idVal}" in tag "${input.substring(0, 50)}..."`);
        }
      }
    });

    // C. UTM / GCLID Lead Capture Readiness (For Local Lead Forms)
    const isFeedbackFunnel = /sbk-reputation-funnel|reputation-funnel|feedback/i.test(formSnippet) || /review/i.test(relativePath);
    if (!isFeedbackFunnel) {
      const hasUtmSource = /name=["']utm_source["']/i.test(form) || /data-tracking-utm/i.test(form);
      const hasUtmMedium = /name=["']utm_medium["']/i.test(form) || /data-tracking-utm/i.test(form);
      
      if (!hasUtmSource || !hasUtmMedium) {
        // Warn if local marketing lead forms are missing tracking inputs
        console.log(`⚠️  Tracking Alert in [${relativePath}]: Form appears to lack explicit UTM campaign parameter mappings.`);
      }
    }
  });

  if (errors.length > 0) {
    console.error(`\n🚨 TELEMETRY FAILURE in [${relativePath}]:`);
    errors.forEach(err => console.error(`   - ${err}`));
    totalTrackingErrors += errors.length;
  }
  checkedFilesCount++;
}

// Crawl directory
walkDir(distDir, (filePath) => {
  if (filePath.endsWith('.html')) {
    auditHtmlTracking(filePath);
  }
});

console.log(`\n🏁 E2E Tracking Checker Sweep Completed.`);
console.log(`📈 Audited ${checkedFilesCount} HTML files.`);

if (totalTrackingErrors > 0) {
  console.error(`\n❌ TELEMETRY COMPLIANCE FAILED: ${totalTrackingErrors} errors found. Build aborted.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ TELEMETRY COMPLIANCE PASSED: All tracking integrations verified.\n`);
  process.exit(0);
}
