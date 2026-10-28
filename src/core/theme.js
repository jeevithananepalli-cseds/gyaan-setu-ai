// Light and dark theme. Follows the device setting until the learner picks
// one with the switch in the top bar; that choice is then remembered.
// index.html applies the saved theme before the page is drawn, so there is no
// flash of the wrong colours.
import { registerActions } from "./actions.js";
import { getItem, setItem } from "./storage.js";

export const THEME_KEY = "gyaanTheme";

const THEME_COLORS = { light: "#312e81", dark: "#0f1024" };

function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function savedTheme() {
  const theme = getItem(THEME_KEY);
  return theme === "dark" || theme === "light" ? theme : null;
}

export function currentTheme() {
  return savedTheme() || systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.dataset.theme = theme;
  }
}

export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  setItem(THEME_KEY, next);
  applyTheme(next);
}

export function initTheme() {
  applyTheme(currentTheme());

  // Keep following the device until the learner chooses.
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (!savedTheme()) applyTheme(systemTheme());
  });
}

registerActions({ toggleTheme });
