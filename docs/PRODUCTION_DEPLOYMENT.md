# Production deployment (GitHub + Vercel + Hugging Face)

Step-by-step guide to putting Gyaan Setu into production at no monthly cost.

## The plan in one picture

```
GitHub repository (code, lessons, images — no AI models)
   │  every push to main
   ▼
Vercel ──────────── builds and serves the app        https://gyaan-setu.vercel.app
   │
   │  the first time a learner uses a feature, the app downloads its model once
   ▼
Hugging Face ────── stores the AI models (1.2 GB)    https://huggingface.co/<you>/gyaan-setu-models
   │
   ▼
Learner's device ── keeps everything, then works fully offline
```

There is **no backend**, so no Render, database or API is needed. The tutor,
translator, voices, voice input, quizzes and progress all run in the
learner's browser.

### Why the models are not on Vercel

| Limit | Value | Gyaan Setu |
| --- | --- | --- |
| Vercel static files per deployment | 1 GB | the models alone are 1.2 GB |
| Vercel Hobby bandwidth | 100 GB a month | each new device downloads up to 1.2 GB of models |
| GitHub | slow and unreliable for large files | the models would not push |

The app itself is about 12 MB, so on Vercel it uses about 12 MB per new
device. That is roughly 8,000 new devices a month within the free 100 GB.
The models come from Hugging Face, which is free for public models and has
no download fees.

### What it costs

| Item | Cost |
| --- | --- |
| GitHub (public repository) | Free |
| Vercel Hobby | Free |
| Hugging Face (public model repository) | Free |
| Domain (optional) | About ₹600–900 a year; `gyaan-setu.vercel.app` is free |

**Total: ₹0 a month.**

Vercel's Hobby plan is for **non-commercial** projects only. A school, NGO or
student project qualifies. If Gyaan Setu will earn money, move to Vercel Pro
($20 a month) and replace the Meta MMS voices (see Licences).

---

## Step 1 — Code changes (already done)

| Change | Where |
| --- | --- |
| One setting, `VITE_MODELS_URL`, says where models come from. Empty means the app's own `models/` folder (development). | `src/config/constants.js` (`modelsBaseUrl`) |
| The tutor, translator, voices, voice input and service worker all build model addresses from it. | `src/ai/*`, `src/sw/service-worker.js` |
| Vercel settings: security headers so the AI can use several CPU threads; `index.html` and `service-worker.js` never cached, so learners get updates. | `vercel.json` |
| The model files are no longer committed. They stay on your computer for development and for Step 3. | `.gitignore` |
| The GitHub Pages workflow only runs when started by hand. | `.github/workflows/deploy.yml` |

Tested: the app was built with the models on a separate host. In Microsoft
Edge it downloaded and kept the tutor and translator, then answered and
translated with the network switched off.

## Step 2 — Code on GitHub

Repository: https://github.com/jeevithananepalli-cseds/gyaan-setu-ai,
branch `main`. It holds the code only, about 15 MB.

To publish a change later:

```bash
git add -A
git commit -m "Describe the change"
git push
```

Vercel deploys each push to `main` (Step 4).

## Step 3 — Upload the models to Hugging Face (once)

### 3.1 Account and access token

1. Sign up at https://huggingface.co/join (free) and confirm your email.
2. Profile picture → **Settings** → **Access Tokens** → **Create new token**.
   Choose **Write**, name it `gyaan-setu-upload`, create it, and copy it.
   Never commit it or paste it into chat.

### 3.2 Create the model repository

1. Profile picture → **New Model**.
2. Name: `gyaan-setu-models`. Licence: choose **Other** (the models have
   different licences; see `public/models/*/README.md`). Visibility: **Public**.
3. **Create model**.

### 3.3 Install the upload tool and sign in

You need Python 3.9 or newer.

```bash
pip install -U "huggingface_hub[cli]"
```

```bash
hf auth login
```

Paste the token when asked. Answer **n** to "add token as git credential".

### 3.4 Upload

From the project folder:

```bash
hf upload-large-folder <your-username>/gyaan-setu-models --repo-type=model public/models
```

- **It is resumable.** If the connection drops or you close the window, run
  the same command again and it continues where it stopped.
- It uploads 252 files, about 1.2 GB. On a slow connection this takes a
  long time, so leave it running, keep the laptop awake, and pause OneDrive
  syncing.

### 3.5 Check

Open this in a browser (with your username):

```
https://huggingface.co/<your-username>/gyaan-setu-models/resolve/main/SmolLM2-360M-Instruct/config.json
```

