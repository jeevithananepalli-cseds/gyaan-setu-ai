# Changelog

## Unreleased

### Faster answers

- The tutor's answer appears while it is being written instead of all at
  once at the end. In Telugu and Hindi chats each sentence is translated as
  soon as the model finishes it, while the next one is still being written.
- Answers stop after two sentences (on built-in laptop graphics the model
  writes about four words a second).
- The model starts loading when the chat opens, if it is already on the
  device, so the first question does not wait 15 seconds for it.
- Model loading no longer floods the page with thousands of progress
  updates.
- Measured on an Intel Iris Xe laptop: English answers start after about
  3 seconds; a Telugu answer that took about 45 seconds now shows its first
  sentence after about 10 and is complete after about 14.

### Voice input and read-aloud without the internet

- English voice input now runs on the device (Whisper base.en, about 77 MB,
  downloaded the first time the mic is used). It works offline, and what the
  learner says never leaves the device. The app notices when the learner has
  finished speaking and sends the question by itself; the Stop button sends
  it early. Telugu and Hindi voice input still use the browser's online
  recognition until their on-device models are added (see
  `public/models/whisper/README.md`).
- Read-aloud works offline: without a connection only voices installed on the
  device are used (many browser voices are online services), and the app's
  own voice is used when there is none. A bundled English voice (Meta MMS,
  114 MB, downloaded on first use) joins the Telugu and Hindi ones. If a
  device voice fails to speak, the bundled voice takes over.

### Voice questions in Telugu and Hindi chats

- Fixed: a question spoken in English in the Telugu or Hindi chat was not
  answered. The microphone listened in Telugu (or Hindi), so English speech
  came out as meaningless Telugu-letter text. A small button next to the mic
  now shows the language it listens in (తె / हि / EN); tap it to speak in
  English. The answer is still in the chat language, and the choice is
  remembered. The status line names the language too ("Listening in
  English...").
- Fixed: a last recognition result arriving after a spoken question had been
  sent could be sent again as a second, partial question.
- Repeated sentences in AI answers are removed.

### Ask Gyaan answers any question in Telugu and Hindi

- Answers now always come in the language chosen in the chat window. Type
  "ohm's law" in English into the Telugu chat and the answer is in Telugu.
- Questions with no lesson answer go to the on-device AI model in Telugu and
  Hindi too, not only in English. The model works in English, so a Telugu or
  Hindi question is translated into English first and its answer is
  translated back, on the device, with AI4Bharat's IndicTrans2 (MIT
  licence). The translator is downloaded the first time it is needed
  (309 MB for answers, 262 MB more for questions typed in Telugu or Hindi
  script) and then works offline.
- An English question in a Telugu or Hindi chat also finds the matching
  lesson and answers with its hand-written Telugu or Hindi text.
- Fixed: the English AI model took over four minutes to load, because the
  service worker sent it without its size. It now loads in about 15-20
  seconds, and is no longer stored twice (270 MB saved).
