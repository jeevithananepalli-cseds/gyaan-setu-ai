import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const STUDENT = { name: "Test Learner", pin: "4321" };

// The quiz no longer reveals answers before submitting, so the tests read
// them from the curriculum: class 1, first chapter, first lesson.
const FIRST_LESSON = JSON.parse(
  readFileSync(new URL("../../src/content/curriculum/class-1.json", import.meta.url), "utf8")
).chapters[0].lessons[0];
const ANSWERS = FIRST_LESSON.quiz.map(item => item.answer);
const QUESTIONS = ANSWERS.length;
const PER_LEVEL = 5;

test.beforeEach(async ({ page }) => {
  // Keep the 290 MB on-device model out of the tests; the assistant falls
  // back to offline search, which is what these tests cover.
  await page.route(/\/(models|vendor\/onnx)\//, route => route.abort());
});

// The star count and its label are separate elements, so allow any spacing.
function stars(count) {
  return new RegExp(`(^|\\D)${count}\\s*stars`);
}

async function chooseLanguage(page, language) {
  await page.locator(`[data-action="selectLanguage('${language}')"]`).click();
}

async function register(page) {
  await page.goto("./");
  await chooseLanguage(page, "English");
  await page.locator(`[data-action="showAuthScreen('register')"]`).click();

  const form = page.locator('form[data-submit="handleRegister(event)"]');
  await form.locator('input[name="studentName"]').fill(STUDENT.name);
  for (const pin of await form.locator('input[type="password"]').all()) {
    await pin.fill(STUDENT.pin);
  }
  await form.locator('button[type="submit"], button:not([type])').first().click();

  await expect(page.locator("#accountArea")).toContainText(STUDENT.name);
}

async function openFirstLesson(page) {
  await page.locator('[data-action="selectClass(1)"]').click();
  await page.locator('[data-action="showChapters()"]').click();
  await page.locator('[data-action*="openLesson"]').first().click();
  await expect(page.locator("#app img").first()).toBeVisible();
}

// Answers every question of the open level, getting `wrong` of them wrong
// (the first ones), and submits. Returns the score.
async function answerLevel(page, level, wrong = 0) {
  const cards = page.locator(".quiz-card");
  const count = await cards.count();

  for (let position = 0; position < count; position++) {
    const answer = ANSWERS[level * PER_LEVEL + position];
    const options = cards.nth(position).locator(".quiz-option");
    const pick = position < wrong ? (answer + 1) % (await options.count()) : answer;
    await options.nth(pick).click();
  }

  await page.locator("#quizSubmit").click();
  return count - wrong;
}

async function finishLesson(page) {
  await page.locator('[data-action*="startQuiz"]').first().click();
  await answerLevel(page, 0);
  await page.locator('#quizResult [data-action*="startQuiz"]').click();
  await answerLevel(page, 1);
  await expect(page.locator("#quizResult")).toContainText("You finished every level of this lesson.");
}

test("a new learner registers, finishes both quiz levels and earns stars", async ({ page }) => {
  await register(page);
  await expect(page.locator("#app")).toContainText(stars(0));

  await openFirstLesson(page);
  await page.locator('[data-action*="startQuiz"]').first().click();

  // Level 2 stays locked until level 1 is passed.
  await expect(page.locator(".quiz-level-tab")).toHaveCount(QUESTIONS / PER_LEVEL);
  await expect(page.locator(".quiz-level-tab").nth(1)).toBeDisabled();
  await expect(page.locator(".quiz-card")).toHaveCount(PER_LEVEL);

  const score = await answerLevel(page, 0);
  await expect(page.locator("#quizResult")).toContainText("Level 1 passed!");
  await expect(page.locator("#quizResult")).toContainText(`Your Score: ${score} / ${PER_LEVEL}`);
  await expect(page.locator(".quiz-level-tab").nth(1)).toBeEnabled();

  await page.locator('#quizResult [data-action*="startQuiz"]').click();
  await expect(page.locator(".quiz-level-tab").nth(1)).toHaveAttribute("aria-current", "step");
  await answerLevel(page, 1);
  await expect(page.locator("#quizResult")).toContainText("You finished every level of this lesson.");

  await page.locator('.sidebar [data-nav="home"]').click();
  await expect(page.locator("#app")).toContainText(stars(10 + QUESTIONS));
});

test("answers and explanations appear only after submitting", async ({ page }) => {
  await register(page);
  await openFirstLesson(page);
  await page.locator('[data-action*="startQuiz"]').first().click();

  const firstCard = page.locator(".quiz-card").first();
  await firstCard.locator(".quiz-option").nth(ANSWERS[0]).click();

  // Choosing an option marks it as selected but reveals nothing yet.
  await expect(firstCard.locator(".quiz-option.selected")).toHaveCount(1);
  await expect(page.locator(".quiz-option.correct, .quiz-option.wrong")).toHaveCount(0);
  await expect(firstCard.locator(".quiz-explanation")).toBeHidden();
  await expect(page.locator("#quizSubmit")).toBeDisabled();

  // One wrong answer out of five still passes (3 needed).
  await answerLevel(page, 0, 1);

  await expect(page.locator("#quizResult")).toContainText("Level 1 passed!");
  await expect(page.locator(".quiz-explanation").first()).toBeVisible();
  await expect(page.locator(".quiz-explanation").first()).toContainText(FIRST_LESSON.quiz[0].explanation.English);
  await expect(firstCard.locator(".quiz-option.wrong")).toHaveCount(1);
  await expect(firstCard.locator(".quiz-option.correct")).toHaveCount(1);
  await expect(page.locator(".quiz-submit-bar")).toBeHidden();
});

test("failing a level keeps the next one locked", async ({ page }) => {
  await register(page);
  await openFirstLesson(page);
  await page.locator('[data-action*="startQuiz"]').first().click();

  await answerLevel(page, 0, 3);

  await expect(page.locator("#quizResult")).toContainText("Keep practising!");
  await expect(page.locator(".quiz-level-tab").nth(1)).toBeDisabled();
});

test("progress survives a reload and logging back in", async ({ page }) => {
  await register(page);
  await openFirstLesson(page);
  await finishLesson(page);
  const questions = QUESTIONS;

  await page.reload();
  await expect(page.locator("#app")).toContainText(stars(10 + questions));

  await page.locator('[data-action="logout()"]').click();
  await expect(page.locator("#accountArea")).not.toContainText(STUDENT.name);

  await page.locator('[data-action^="showAuthScreen"]').first().click();
  const form = page.locator('form[data-submit="handleLogin(event)"]');
  await form.locator('input[name="studentName"]').fill(STUDENT.name);
  await form.locator('input[type="password"]').fill(STUDENT.pin);
  await form.locator('button[type="submit"], button:not([type])').first().click();

  await expect(page.locator("#app")).toContainText(stars(10 + questions));
});

test("practice lists the weak quiz and the wrong answers", async ({ page }) => {
  await register(page);

  // Nothing to practise yet.
  await page.locator('.sidebar [data-nav="progress"]').click();
  await page.locator('#app [data-action="showWrongAnswerPractice()"]').click();
  await expect(page.locator(".practice-empty")).toBeVisible();

  // Pass level 1 with 3 of 5: passed, but not well enough to leave Practice.
  await page.locator('.sidebar [data-nav="home"]').click();
  await openFirstLesson(page);
  await page.locator('[data-action*="startQuiz"]').first().click();
  await answerLevel(page, 0, 2);
  await expect(page.locator("#quizResult")).toContainText("Level 1 passed!");

  await page.locator('.sidebar [data-nav="progress"]').click();
  await page.locator('#app [data-action="showWrongAnswerPractice()"]').click();
  await expect(page.locator(".weak-level-card")).toHaveCount(1);
  await expect(page.locator(".practice-card")).toHaveCount(2);

  // Answer a practice question and see the explanation.
  const card = page.locator(".practice-card").first();
  await card.locator(".quiz-option").nth(ANSWERS[0]).click();
  await card.locator(".practice-check").click();
  await expect(card.locator(".quiz-explanation")).toBeVisible();

  // Retry the weak level from Practice.
  await page.locator('.weak-level-card [data-action^="retryLevel"]').click();
  await expect(page.locator(".quiz-card")).toHaveCount(PER_LEVEL);
});

test("the theme toggle switches dark mode and remembers it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.locator("#themeToggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator("#themeToggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the assistant answers a suggested question from offline knowledge", async ({ page }) => {
  await register(page);

  await page.locator("#chatFab").click();
  await expect(page.locator("#chatOverlay")).toBeVisible();

  await page.locator(".suggestions [data-action]").first().click();

  await expect(page.locator("#chatMessages .user-message")).toHaveCount(1);
  await expect(page.locator("#chatMessages .bot-message").last()).toContainText("Offline Knowledge");

  await page.locator("#closeChat").click();
  await expect(page.locator("#chatOverlay")).toBeHidden();
});

