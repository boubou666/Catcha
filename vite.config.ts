/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',            // relative: works at https://<user>.github.io/Catcha/ and locally
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