- Fixed: hand-written answers were picked on loose matches ("why do we need
  sleep?" got an answer about the weather, because "we" matched "weather").
  Words now match whole, and while the AI can answer, a hand-written answer
  is used only when the question names its topic or lesson.
- The first AI answer waits up to five minutes for the model to load, with
  the download progress shown, instead of giving up after 90 seconds.

### Quiz levels, better Practice, dark mode, more chapters

- Every class now has at least 10 chapters (106 lessons, 1,060 questions).
  All classes use the same JSON format; the generated Class 6–10 quizzes, in
  which every answer was option A, were replaced with written questions.
- Quizzes have levels of 5 questions. Level 2 opens after Level 1 is passed
  (3 of 5 correct); passing the last level completes the lesson.
- Answers are no longer revealed on tap. The learner answers all questions of
  the level and submits; then the correct answer and an explanation are shown
  for every question, in English, Telugu or Hindi.
- Practice now shows the quizzes the learner did not do well in (below 4 of
  5), with a button to retry each, plus the questions answered wrongly. It no
  longer jumps to the Progress page when there is nothing to practise.
- New light/dark theme switch in the top bar. It follows the device setting
  until the learner chooses, then remembers the choice.

### Faster Telugu and Hindi read-aloud

- The audio for a new Telugu or Hindi answer is made in the background while
  the learner reads it, so tapping the speaker usually plays at once. Audio
  already made is reused when an answer is played again.
- The voice uses up to 8 CPU threads instead of 4 (measured: about 7 s per
  6 s of speech instead of 10-13 s on a 12-thread laptop).
- Fixed: a slow start on a busy computer was mistaken for a hang and switched
  the voice to one thread permanently, making it about twice as slow.

### Livelier design, smoother Telugu chat

- New visual theme: indigo-to-violet gradients with warm sunrise accents, an
  illustrated home banner (a bridge at sunrise, for "Gyaan Setu"), gradient
  tiles, a journey-style learning path, lettered quiz options (A, B, C, D) and
  a colourful chat window with avatars and coloured suggestion chips.
- Switching the chat language now starts a fresh conversation in the new
  language.
- The 264 MB AI model is no longer loaded in the background on the home
  screen; it loads when a question needs it. That background load kept the
  CPU busy for a minute or more and made the Telugu and Hindi voices lag.
- Read-aloud skips the label line ("Offline Knowledge") and starts with a
  shorter first piece, so the first words come sooner.
- A Telugu or Hindi voice that has been used before is loaded as soon as the
  chat switches to that language.

### New design

The interface was redesigned from the team's mockup: cream background, navy
sidebar, indigo buttons and soft pastel tiles.

- New page shell: a sidebar on wide screens (Home, Learn, Practice, Ask Gyaan,
  Progress, Language, online status) and a four-item bottom bar on phones.
- New home dashboard: greeting, continue-learning card with class progress,
  stats, Explore tiles, numbered class tiles and the learning path.
- The class picker uses the same numbered tiles.
- Lessons, quizzes, profile, practice and sign-in are restyled to match.
- The navigation highlights the section you are in.
- Fonts (Nunito, Caveat) are bundled with the app, so they work offline.

### Bundled Telugu and Hindi voices

- Read-aloud now works for Telugu and Hindi on devices that have no voice
  installed for them. The app ships two on-device voices (Meta MMS, about
  109 MB each) that are downloaded the first time a learner uses read-aloud
  in that language, then kept for offline use.
- A device voice is still preferred when there is one, because it starts
  instantly.
- Bundled speech is produced one sentence at a time so the first words are
  heard after a few seconds.
- The service worker now makes the page cross-origin isolated, which lets the
  AI runtime use several CPU threads. This roughly halves the time the
  bundled voices need.
- The voices do not depend on the service worker: the voice worker downloads
  the model parts, joins them and keeps them in its own cache
  (`gyaan-setu-voices-v1`). They work on a first visit and in `npm run dev`.
- The chat shows download progress and what the voice is doing, so a slow
  first load no longer looks stuck.
- If the multi-threaded voice engine does not start within 90 seconds (seen
  in one embedded browser), it restarts on a single thread and remembers that
  choice on the device for a week.
- Read-aloud no longer waits forever when the browser has not yet allowed the
  page to play sound; it asks the learner to tap the speaker button.
- `scripts/split-model.js` can split any model file.
- The voices are licensed CC BY-NC 4.0 (non-commercial); see
  `public/models/tts/README.md`.

### Ask Gyaan in English, Telugu and Hindi

- The chat has its own language switch (English / తెలుగు / हिंदी). It changes
  the chat only, not the rest of the app.
- A question is answered in the language it is written in, whatever the chat
  or app language is.
- Voice input listens in the chat language. Clearer messages when the
  microphone is blocked, the browser cannot listen in that language, or the
  device needs internet for voice typing.
- Read-aloud picks a voice for the language of each answer, reads long answers
  sentence by sentence, and says so when the device has no voice for that
  language instead of reading it with an English voice.
- A "Read aloud" switch speaks every answer automatically. A question asked by
  voice is always answered aloud.
- A "Gyaan is thinking..." message shows while the on-device model works.
- Search understands Telugu and Hindi word endings (పర్యావరణం / పర్యావరణాన్ని,
  पौधा / पौधों), finds a lesson when its topic is named ("What is
  friction?"), and looks in other classes when the learner's own class has no
  answer.
- If the on-device model replies in the wrong script for a Telugu or Hindi
  question, the lesson-based answer is shown instead.

### Project restructure

The app was reorganised from four global scripts in the repository root into
a Vite project. What learners see and do is unchanged.

**Changed**

- `app.js` (5,400 lines) is split into ES modules under `src/core`,
  `src/i18n`, `src/features` and `src/ai`.
- `data.js` is now one JSON file per class in `src/content/curriculum`;
  `science-content.js` is one module per class in `src/content/science`, with
  the quiz generator in `src/content/quiz-generator.js`; `knowledge.js` is
  `src/content/knowledge-base.js`.
- `style.css` is split into files under `src/styles`, imported in the original
  order.
- Shared UI strings moved from code into `src/i18n/locales/*.json`.
- Static files moved to `public/`: icons to `icons/`, the logo to
  `images/brand/`, the AI runtime from `runtime/` to `vendor/onnx/`.
- `manifest.json` is now `manifest.webmanifest`.
- Inline `onclick` / `onsubmit` / `onerror` attributes are replaced by
  `data-action`, `data-submit` and `data-fallback-src`, handled by one
  listener in `src/core/actions.js`.
- The service worker's file list is generated by the build, and its cache name
  is derived from that list, so the cache version no longer has to be bumped
  by hand.
- The AI worker receives the app's base URL from the page instead of assuming
  the site is at the domain root.
- `scripts/import-lesson-images.js` reads and writes the per-class JSON files.

**Added**

- Vite build with `vite-plugin-pwa` (`npm run dev`, `build`, `preview`).
- Unit tests (Vitest) and end-to-end tests (Playwright).
- `scripts/validate-content.js` and `scripts/split-model.js`.
- ESLint, Prettier, EditorConfig, `.gitattributes`.
- GitHub Actions workflows for CI and for deploying to GitHub Pages.
- `README.md` and guides in `docs/`.

**Removed**

- `app-BACKUP.js`, `offline-ai-worker-BACKUP.js`, `GyaanSetuPWA.code-workspace`
  and `.DS_Store`.
- The duplicate `ort-wasm-simd-threaded.jsep.wasm` in the repository root.
- Dead code in `app.js`: the earlier, overridden definitions of `showHome` and
  `showChapters`, and three unused `legacy…` AI functions.

**Fixed**

- Cached files are now found offline even when the server sends
  `Vary: Origin`.

**Upgrade notes**

- GitHub Pages must be switched to the "GitHub Actions" source; see
  `docs/DEPLOYMENT.md`.
- Existing installs keep their progress and their downloaded model. The AI
  runtime files are re-keyed in place rather than downloaded again.
