import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const sentinelScript = '/home/francis/antigravity-workspace/Pandaface-Digital-Hub/scripts/pfd-browser-truth-sentinel.py';
const distDir = path.resolve(process.cwd(), 'dist');

if (process.env.CF_PAGES === '1' || !fs.existsSync(sentinelScript)) {
  console.log('ℹ️ [Browser Sentinel] Remote CI/Cloudflare Pages environment detected — skipping local Chromium check.');
  process.exit(0);
}

console.log('🌐 [Browser Sentinel] Launching Headless Chromium WCAG Contrast, Geometry & Anti-Slop Audit...');
try {
  execFileSync('python3', [sentinelScript, '--dist', distDir, '--max-pages', '10'], {
    stdio: 'inherit',
  });
} catch (err) {
  console.error('❌ [Browser Sentinel] Real-browser verification FAILED. Fix contrast/layout/copy errors before deploying.');
  process.exit(1);
}