test("the assistant answers in the language of the question", async ({ page }) => {
  await register(page);
  await page.locator("#chatFab").click();

  // An English exchange first, so there is something to clear.
  await page.locator(".suggestions [data-action]").first().click();
  await expect(page.locator("#chatMessages .message")).toHaveCount(3);

  // Switch the chat (not the app) to Telugu: a fresh conversation in Telugu.
  await page.locator('[data-chat-language="Telugu"]').click();
  await expect(page.locator("#chatMessages .message")).toHaveCount(1);
  await expect(page.locator("#chatMessages .bot-message").first()).toHaveAttribute("data-language", "Telugu");
  await expect(page.locator('[data-chat-language="Telugu"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#chatInput")).toHaveAttribute("placeholder", "మీ ప్రశ్న అడగండి...");

  // The microphone listens in Telugu, and can be switched to English for
  // learners who ask in English (the answer stays in Telugu).
  const micLanguage = page.locator("#voiceLanguageButton");
  await expect(micLanguage).toBeVisible();
  await expect(micLanguage).toHaveText("తె");
  await micLanguage.click();
  await expect(micLanguage).toHaveText("EN");
  await expect(page.locator("#voiceInputStatus")).toContainText("ఆంగ్లం");
  await micLanguage.click();
  await expect(micLanguage).toHaveText("తె");
  await page.locator(".suggestions [data-action]").first().click();
  await expect(page.locator("#chatMessages .bot-message").last()).toContainText("ఆఫ్‌లైన్ జ్ఞానం");
  await expect(page.locator("#chatMessages .bot-message").last()).toHaveAttribute("data-language", "Telugu");

  // A question typed in another language is still answered in the chat
  // language: Hindi and English questions get Telugu answers here.
  await page.locator("#chatInput").fill("पानी क्यों महत्वपूर्ण है?");
  await page.locator("#sendChat").click();
  await expect(page.locator("#chatMessages .bot-message").last()).toHaveAttribute("data-language", "Telugu");
  await expect(page.locator("#chatMessages .bot-message").last()).toContainText("ఆఫ్‌లైన్ జ్ఞానం");

  await page.locator("#chatInput").fill("Why is water important?");
  await page.locator("#sendChat").click();
  await expect(page.locator("#chatMessages .bot-message")).toHaveCount(4);
  await expect(page.locator("#chatMessages .bot-message").last()).toHaveAttribute("data-language", "Telugu");

  // The rest of the app stays in English.
  await expect(page.locator('.sidebar [data-i18n="home"]')).toHaveText("Home");

  // Every answer has a read-aloud button (greeting + three answers), and
  // read-aloud can be switched on.
  await expect(page.locator("#chatMessages .bot-message .speak-answer-button")).toHaveCount(4);
  await page.locator("#autoSpeakToggle").click();
  await expect(page.locator("#autoSpeakToggle")).toHaveAttribute("aria-pressed", "true");
});

test("a typed Telugu question still gets a Telugu answer when the AI models cannot load", async ({ page }) => {
  await register(page);
  await page.locator("#chatFab").click();
  await page.locator('[data-chat-language="Telugu"]').click();

  // Not a suggestion and not a lesson title: it needs the translator and
  // the model, which beforeEach blocks.
  await page.locator("#chatInput").fill("చెట్లు ఎందుకు ముఖ్యమైనవి?");
  await page.locator("#sendChat").click();

  const answer = page.locator("#chatMessages .bot-message:not(.thinking)").nth(1);
  await expect(answer).toBeVisible({ timeout: 30_000 });
  await expect(answer).toHaveAttribute("data-language", "Telugu");
  await expect(page.locator("#chatMessages .thinking")).toHaveCount(0);
});

test("the shell follows the chosen language", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('.sidebar [data-i18n="home"]')).toHaveText("Home");

  await chooseLanguage(page, "Telugu");
  await expect(page.locator('.sidebar [data-i18n="home"]')).toHaveText("హోమ్");

  await page.locator('.sidebar [data-nav="learn"]').click();
  await chooseLanguage(page, "Hindi");
  await expect(page.locator('.sidebar [data-i18n="home"]')).toHaveText("होम");
});

test("the app and a lesson load offline after the first visit", async ({ page, context }) => {
  await register(page);

  // Wait until the service worker has finished caching the app shell.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name !== "gyaan-setu-ai-v1");
    const sizes = await Promise.all(names.map(async name => (await (await caches.open(name)).keys()).length));
    return Math.max(0, ...sizes);
  })).toBeGreaterThan(10);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator("#accountArea")).toContainText(STUDENT.name);
  await expect(page.locator("#networkText")).toHaveText("Offline Ready");

  await openFirstLesson(page);
  await expect
    .poll(() => page.locator("#app img").first().evaluate(image => image.naturalWidth))
    .toBeGreaterThan(0);
});

test("no page markup still uses inline event handlers", async ({ page }) => {
  await register(page);
  await openFirstLesson(page);

  const inline = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .flatMap(element => element.getAttributeNames())
      .filter(name => /^on[a-z]+$/.test(name))
  );

  expect(inline).toEqual([]);
});
