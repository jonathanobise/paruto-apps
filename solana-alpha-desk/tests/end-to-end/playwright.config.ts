import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const PORT = 8799;
const chrome =
  process.env.PW_CHROMIUM ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.e2e\.ts$/,
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: chrome ? { executablePath: chrome } : {},
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `rm -rf data/e2e && DATABASE_PATH=data/e2e/e2e.sqlite EVIDENCE_DIR=data/e2e/evidence SETUP_TOKEN=e2e-setup-token-0123456789abcdef PORT=${PORT} npx tsx apps/api/src/node.ts`,
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/api/v1/auth/status`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
