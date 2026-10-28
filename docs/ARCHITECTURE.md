# Architecture

Gyaan Setu is a static, client-only app. There is no server and no account
backend: everything a learner does is stored in the browser on their device.

Three scripts run in the browser, each in its own context:

```
┌──────────────────────── page (src/main.js) ────────────────────────┐
│  views render HTML into <main id="app">                            │
│  state + localStorage hold accounts and progress                   │
└───────┬──────────────────────────────────────────────┬─────────────┘
        │ postMessage                                  │ fetch / postMessage
        ▼                                              ▼
┌── AI worker ───────────────┐          ┌── service worker ──────────────┐
│ src/ai/offline-ai.worker.js│  fetch   │ src/sw/service-worker.js       │
│ loads the model, answers   │ ───────► │ app cache + AI cache,          │
│ questions                  │          │ joins the split model file     │
└────────────────────────────┘          └────────────────────────────────┘
```

## The page

`index.html` holds the fixed shell (header, chat window, bottom navigation).
`src/main.js` starts everything: it turns on markup actions, loads the saved
account, attaches the shell's listeners, registers the service worker and shows
the first screen.

### Modules

| Folder | Responsibility |
| --- | --- |
| `config/` | Constants: storage keys, cache names, languages. No logic. |
| `core/state.js` | The one mutable `state` object. |
| `core/storage.js` | The only module that touches `localStorage`. |
| `core/actions.js` | Runs the handlers named in markup (see below). |
| `core/dom.js`, `router.js`, `network.js` | Shared DOM helpers, top-level navigation, online indicator. |
| `core/theme.js` | Light and dark theme: follows the device until the learner uses the top-bar switch, then remembers the choice. |
| `i18n/` | `uiText(key)` for shared strings, `textByLanguage(en, te, hi)` for inline ones. |
| `features/*` | One folder per area of the app. `*.view.js` renders a screen; `*.service.js` holds logic with no rendering. |
| `ai/` | Talking to the on-device model. |
| `content/` | Lesson data, one JSON file per class in `content/curriculum/`. `content/index.js` exports the merged `learningData`. |

### State

All shared mutable values live on `state` (`core/state.js`). Modules import
`state` and read `state.selectedLanguage` and so on **when they run**. Do not
copy a value out at the top of a module: it would go stale.

Saved data uses these `localStorage` keys, which must not be renamed or
learners lose their progress: `gyaanAccounts`, `gyaanCurrentAccount`,
`gyaanLanguage`, `gyaanOfflineAiState`, `gyaanTheme`.

Each account stores `quizLevels` alongside `completedLessons`: for every
lesson key (`class-chapter-lesson`), the best score, attempts and pass state
of each quiz level.

### Quizzes and Practice

`features/quiz/levels.js` holds the rules with no rendering: a lesson's quiz
is split into levels of 5 (`QUESTIONS_PER_LEVEL`), a level passes at 3 of 5
(`PASS_MARK`), the next level opens only after the previous one passes, and
passing the last level calls `markLessonComplete`. `getWeakLevels()` returns
every level scored below 4 of 5 (`GOOD_SCORE`).

`quiz.view.js` renders one level at a time. Choosing an option only marks it
selected; `submitQuiz()` reveals correct and wrong answers with each
question's explanation, records wrong answers for Practice and saves the
level result. `practice.view.js` lists the weak levels (with a retry button)
and the wrong answers to try again.

### Markup actions

Views build HTML strings. ES module functions are not globals, so markup cannot
say `onclick="openLesson(2, 3)"`. It carries the same call in a data attribute
instead, and one delegated listener in `core/actions.js` runs it:

```html
<button data-action="openLesson(2, 3)">Open</button>
<form data-submit="handleLogin(event)">…</form>
<img src="…" data-fallback-src="./images/lessons/placeholder-education.svg">
```

A call may pass numbers, quoted strings, `true`/`false`/`null`, `this` (the
element) and `event`. Several calls can be separated with `;`. The text is
parsed, never evaluated, so it cannot run arbitrary code.

A function can only be called from markup once it is registered. Each module
does this at the bottom of the file:

```js
registerActions({ openLesson, continueLearning });
```

