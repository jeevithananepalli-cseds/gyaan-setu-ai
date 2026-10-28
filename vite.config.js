import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
};

export default defineConfig({
  // Relative base so the build works both at a domain root and under a
  // GitHub Pages project path such as /gyaan-setu-ai/.
  base: "./",

  // Missing files must return 404, not index.html: the AI runtime probes for
  // optional model files and treats a 404 as "not present".
  appType: "mpa",

  // Cross-origin isolation lets the AI runtime use several CPU threads. In
  // production the service worker adds the same headers (see
  // withIsolationHeaders in src/sw/service-worker.js).
  server: { headers: ISOLATION_HEADERS },
  preview: { headers: ISOLATION_HEADERS },

  build: {
    outDir: "dist",
    emptyOutDir: true
  },

  // The AI worker is a module worker (it uses dynamic import).
  worker: {
    format: "es"
  },

  plugins: [
    VitePWA({
      // Keep the hand-written worker: it stitches the split model file and
      // manages the AI cache. The plugin only injects the list of built files.
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "service-worker.js",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,jpg,svg,woff2,webmanifest}", "images/lessons/image-manifest.json"],
        // The model and its runtime are cached on demand in their own cache.
        globIgnores: ["models/**", "vendor/**"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],

  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.js"]
  }
});
