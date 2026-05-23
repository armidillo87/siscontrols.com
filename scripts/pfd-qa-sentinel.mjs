import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Direct execution or import check
const distDir = path.resolve(process.cwd(), 'dist');

console.log(`🔍 PFD Build QA Sentinel: Checking build directory at ${distDir}...`);

if (!fs.existsSync(distDir)) {
  console.error(`❌ ERROR: Build directory 'dist' not found. Please run 'npm run build' first.`);
  process.exit(1);
}

// Banned words from Rule 17 (Copy Governance)
const BANNED_WORDS = [
  'unlock',
  'leverage',
  'harness',
  'revolution',
  'revolutionary',
  'pave the way',
  'testament'
];

const PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_$.?.[\]'"-]+\}/g;

let totalErrors = 0;
let checkedFiles = 0;

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

// Strip out structural blocks to prevent false-positives in JS/CSS/SVGs
function stripContent(html) {
  // Strip script, style, pre, and svg blocks
  let stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '');
  return stripped;
}

// Check an individual HTML file
function checkHtmlFile(filePath) {
  const relativePath = path.relative(distDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip redirect pages (e.g. Astro redirects)
  if (content.includes('http-equiv="refresh"') || content.includes('Redirecting to:')) {
    return;
  }

  const stripped = stripContent(content);

  const errors = [];

  // 1. Unresolved template placeholders
  let match;
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(stripped)) !== null) {
    errors.push(`Unresolved placeholder: "${match[0]}"`);
  }

  // 2. Rule 17: Em dashes
  if (stripped.includes('—')) {
    errors.push(`Rule 17 Violation: Em dash (—) found. Must convert to " - "`);
  }

  // 3. Rule 17: Banned words
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(stripped)) {
      errors.push(`Rule 17 Violation: Banned copywriting word "${word}" found.`);
    }
  });

  // 4. SEO: Title tag
  const titleMatch = content.match(/<title>([^]*?)<\/title>/i);
  if (!titleMatch) {
    errors.push('Missing <title> tag.');
  } else {
    const titleVal = titleMatch[1].trim();
    if (!titleVal) {
      errors.push('Empty <title> tag.');
    } else if (titleVal.toLowerCase().includes('placeholder') || titleVal.toLowerCase().includes('astro')) {
      errors.push(`Title appears to be a placeholder or default: "${titleVal}"`);
    }
  }

  // 5. SEO: Meta Description
  const metaDescMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^]*?)["']/i) || 
                       content.match(/<meta\s+content=["']([^]*?)["']\s+name=["']description["']/i);
  if (!metaDescMatch) {
    errors.push('Missing <meta name="description" content="..." /> tag.');
  } else {
    const descVal = metaDescMatch[1].trim();
    if (!descVal) {
      errors.push('Empty meta description content.');
    } else if (descVal.toLowerCase().includes('placeholder') || descVal.toLowerCase().includes('astro')) {
      errors.push(`Meta description appears to be a placeholder or default: "${descVal}"`);
    }
  }

  // 6. Image Alts
  // Find all <img> tags and verify alt attribute
  const imgTags = content.match(/<img\b[^>]*>/gi) || [];
  imgTags.forEach((img, idx) => {
    // Check if alt is missing or empty
    const hasAlt = /alt=/i.test(img);
    if (!hasAlt) {
      errors.push(`Image missing alt attribute: "${img.substring(0, 80)}..."`);
    } else {
      const altMatch = img.match(/alt=["']([^]*?)["']/i);
      if (!altMatch || !altMatch[1].trim()) {
        errors.push(`Image has empty or missing alt text: "${img.substring(0, 80)}..."`);
      } else {
        const altText = altMatch[1].trim();
        if (altText.toLowerCase().includes('placeholder') || altText.toLowerCase().includes('image')) {
          errors.push(`Image has generic placeholder alt text: "${altText}" in image "${img.substring(0, 50)}..."`);
        }
      }
    }
  });

  if (errors.length > 0) {
    console.error(`\n🚨 COMPLIANCE FAILURE in [${relativePath}]:`);
    errors.forEach(err => console.error(`   - ${err}`));
    totalErrors += errors.length;
  }
  checkedFiles++;
}

// Run sentinel sweep
console.log(`🔄 Scanning for compiled HTML files...`);
let hasReviewPage = false;

walkDir(distDir, (filePath) => {
  if (filePath.endsWith('.html')) {
    checkHtmlFile(filePath);
    // Track if a review funnel page exists (either review.html or review/index.html)
    const rel = path.relative(distDir, filePath).replace(/\\/g, '/');
    if (rel === 'review.html' || rel === 'review/index.html') {
      hasReviewPage = true;
    }
  }
});

// Verify Star-Gated Review Funnel page (mandatory for local service sites)
// We'll read vertical from the project's strategy to determine if it is a local-service site, 
// or verify if we should warn/error. Let's warn or throw error if missing.
if (!hasReviewPage) {
  console.log(`\n⚠️ WARNING: No star-gated review page (/review) found in built site output. Ensure it is deployed if this is a local-service client site.`);
}

console.log(`\n🏁 Sentinel Sweep Completed.`);
console.log(`📈 Checked ${checkedFiles} HTML files.`);

if (totalErrors > 0) {
  console.error(`\n❌ BUILD COMPLIANCE FAILED: ${totalErrors} compliance errors found. Build aborted.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ BUILD COMPLIANCE PASSED: All checks passed. Ready for deployment.\n`);
  process.exit(0);
}
