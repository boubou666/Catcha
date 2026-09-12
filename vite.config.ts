/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Short git hash of the build, or 'dev' outside a checkout. Stamped into the app and the service worker. */
function buildVersion(): string {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'dev'; }
}
const VERSION = buildVersion();
const BUILT_AT = new Date().toISOString();

/** Emits sw.js from src/sw.js with the version stamped in, so every deploy changes the worker byte-for-byte. */
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    generateBundle() {
      const src = readFileSync(join(import.meta.dirname, 'src', 'sw.js'), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src.replaceAll('__VERSION__', VERSION) });
    },
  };
}

export default defineConfig({
  base: './',            // relative: works at https://<user>.github.io/Catcha/ and locally
  plugins: [svelte(), stampServiceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
