# Content guide

How to add or change what learners see. No build knowledge is needed: edit the
files, then run the checker.

```bash
npm run validate:content
```

It lists anything missing (a translation, an image, a quiz option or
explanation) with the
class, chapter and lesson it belongs to. Fix every error before committing.

## Where content lives

| Content | File |
| --- | --- |
| Classes 1–10 | `src/content/curriculum/class-1.json` … `class-10.json` |
| Assistant knowledge base | `src/content/knowledge-base.js` |
| Shared UI strings | `src/i18n/locales/en.json`, `te.json`, `hi.json` |
| Lesson images | `public/images/lessons/` |

Every piece of text needs all three languages, keyed exactly `English`,
`Telugu` and `Hindi`.

## Lessons (JSON)

Each file is one class:

```json
{
  "subject": { "English": "…", "Telugu": "…", "Hindi": "…" },
  "chapters": [
    {
      "id": "my-body",
      "icon": "🧒",
      "title": { "English": "My Body", "Telugu": "…", "Hindi": "…" },
      "description": { "English": "…", "Telugu": "…", "Hindi": "…" },
      "lessons": [ … ]
    }
  ]
}
```

A lesson:

```json
{
  "id": "body-parts",
  "visual": "🧒",
  "title": { "English": "Our Body Parts", "Telugu": "…", "Hindi": "…" },
  "image": "./images/lessons/body-parts.png",
  "explanation": { "English": "…", "Telugu": "…", "Hindi": "…" },
  "keyPoints": {
    "English": ["…", "…"],
    "Telugu": ["…", "…"],
    "Hindi": ["…", "…"]
  },
  "activity": { "English": "…", "Telugu": "…", "Hindi": "…" },
  "quiz": [
    {
      "question": { "English": "Which body part helps us see?", "Telugu": "…", "Hindi": "…" },
      "options": {
        "English": ["Eyes", "Ears", "Hands", "Feet"],
        "Telugu": ["…", "…", "…", "…"],
        "Hindi": ["…", "…", "…", "…"]
      },
      "answer": 0,
      "explanation": { "English": "We see with our eyes.", "Telugu": "…", "Hindi": "…" }
    }
  ]
}
```

Rules:

- `id` values are lowercase with hyphens and unique within their class.
- Every class needs at least **10 chapters**.
- A question has four options in each language (or two for True/False), in
  the same order in every language.
- `answer` is the position of the correct option, counting from 0. Vary it:
  the checker warns when every answer in a lesson is in the same position.
- Every question needs an `explanation` in all three languages. It is shown
  with the correct answer after the learner submits.
- JSON does not allow comments or a comma after the last item.

## Quiz levels

A lesson's `quiz` is split into **levels of 5 questions** in the order they
are listed: questions 1–5 are Level 1, 6–10 are Level 2, and so on. So a quiz
must have 10, 15, 20 … questions (the checker enforces at least 10, in
multiples of 5). Put the easier questions first.

- The learner answers all five, then submits. Only then are the correct
  answers and explanations shown.
- A level is passed with **3 of 5** correct (`PASS_MARK` in
  `src/features/quiz/levels.js`). Passing opens the next level; passing the
  last level completes the lesson.
- A level scored below **4 of 5** (`GOOD_SCORE`) is listed under Practice,
  together with every question answered wrongly, until it is retaken with a
  better score.

**Do not reorder or remove existing chapters and lessons.** Progress is saved
by position (class, chapter number, lesson number), so moving a lesson makes
learners' completed marks point at a different lesson. Add new chapters and
lessons at the end.

## Adding a class

1. Create `src/content/curriculum/class-N.json`.
2. Import it in `src/content/index.js` and add it to `learningData` under the
   key `classN`.
3. The class picker and progress screens list the classes they know about;
   search `src/features` for `selectClass(` to add the new one.

## Images

Put the file in `public/images/lessons/` and reference it from the lesson as
`./images/lessons/<file>`. Prefer SVG, or PNG/JPG under about 500 KB: every
image is downloaded to each learner's device for offline use, and files over
5 MB are skipped.

If an image is missing or fails to load, the app shows
`placeholder-education.svg`.

`npm run import:images` looks up openly licensed images on Openverse for
lessons that have none, downloads them and records the source
and licence in `image-attributions.json`. Run it with `--check` first
(`npm run import:images:check`) to see what it would do. Review every image it
picks before committing.

## Assistant knowledge base

`src/content/knowledge-base.js` is a list of topics the assistant can answer
without the AI model:

```js
{
  topic: "photosynthesis",
  aliases: {
    English: ["photosynthesis", "how plants make food"],
    Telugu: ["కిరణజన్య సంయోగక్రియ"],
    Hindi: ["प्रकाश संश्लेषण"]
  },
  answer: { English: "…", Telugu: "…", Hindi: "…" },
  example: { English: "…", Telugu: "…", Hindi: "…" }
}
```

`aliases` are the phrases a learner might type; the more natural phrasings you
list, the more often the entry is found. `example` is optional.

## UI strings

Strings used in several places (navigation, status labels) are in
`src/i18n/locales/`. Add the same key to all three files; a unit test fails if
they differ. Use it in code with `uiText("yourKey")`.

One-off strings are written where they are used:

```js
textByLanguage("Good try!", "మంచి ప్రయత్నం!", "अच्छी कोशिश!")
```