It should show a page of JSON. The repository's **Files** tab should list
`SmolLM2-360M-Instruct`, `indictrans2`, `tts` and `whisper`.

Your models address is:

```
https://huggingface.co/<your-username>/gyaan-setu-models/resolve/main/
```

## Step 4 — Deploy the app on Vercel

1. Sign in at https://vercel.com with **Continue with GitHub**, using the
   `jeevithananepalli-cseds` account. Choose the free **Hobby** plan.
2. **Add New…** → **Project** → find `gyaan-setu-ai` → **Import**. If it is
   not listed, choose **Adjust GitHub App Permissions** and allow the
   repository.
3. Settings (`vercel.json` already sets most of them):

   | Setting | Value |
   | --- | --- |
   | Framework Preset | Vite |
   | Root Directory | `./` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. Open **Environment Variables** and add:

   | Key | Value |
   | --- | --- |
   | `VITE_MODELS_URL` | `https://huggingface.co/<your-username>/gyaan-setu-models/resolve/main/` |

   It must end with `/`. It is read when the app is built, so after changing
   it you must **redeploy**: Deployments → ⋯ → Redeploy.
5. **Deploy.** It takes about 1–2 minutes. Vercel then shows your address,
   for example `https://gyaan-setu-ai.vercel.app`.

### Your own domain (optional)

Project → **Settings** → **Domains** → add `gyaansetu.in`, then add the DNS
records Vercel shows at your domain registrar. HTTPS is set up automatically.

## Step 5 — Check before sharing it

Test in Chrome or Edge, on a laptop **and** on an Android phone.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Open the site | Home page loads, no errors |
| 2 | DevTools console: type `crossOriginIsolated` | `true` |
| 3 | Open a lesson and take a quiz | Levels, explanations after submit |
| 4 | Ask Gyaan in English: "why is the sky blue" | Answer appears as it is written. The first time also downloads about 270 MB. |
| 5 | Telugu chat: "what is ohms law" | Answer in Telugu |
| 6 | Telugu chat: "how do birds fly" | AI answer, translated into Telugu |
| 7 | 🔊 Read aloud in English, Telugu and Hindi | Speech plays |
| 8 | Voice input in English | Question is recognised and answered |
| 9 | DevTools → Network: model files | Come from `huggingface.co` |
| 10 | Airplane mode, reload, repeat checks 3–8 | Everything already used still works |
| 11 | Push a small change to `main` | Vercel redeploys; the site updates after a reload |

## Step 6 — Go live

1. Share the Vercel address with learners and teachers.
2. Keep the old Azure site up for a week or two for anyone still using that
   link, then delete the Azure storage account so it stops costing money.
3. Put the new address in the README.

---

## After launch

| Task | How |
| --- | --- |
| Release an update | `git push` to `main`; Vercel deploys it in about 2 minutes. Learners get it on their next visit. |
| Try a change first | Push to another branch. Vercel gives it a preview address. |
| Roll back | Vercel → Deployments → choose an older one → **Promote to Production**. |
| Update a model | Upload with `hf upload-large-folder` (Step 3.4). Give changed model files a **new folder name**, or learners keep the copy they already saved. |
| Watch usage | Vercel → **Usage**. The app uses about 12 MB per new device. |

## Licences: check before launch

- **Meta MMS voices** (English, Telugu and Hindi read-aloud) are
  **CC-BY-NC 4.0**: non-commercial use only. Replace them before any
  commercial use.
- SmolLM2 (Apache 2.0), IndicTrans2 (MIT) and Whisper (MIT) allow commercial
  use.
- Credit the model authors (see the READMEs under `public/models/`). The
  same READMEs are uploaded to the Hugging Face repository.

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| Vercel build fails | Read the build log. Make sure the Output Directory is `dist`. |
| "AI could not load" or answers only from lessons | `VITE_MODELS_URL` is missing, wrong, or does not end with `/`. Fix it, then **Redeploy**. Open a model address from Step 3.5 to check the file exists. |
| Model files return 404 | The upload has not finished, or the folder structure differs: `SmolLM2-360M-Instruct/` must be at the top of the repository, not inside `models/`. |
| `crossOriginIsolated` is `false` | `vercel.json` is missing from the repository root. |
| Learners still see an old version | One hard reload (Ctrl + Shift + R). If it keeps happening, check that `service-worker.js` is served with `Cache-Control: no-cache`. |
| The Hugging Face upload stops | Run the same `hf upload-large-folder` command again; it resumes. |
| Vercel bandwidth warning | Make sure model files come from Hugging Face (DevTools → Network), not from the Vercel address. |
