# Deployment

The app is a folder of static files. `npm run build` writes it to `dist/`, and
any static host can serve that folder. The repository is set up for GitHub
Pages.

## Azure (live site)

The app is published on an Azure Storage static website:

**https://gyaansetu27772.z1.web.core.windows.net/**

| Setting | Value |
| --- | --- |
| Subscription | Azure for Students |
| Resource group | `gyaan-setu-rg` |
| Storage account | `gyaansetu27772` (Standard LRS, StorageV2) |
| Region | UAE North (Dubai) |
| Container | `$web` (static website hosting) |

Azure Static Web Apps was not used: it limits an app to 250 MB (free) or
500 MB (standard), and this build is about 512 MB because of the AI model and
voices. Blob static websites have no such limit.

The student subscription only allows these regions: polandcentral, eastasia,
indonesiacentral, uaenorth, indiasouthcentral.

**Why not India South Central (Hyderabad)?** It was tried first
(`gyaansetu76974`, since deleted). Its website address was in zone `z58`
(`*.z58.web.core.windows.net`), but Azure's HTTPS certificate for website
addresses only covers zones `z1` to `z50` (checked October 2026), so browsers
reject the site with a certificate error. Check the zone of a new account's
address before using it.

### Publishing an update

Sign in once with `az login`, then from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-azure.ps1
```

The script builds the app, uploads `dist/`, marks `index.html` and the
service worker as `no-cache` so learners pick up new versions, and fixes the
content types of `.wasm`, `.mjs`, `.webmanifest` and `.woff2` files. Add
`-SkipBuild` to upload the current `dist/` without rebuilding.

### Notes

- Blob static websites cannot send custom headers, so the page is not
  cross-origin isolated on a learner's first visit. The service worker adds
  the isolation headers from the second visit on, which lets the voices and
  the AI model use several CPU threads.
- Missing files return 404, as the AI runtime expects.
- Costs: storage is a few cents a month. Download traffic is billed above the
  free allowance; each learner who uses the AI model downloads about 300 MB,
  plus about 110 MB per voice.

## GitHub Pages

`.github/workflows/deploy.yml` builds the app and publishes `dist/` on every
push to `main` (and on demand from the Actions tab).

### One-time setup

The project used to be served straight from the repository root. It now has a
build step, so Pages must be told to use the workflow instead:

1. Open the repository on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Until this is changed, Pages keeps serving the repository root, where there is
no longer a working app.

### Checking a deploy

- The **Actions** tab shows the run; the deploy job prints the site URL.
- Open the site, wait a few seconds, then switch the device to airplane mode
  and reload. The app should still open.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm run lint`
2. `npm run validate:content`
3. `npm test`
4. `npm run build`
5. End-to-end tests (Playwright, Chromium) against the build

## The model and Git LFS

The model (`public/models/…/onnx/model_q4f16.onnx.part-aa`, `-ab`, `-ac`,
about 260 MB in total) is committed as ordinary files, not with Git LFS:

- GitHub rejects files over 100 MB, which is why the model is split into
  parts of 90 MB. The service worker joins them in the browser.
- GitHub Pages serves LFS pointer files, not the files themselves, unless the
  deploy fetches LFS content. Every CI and deploy run would then download the
  model, and the free LFS allowance (1 GB of bandwidth a month) covers only
  about four runs.

To replace the model, split the new file and commit the parts:

```bash
npm run split:model -- path/to/model_q4f16.onnx
```

The script prints the line to put in `SPLIT_FILES` in
`src/sw/service-worker.js`; update it if the number of parts changes.

The two bundled voices in `public/models/tts/` are stored the same way (two
parts each, about 109 MB per voice), but are joined by the voice worker
(`MODEL_PARTS` in `src/ai/tts.worker.js`), not the service worker.

The published site is now about 520 MB and must stay under GitHub Pages'
1 GB limit.

## Hosting somewhere else

Serve `dist/` from any static host. Requirements:

- **HTTPS** (or `localhost`). Service workers and the on-device model do not
  run on plain HTTP.
- **Missing files must return 404**, not the home page. The AI runtime checks
  for optional model files and expects a 404 when one is absent. Turn off any
  "single-page app" fallback.
- The build uses relative paths, so it works at a domain root or in a
  sub-folder with no configuration.

## What learners keep across deploys

- **Progress and accounts** are in the browser's `localStorage` and are not
  touched by a deploy.
- **The app shell** is re-downloaded automatically when any file changes.
- **The model** is kept; it is only downloaded once per device.

Learners get a new version the second time they open the app after a deploy:
the first visit downloads it in the background, the next one uses it.
