// Temporary check (deleted after use): a Telugu learner downloads everything
// for offline use, then uses the AI tutor and translation with no network.
// Never touches the microphone.
import { chromium } from "@playwright/test";

const profile = process.argv[2];
const language = process.argv[3] || "Telugu";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const context = await chromium.launchPersistentContext(profile, {
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-webgpu"]
});
const page = context.pages()[0] || (await context.newPage());
page.on("console", m => { if (m.type() === "error") log("console error:", m.text().slice(0, 160)); });

await page.goto("http://localhost:4173/");
await page.locator(`[data-action="selectLanguage('${language}')"]`).click();
await page.locator(`[data-action="showAuthScreen('register')"]`).click();
const form = page.locator('form[data-submit="handleRegister(event)"]');
await form.locator('input[name="studentName"]').fill("Test Learner");
for (const pin of await form.locator('input[type="password"]').all()) await pin.fill("4321");
await form.locator('button[type="submit"], button:not([type])').first().click();
await page.waitForSelector("#accountArea");
log("registered; service worker:", await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)));

await page.locator('.sidebar [data-nav="progress"]').click();
log("panel text:", (await page.locator("#offlinePackage").innerText()).replace(/\s+/g, " ").slice(0, 160));
await page.locator("#downloadOfflineBtn").click();

let lastText = "";
const started = Date.now();
for (;;) {
  const ready = await page.locator("#offlinePackage.ready").count();
  const text = await page.locator("#downloadProgressText").innerText().catch(() => "");
  if (text !== lastText) {
    if (/\d+%/.test(text) && Number(text.match(/(\d+)%/)[1]) % 10 === 0) log("progress:", text);
    if (!/\d+%/.test(text)) log("status:", text);
    lastText = text;
  }
  if (ready) break;
  if (Date.now() - started > 25 * 60 * 1000) throw new Error("download took too long");
  await page.waitForTimeout(1000);
}
log("SAVED after", Math.round((Date.now() - started) / 1000), "s:",
  (await page.locator(".offline-package-saved").innerText()).slice(0, 80));

await context.setOffline(true);
await page.reload();
log("offline; network:", await page.evaluate(() =>
  fetch("https://huggingface.co/?x=" + Date.now()).then(() => "reachable", () => "unreachable")));

await page.locator('.sidebar [data-nav="progress"]').click();
await page.waitForTimeout(1500);
log("still shows saved offline:", await page.locator("#offlinePackage.ready").count() === 1);

await page.locator('.sidebar [data-nav="ask"]').click();
await page.locator("#chatInput").fill("how do birds fly");
await page.locator("#sendChat").click();
const answer = page.locator("#chatMessages .bot-message:not(.thinking)").last();
await page.waitForFunction(() => {
  const all = [...document.querySelectorAll("#chatMessages .bot-message:not(.thinking)")];
  return all.length >= 2;
}, null, { timeout: 5 * 60 * 1000 });
log("offline answer:", (await answer.innerText()).replace(/\s+/g, " ").slice(0, 160));
await context.close();
