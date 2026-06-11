import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Tailwind's content watching drops the Liquid files from the watch set after
 * the first rebuild, so `vite build --watch` would stop reacting to class
 * changes in Liquid. Re-registering the theme's Liquid dirs every build keeps
 * the watcher honest. */
const watchThemeLiquid: Plugin = {
  name: 'watch-theme-liquid',
  buildStart() {
    for (const dir of ['layout', 'sections', 'snippets', 'blocks', 'templates']) {
      this.addWatchFile(path.resolve(dir));
    }
  }
};

export default defineConfig({
  plugins: [tailwindcss(), watchThemeLiquid],
  // Static theme files live directly in assets/ — no public/ copying.
  publicDir: false,
  build: {
    target: 'es2017',
    outDir: 'assets',
    // assets/ also holds Skeleton's static files — never wipe it
    emptyOutDir: false,
    // Shopify's CDN versions assets itself (asset_url appends ?v=), so content
    // hashes only churn git history. Unminified output is reviewer-friendly.
    minify: false,
    rollupOptions: {
      // Input keys are the output basenames layout/theme.liquid references.
      input: {
        theme: 'src/entrypoints/theme.ts',
        styles: 'src/entrypoints/styles.css'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    }
  },
  test: {
    environment: 'jsdom'
  }
});
