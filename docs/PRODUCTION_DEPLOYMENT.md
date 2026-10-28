# Production deployment (Cloudflare Pages + R2)

Step-by-step guide to putting Gyaan Setu into production.

## The plan in one picture

```
GitHub repository (code, lessons, images — about 15 MB, no AI models)
   │  every push to main
   ▼
Cloudflare Pages ── builds and serves the app      https://gyaansetu.in
   │
   │  the first time a learner uses a feature, the app downloads its model once
   ▼
Cloudflare R2 ──── stores the AI models (1.2 GB)   https://models.gyaansetu.in
   │
   ▼
Learner's device ── keeps everything, then works fully offline
```

There is **no backend** (no Render, no database, no API). The tutor, the
translator, voices, voice input, quizzes and progress all run in the
learner's browser.

`gyaansetu.in` is an example domain throughout; use your own.

### Why this setup

| Need | Why Cloudflare fits |
| --- | --- |
| Each new device downloads up to 1.2 GB of models once | R2 charges **nothing for downloads**; Pages has unlimited bandwidth |
| AI runs fastest when the page is "cross-origin isolated" | Pages sends the required headers from a `_headers` file |
| Learners in India | Cloudflare has servers in Mumbai, Delhi, Chennai, Hyderabad and more |
| Auto-deploy from GitHub | Pages rebuilds on every push |
| Free plan allows commercial use | Yes (Vercel's free Hobby plan does not) |

Limits that shaped the plan: Pages serves at most 25 MiB per file and 20,000
files, so the models (files up to 94 MB) go to R2. The largest app file is the
AI runtime, `ort-wasm-simd-threaded.jsep.wasm`, at 21.6 MB, which fits.

---

## Phase 0 — What you need

- [ ] A GitHub account with the repository (`jeevithananepalli-cseds/gyaan-setu-ai`)
- [ ] A free Cloudflare account: https://dash.cloudflare.com/sign-up
- [ ] **A domain name** (recommended, about ₹600–900 a year for `.in`). R2's
      free `r2.dev` address is rate-limited and meant for testing only, so
      production model downloads need your own domain.
      *No domain?* See [Without a domain](#without-a-domain) at the end.
- [ ] `rclone` for uploading the models (Phase 4). Windows:
      `winget install Rclone.Rclone`, or download from https://rclone.org/downloads/
- [ ] A reasonably fast connection for the one-time 1.2 GB model upload

---

## Phase 1 — Code changes (done in the project, by Claude)

| Change | Why |
| --- | --- |
| A `VITE_MODELS_URL` setting; every model path is built from it | Models load from R2 in production and from `public/models/` in development |
| The service worker joins split model files from that address and caches them | The English tutor model is stored as 3 parts |
| `public/_headers` | Isolation headers; `no-cache` for `index.html` and `service-worker.js` so learners get updates; long caching for `assets/` |
| `public/models/` added to `.gitignore` | Keeps the repository small, so pushes take seconds |
| Unit tests, end-to-end tests and the build run before release | Catch problems before learners do |

The model files stay in `public/models/` on your computer: you need them for
development and for the Phase 4 upload.

## Phase 2 — Push the code to GitHub (done by Claude)

Only the code is pushed: about 15 MB, roughly a minute. The half-uploaded
`gyaan-setu-v2` branch in your repository is replaced, and the code is
pushed to `main`.

Check: open https://github.com/jeevithananepalli-cseds/gyaan-setu-ai. It
shows `src/`, `public/`, `docs/` and the rest, and `public/models/` is
missing (that is expected).

---

## Phase 3 — Add your domain to Cloudflare

Skip this phase if you have no domain (see the end of this guide).

1. Buy the domain from any registrar (GoDaddy, Hostinger, BigRock, Namecheap,
   or Cloudflare Registrar itself).
2. Cloudflare dashboard → **Add a domain** → type `gyaansetu.in` → choose the
   **Free** plan.
3. Cloudflare shows two **nameservers** (like `ana.ns.cloudflare.com`).
4. At your registrar, replace the domain's nameservers with those two.
5. Wait until Cloudflare marks the domain **Active** (usually under an hour,
   occasionally up to 24 hours). Cloudflare emails you when it is.

## Phase 4 — Store the models in R2

### 4.1 Create the bucket

1. Dashboard → **R2 Object Storage**. On first use, activate R2. It asks for
   a card, but the free allowance (10 GB stored, unlimited downloads) covers
   this project, which stores about 1.2 GB.
2. **Create bucket** → name `gyaan-setu-models` → location **Automatic**.

### 4.2 Give it a public address

1. Open the bucket → **Settings** → **Custom Domains** → **Add**.
2. Enter `models.gyaansetu.in` → **Connect domain**. Cloudflare adds the DNS
   record itself.
3. Wait for the status to show **Active**.

### 4.3 Allow the app to read it (CORS)

Bucket → **Settings** → **CORS policy** → **Edit**, paste the following and
save:

```json
[
  {
    "AllowedOrigins": ["https://gyaansetu.in", "https://www.gyaansetu.in", "http://localhost:4173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

When the Pages project exists (Phase 5), also add its address, for example
`https://gyaan-setu.pages.dev`, to `AllowedOrigins`.

### 4.4 Create an upload key

1. R2 Object Storage overview → **Manage API tokens** → **Create API token**.
2. Permission: **Object Read & Write**. Scope: **only** the
   `gyaan-setu-models` bucket.
3. Copy the **Access Key ID**, the **Secret Access Key** and the **endpoint**
   (`https://<account-id>.r2.cloudflarestorage.com`). The secret is shown
   only once. Never commit these or paste them into chat.

### 4.5 Upload the models

Set up rclone once (it asks questions; use these answers):

```bash
rclone config
```

| Question | Answer |
| --- | --- |
| New remote, name | `r2` |
| Storage | `s3` (Amazon S3 compliant) |
| Provider | `Cloudflare` |
| access_key_id / secret_access_key | from step 4.4 |
| endpoint | `https://<account-id>.r2.cloudflarestorage.com` |
| Everything else | press Enter |

Then, from the project folder:

```bash
rclone copy public/models r2:gyaan-setu-models/models --progress --transfers 2 --s3-chunk-size 16M
```

- `--progress` shows the percentage, speed and time left.
- **It is resumable.** If the connection drops, run the same command again;
  files already uploaded are skipped.
- On a slow connection, use `--transfers 1`.

Check that it worked:

```bash
rclone size r2:gyaan-setu-models/models
```

This should report about 1.2 GB and 252 files. Then open
`https://models.gyaansetu.in/models/SmolLM2-360M-Instruct/config.json`
in a browser; it should show a page of JSON.

## Phase 5 — Create the Pages project

1. Dashboard → **Workers & Pages** → **Create** → the **Pages** tab →
   **Connect to Git**.
2. Authorise GitHub, choose `jeevithananepalli-cseds/gyaan-setu-ai`, then
   **Begin setup**.
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Project name | `gyaan-setu` (gives `gyaan-setu.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | `Vite` (or None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. **Environment variables** → add both:

   | Name | Value |
   | --- | --- |
   | `NODE_VERSION` | `22` |
   | `VITE_MODELS_URL` | `https://models.gyaansetu.in/models/` |

5. **Save and Deploy.** The first build takes about 1–2 minutes.
6. Open `https://gyaan-setu.pages.dev`; the app should load.

## Phase 6 — Put the app on your domain

1. Pages project → **Custom domains** → **Set up a custom domain**.
2. Add `gyaansetu.in` (and `www.gyaansetu.in` if you want it) → **Activate**.
3. Wait for **Active** (a few minutes). HTTPS is set up automatically.

## Phase 7 — Check everything before telling learners

Test in Chrome or Edge, on a laptop **and** on a mid-range Android phone.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Open the site | Home page loads quickly, no errors |
| 2 | DevTools console: `crossOriginIsolated` | `true` |
| 3 | Open a lesson and take a quiz | Levels, explanations after submit |
| 4 | Ask Gyaan in English: "why is the sky blue" | Answer starts within a few seconds (the first time also downloads about 270 MB) |
| 5 | Telugu chat: "what is ohms law" | Answer in Telugu |
| 6 | Telugu chat: a question no lesson covers | AI answer, translated sentence by sentence |
| 7 | 🔊 Read aloud in English, Telugu and Hindi | Speech plays |
| 8 | Voice input in English | Question is recognised and answered |
| 9 | DevTools → Network: model files | Load from `models.gyaansetu.in`, status 200 |
| 10 | **Airplane mode**, reload, repeat checks 3–8 | Everything already used still works |
| 11 | Push a small change to `main` | Pages redeploys; the site updates after a reload |

## Phase 8 — Go live and switch over

1. Share the new address with learners and teachers.
2. Keep the old Azure site running for a week or two, so anyone who still
   opens the old link is not cut off. Then delete the Azure storage account
   to stop its charges.
3. Update the README and `docs/DEPLOYMENT.md` with the new address.

---

## Day-to-day after launch

| Task | How |
| --- | --- |
| Release an update | Push to `main`; Pages builds and deploys it (about 2 minutes). Learners get it on their next visit. |
| Try a change first | Push to another branch; Pages gives it a preview address. Add that address to the R2 CORS list if it needs the models. |
| Roll back | Pages project → **Deployments** → pick an older deployment → **Rollback**. |
| Change or add a model | Upload with `rclone copy` (Phase 4.5). Use a **new folder name** for changed model files, or learners keep the old copy they saved. |
| Monitor usage | Pages and R2 → **Metrics** in the Cloudflare dashboard. |

## Costs

| Item | Cost |
| --- | --- |
| Cloudflare Pages | Free (500 builds a month, unlimited bandwidth) |
| R2 storage, about 1.2 GB | Free (10 GB included) |
| R2 downloads | Free; no download fees ever. Reads are free up to 10 million a month. |
| Domain | About ₹600–900 a year |

For comparison, the current Azure setup bills downloads: about ₹7–8 per GB,
so about ₹8,000 for 1,000 new learners.

## Licences: check before launch

- **Meta MMS voices** (English, Telugu, Hindi read-aloud) are **CC-BY-NC 4.0**,
  so non-commercial use only. Fine for a school, NGO or student project. If
  Gyaan Setu will earn money, replace these voices first.
- SmolLM2 (Apache 2.0), IndicTrans2 (MIT) and Whisper (MIT) allow commercial
  use.
- Credit the model authors on an "About" page; see the READMEs under
  `public/models/`.

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| Build fails on Pages | Check the build log. Usually `NODE_VERSION` is missing or the build output directory is not `dist`. |
| App loads but AI says it cannot load | Models are missing from R2, or `VITE_MODELS_URL` is wrong: it must end with `/models/`. Open a model URL directly to check. |
| Console shows "blocked by CORS policy" | Add the site's exact address (with `https://`, no trailing slash) to the R2 CORS list. |
| `crossOriginIsolated` is `false` | `public/_headers` is missing from the build; check `dist/_headers` exists. |
| Learners still see the old version | `index.html` or `service-worker.js` is being cached; check the `no-cache` rules in `_headers`. One hard reload (Ctrl + Shift + R) fixes a device. |
| The model upload is very slow | Use `--transfers 1`, pause OneDrive and other uploads, and rerun: it resumes where it stopped. |

## Without a domain

If you cannot buy a domain yet:

- The app can run on `https://gyaan-setu.pages.dev` (free, Phases 5 and 7).
- Host the models on **Hugging Face** instead of R2: create a free account,
  make a public model repository (for example `gyaan-setu/models`), and
  upload `public/models/` with the `huggingface-cli upload` command. Then set
  `VITE_MODELS_URL` to
  `https://huggingface.co/<user>/<repo>/resolve/main/`.
  Hugging Face is free, sends the right CORS headers, and has no download
  fees.

You can move the models to R2 later by uploading them and changing
`VITE_MODELS_URL`; no code changes are needed.
