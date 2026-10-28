import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "public/**", "playwright-report/**", "test-results/**"]
  },

  js.configs.recommended,

  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser
    },
    rules: {
      // The views were split out of one large script and still carry a few
      // unused locals; report them without failing the build.
      "no-unused-vars": "warn"
    }
  },

  {
    files: ["src/sw/**/*.js"],
    languageOptions: {
      globals: globals.serviceworker
    }
  },

  {
    files: ["src/ai/*.worker.js"],
    languageOptions: {
      globals: globals.worker
    }
  },

  {
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    }
  },

  {
    // Unit tests run in jsdom; end-to-end tests pass functions into the page.
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser }
    }
  }
];