**When you add a function that markup calls, add it to that module's
`registerActions`.** If the module is not imported by anything else, also add
it to the side-effect imports in `src/main.js`, otherwise it never loads and
its buttons do nothing (the console reports `Unknown action "…"`).

### Navigation

There is no URL router. A screen is shown by calling its function
(`showHome()`, `openLesson(chapterIndex, lessonIndex)`), which replaces the
contents of `#app`. View modules import each other directly; this creates
import cycles, which is safe because the functions are only called after every
module has loaded. Keep it that way: do not call another view at the top level
of a module.

## The service worker

`src/sw/service-worker.js` is hand-written. `vite-plugin-pwa` is used in
`injectManifest` mode only to insert the list of built files
(`self.__WB_MANIFEST`).

It keeps two caches:

- **App cache** (`gyaan-setu-<hash>`): the app shell and lesson images, cached
  when the worker installs. The hash is derived from the file list, so any
  deploy that changes a file gets a new cache and old ones are deleted.
- **AI cache** (`gyaan-setu-ai-v1`): the model and its runtime. The name never
  changes, so the model is downloaded once per device. It is filled either on
  demand, as the AI worker requests files, or all at once when the page sends a
  `CACHE_AI_ASSETS` message.

Requests are answered cache-first. The model is stored as three files
(`model_q4f16.onnx.part-aa`, `-ab`, `-ac`) because of GitHub's 100 MB file
limit; when the runtime asks for `model_q4f16.onnx`, the worker joins the
cached parts and returns them as one response.

The service worker only exists in the production build. `npm run dev` has
none.

## The on-device AI

`src/ai/offline-ai.client.js` runs on the page and owns the worker.
`src/ai/offline-ai.worker.js` runs the model.

1. The page creates the worker and sends `{ type: "init", baseUrl }`.
2. The worker imports `vendor/onnx/transformers.min.js` by URL (it is vendored
   in `public/` and deliberately not bundled), points it at
   `models/` and `vendor/onnx/`, and loads `SmolLM2-360M-Instruct`, trying
   WebGPU first and falling back to WebAssembly.
3. It reports `status`, then `ready` or `error`.
4. For each question the page sends `{ type: "answer", question, context,
   requestId }` and the worker replies `answer` or `answer-error`.

The model only works well in English, so it is always asked in English
(`ai/prompts.js`); Telugu and Hindi go through the translator (below). The
service worker serves the model's three parts joined into one response **with
its `Content-Length`**: without it the runtime grows its buffer for every
chunk, and loading took over four minutes instead of about 15 seconds.

### How a question is answered

`features/assistant/assistant.service.js` decides. The answer is always in the
chat language (`getChatLanguage()`), whatever the question is typed in.

1. Look for a hand-written answer (`offline-search.js`): the knowledge base,
   then the lessons. A question is matched in the language it is written in,
   and the answer is taken from the same entry or lesson text in the chat
   language. While the model can still answer, only a confident match is used
   (the question names a knowledge-base topic or a lesson title); a looser
   match is left to the model, which answers it better.
2. Otherwise ask the model. A Telugu or Hindi question is first translated
   into English. Lesson text that matches well is passed as context.
3. The English answer is translated into the chat language and shown.
4. If the model cannot run, fails, or takes too long (5 minutes to load the
   first time, 2 minutes to answer), show the best hand-written match.

So the assistant always answers, with or without the model.

### Translation

`ai/translator.client.js` (page) and `ai/translator.worker.js` (worker) run
AI4Bharat's IndicTrans2 with the ONNX runtime (`vendor/onnx/ort.webgpu.min.mjs`,
the same runtime version transformers.js bundles, sharing its `.wasm` file),
and use transformers.js only for the tokenizers. There is one model per
direction in `public/models/indictrans2/` (see its README):

- `en-indic` (309 MB): English to Telugu or Hindi, for answers.
- `indic-en` (262 MB): Telugu or Hindi to English, for questions.

A direction is downloaded the first time it is needed, using its
`manifest.json`, joined from its parts and stored in its own cache
(`gyaan-setu-translator-v1`), so it does not depend on the service worker.
When storage is full it translates from memory instead. When the chat is in
Telugu or Hindi and `en-indic` is already on the device, it is loaded as the
chat opens. Text is translated one sentence at a time; pieces with no words
(formulas, numbers) are kept as they are. `ai/translation-text.js` holds the
text handling: the model reads Indian languages in Devanagari, so Telugu is
mapped letter for letter into Devanagari and back.

