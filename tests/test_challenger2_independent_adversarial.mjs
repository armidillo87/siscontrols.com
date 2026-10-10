import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

// Load rfq-wizard.js in isolated sandbox
const rfqCode = fs.readFileSync(path.join(WORKSPACE_ROOT, 'assets/js/rfq-wizard.js'), 'utf-8');

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, parentElement: null, appendChild: ()=>{} })
  }
};

const fn = new Function('window', 'document', rfqCode);
fn(sandbox.window, sandbox.document);
const SawtoothRFQ = sandbox.window.SawtoothRFQ;

let passed = 0;
let failed = 0;

function assert(cond, msg, meta = {}) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${msg}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${msg}`, meta);
  }
}

console.log('\n================================================================');
console.log('  CHALLENGER 2 INDEPENDENT ADVERSARIAL STRESS TEST');
console.log('================================================================\n');

// 1. Email Regex Deep Adversarial Matrix
console.log('\x1b[36m--- TEST 1: EMAIL REGEX ADVERSARIAL MATRIX ---\x1b[0m');
const emailRegex = SawtoothRFQ.EMAIL_REGEX;
assert(emailRegex instanceof RegExp, 'EMAIL_REGEX is properly exported on window.SawtoothRFQ');

const strictlyInvalid = [
  'user@domain..com',         // consecutive dots in domain
  'user..name@domain.com',    // consecutive dots in local part
  '.user@domain.com',         // leading dot in local part
  'user.@domain.com',         // trailing dot in local part
  'user@.domain.com',         // leading dot in domain
  'user@domain.com.',         // trailing dot in domain
  'user@domain..co.uk',       // consecutive dots in multi-tier domain
  'user@-domain.com',         // leading hyphen in domain
  'user@domain-.com',         // trailing hyphen before dot in domain
  'user@domain.c',            // 1-char TLD
  'user@domain.123',          // numeric TLD
  'user@domain',              // no TLD
  'user@',                    // no domain
  '@domain.com',              // no local part
  'user name@domain.com',     // space in local
  'user@dom ain.com',         // space in domain
  'user@domain.com ',         // trailing space
  ' user@domain.com',         // leading space
  'user\n@domain.com',        // newline injection
  '<script>@domain.com',      // XSS characters
  'user@domain.c_m',          // underscore in TLD
];

strictlyInvalid.forEach(email => {
  const isMatch = emailRegex.test(email);
  assert(!isMatch, `Strictly invalid email rejected: "${email}"`, { email, isMatch });
});

const strictlyValid = [
  'john.doe@siscontrols.com',
  'j.d.oe@facility.co.uk',
  'eng_team@sub-domain.datacenter.org',
  'lead+rfq%priority@bechtel-turner.com',
  'sales@a.bb',
  'user.123@sub42.domain.cloud',
  'valid-email@company-domain.net',
];

strictlyValid.forEach(email => {
  const isMatch = emailRegex.test(email);
  assert(isMatch, `Valid business email accepted: "${email}"`, { email, isMatch });
});

// 2. 50MB File Size Boundary & Upload Rejection Engine
console.log('\n\x1b[36m--- TEST 2: FILE UPLOAD 50MB CEILING & EXTENSION GATING ---\x1b[0m');

// Create mock wizard instance to inspect handleFiles & validateCurrentStep
const mockDOM = {
  listeners: {},
  elements: {},
  classes: new Set(),
  innerHTML: ''
};

function createMockElement(tag, attrs = {}) {
  const classes = new Set();
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    parentElement: null,
    children,
    appendChild: (ch) => { ch.parentElement = el; children.push(ch); },
    remove: () => {
      if (el.parentElement) {
        const idx = el.parentElement.children.indexOf(el);
        if (idx >= 0) el.parentElement.children.splice(idx, 1);
      }
    },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  Object.assign(el, attrs);
  return el;
}

const mockContainer = {
  addEventListener: () => {},
  querySelector: (sel) => {
    if (sel.includes('contact-name')) return { value: 'Test Engineer', classList: { add: ()=>{}, remove: ()=>{} }, parentElement: { appendChild: ()=>{}, querySelector: () => null } };
    if (sel.includes('contact-company')) return { value: 'Test Corp', classList: { add: ()=>{}, remove: ()=>{} }, parentElement: { appendChild: ()=>{}, querySelector: () => null } };
    if (sel.includes('contact-email')) return { value: 'test@siscontrols.com', classList: { add: ()=>{}, remove: ()=>{} }, parentElement: { appendChild: ()=>{}, querySelector: () => null } };
    if (sel.includes('contact-phone')) return { value: '208-555-1234', classList: { add: ()=>{}, remove: ()=>{} }, parentElement: { appendChild: ()=>{}, querySelector: () => null } };
    if (sel.includes('#uploaded-file-list')) return { innerHTML: '', querySelectorAll: () => [] };
    return null;
  },
  querySelectorAll: () => [],
  scrollIntoView: () => {}
};

const wizard = new SawtoothRFQ.RfqWizard(mockContainer);

// Test handleFiles with 50MB boundary
const listEl = { innerHTML: '', querySelectorAll: () => [] };

const filesToTest = [
  { name: 'valid_exact_50mb.dwg', size: 50 * 1024 * 1024 }, // exactly 50MB = valid
  { name: 'invalid_50mb_plus_1byte.dwg', size: (50 * 1024 * 1024) + 1 }, // 50MB + 1 byte = invalid
  { name: 'invalid_huge_100mb.pdf', size: 100 * 1024 * 1024 }, // 100MB = invalid
  { name: 'invalid_ext.exe', size: 1024 }, // invalid extension = invalid
  { name: 'valid_cad.step', size: 10 * 1024 * 1024 } // 10MB STEP = valid
];

wizard.formData.uploadedFiles = [];
wizard.handleFiles(filesToTest, listEl);

assert(wizard.formData.uploadedFiles.length === 5, 'All 5 files processed into queue');
const [fExact, fPlusOne, fHuge, fExe, fStep] = wizard.formData.uploadedFiles;

assert(fExact.valid === true, 'File at exact 50MB boundary (52,428,800 bytes) is valid', { file: fExact });
assert(fPlusOne.valid === false, 'File at 50MB + 1 byte is REJECTED', { file: fPlusOne });
assert(fPlusOne.error.includes('Exceeds 50MB limit'), 'Error specifies exceeding 50MB limit', { error: fPlusOne.error });
assert(fHuge.valid === false, '100MB file is REJECTED', { file: fHuge });
assert(fExe.valid === false, 'Executable (.exe) file is REJECTED', { file: fExe });
assert(fExe.error.includes('Unsupported format (.exe)'), 'Error specifies unsupported format (.exe)', { error: fExe.error });
assert(fStep.valid === true, '10MB STEP model is valid', { file: fStep });

// Step 5 Validation Gate with Rejected Files
wizard.currentStep = 5;
let step5Result = wizard.validateCurrentStep();
assert(step5Result === false, 'validateCurrentStep() BLOCKS submission when rejected files exist in upload queue');

// Remove rejected files from queue
wizard.formData.uploadedFiles = wizard.formData.uploadedFiles.filter(f => f.valid);
assert(wizard.formData.uploadedFiles.length === 2, 'Only 2 valid files remain after cleaning');

step5Result = wizard.validateCurrentStep();
assert(step5Result === true, 'validateCurrentStep() SUCCEEDS when only valid files exist in queue');

console.log('\n================================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
