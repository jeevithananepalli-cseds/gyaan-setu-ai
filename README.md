# Gyaan Setu

An offline, multilingual learning app for school students (Classes 1–10) in
English, Telugu and Hindi. It installs as a PWA, keeps working with no
internet, and includes an assistant that answers questions from lesson
content, a built-in knowledge base and a small language model that runs
entirely on the device.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the address Vite prints (normally http://localhost:5173).

The dev server has no service worker, so offline mode is not active there. To
try the installable, offline-capable app, build it and preview the build:

```bash
npm run build
npm run preview
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the build |
| `npm run validate:content` | Check every lesson for missing text, images and quiz options |
| `npm run import:images` | Find and download images for lessons that have none |
| `npm run split:model -- <file>` | Split an ONNX model into the parts the app ships |
| `npm run format` | Format source with Prettier |

End-to-end tests need a browser. Either install Playwright's
(`npx playwright install chromium`) or use one already on the machine:

```bash
PW_CHANNEL=msedge npm run test:e2e
```

## Project layout

```
index.html              Page shell (Vite entry)
public/                 Copied to the build as-is, never bundled
  icons/, images/       App icons, logo, lesson images
  vendor/onnx/          Vendored transformers.js + ONNX runtime
  models/               The on-device model, stored in three parts
src/
  main.js               Startup
  config/               Storage keys, cache names, languages
  core/                 State, storage, DOM helpers, markup actions, navigation
  i18n/                 UI strings (locales/en.json, te.json, hi.json)
  features/             auth, onboarding, home, learn, quiz, progress, assistant
  ai/                   On-device model: page-side client, worker, prompts
  content/              Lessons, quizzes and the offline knowledge base
  styles/               CSS, imported in order by main.css
  sw/service-worker.js  Offline caching
scripts/                Content and model tooling
tests/unit, tests/e2e   Vitest and Playwright tests
docs/                   Architecture, content and deployment guides
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — how the page, service worker and AI worker fit together
- [Content guide](docs/CONTENT_GUIDE.md) — adding a class, chapter, lesson or quiz
- [Deployment](docs/DEPLOYMENT.md) — publishing to GitHub Pages
- [Changelog](CHANGELOG.md)

## Licence

No licence has been chosen yet. Until one is added, all rights are reserved by
the authors.