`state.assistantConversation` goes up when the chat language changes or the
chat closes, so answers still being translated for the old conversation are
dropped.

### Languages and voice in the chat

The chat has its own language (`state.chatLanguage`, falling back to the app
language), chosen with the pills at the top of the chat window.

- **Answer language** is always the chat language. `detectLanguage()` in
  `config/languages.js` works out the language a question is typed in from
  its script (Telugu letters, Devanagari, Latin), which decides how it is
  searched and whether it needs translating.
- **`withLanguage(language, fn)`** in `i18n/index.js` runs a synchronous
  function with a different language selected and then restores the old one.
  The assistant uses it so search and `textByLanguage` work in the answer
  language without changing the app's language.
- **Voice input** (`voice-input.js`) uses the browser's speech recognition
  (`en-IN`, `te-IN`, `hi-IN`). It can listen for only one language at a time:
  the chat language, or English when the learner taps the language button
  beside the mic (`toggleVoiceLanguage`, saved per chat language in
  `gyaanVoiceLanguage`). English heard as Telugu comes out as meaningless
  Telugu-letter text, so a learner asking in English needs the English
  setting. The recognised text then goes through the same path as typing,
  so the answer is in the chat language either way.
- **On-device voice input** (`ai/microphone.js`, `ai/speech-detection.js`,
  `ai/speech-recognition.client.js`, `ai/speech-recognition.worker.js`):
  for languages whose Whisper model ships in `public/models/whisper/`
  (`bundled: true` in `ai/speech-recognition-models.js`), the mic records
  the question itself, stops after 1.3 s of quiet (or on Stop), resamples to
  16 kHz and transcribes it in a worker, offline. Other languages fall back
  to the browser's recognition (`SpeechRecognition`), which needs the
  internet in most browsers. Models are downloaded on first use into
  `gyaan-setu-speech-v1`.
- **Read-aloud** (`speech-output.js`) speaks an answer in the language it is
  written in. It uses a voice installed on the device when there is one for
  that language; offline, only voices that run on the device count
  (`usableVoices`, `localService`), since many browser voices are online
  services. Otherwise it uses the app's bundled English, Telugu and Hindi
  voices, and it switches to them when a device voice fails to start.
- **Bundled voices** (`ai/tts.client.js`, `ai/tts.worker.js`,
  `public/models/tts/`) are Meta MMS models run on the device by the same
  runtime as the assistant model. The worker receives one sentence at a time
  and returns raw audio samples, which the page plays through the Web Audio
  API. A voice (about 109 MB) is downloaded the first time it is needed: the
  worker fetches the two model parts, joins them and stores the result in its
  own cache (`gyaan-setu-voices-v1`), so the voices do not depend on the
  service worker. `tts.client.js` restarts the engine on one thread if the
  multi-threaded start hangs for 90 seconds.
- **Speech is prepared ahead.** When a Telugu or Hindi answer appears and its
  voice is loaded, `prepareSpeech()` starts making the audio in the background
  while the learner reads. Tapping the speaker then plays it at once. Prepared
  audio is kept (`preparedAudio`, last 60 pieces), so replaying is instant
  too. A newer answer cancels the older one's unfinished preparation. On this project's test laptop a sentence took
  about as long to produce as it takes to say; slower devices will pause
  between sentences.

### Cross-origin isolation

The AI runtime can only use more than one CPU thread on a cross-origin
isolated page, which needs two response headers that static hosts such as
GitHub Pages cannot send. The service worker adds them to every response it
serves (`withIsolationHeaders`), so isolation starts on the second visit. The
dev and preview servers send the same headers (`vite.config.js`). A side
effect to remember: an isolated page cannot load images, scripts or frames
from other websites unless they allow it, so keep everything the app needs
inside the app.

## Build

Vite, with `base: "./"` so the same build works at a domain root or under a
sub-path such as `/gyaan-setu-ai/`. Everything in `public/` is copied to
`dist/` untouched. `appType: "mpa"` makes the dev and preview servers return
404 for missing files, which the AI runtime relies on when it probes for
optional model files.
