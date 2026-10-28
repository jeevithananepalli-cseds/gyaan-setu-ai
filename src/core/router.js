// Top-level navigation helpers.
import { registerActions } from "./actions.js";
import { state } from "./state.js";
import { showLanguageScreen } from "../features/onboarding/language.view.js";

// ======================================================
// NAVIGATION
// ======================================================

export function showLearn() {

  if (!state.currentAccountId) {
    showLanguageScreen();
    return;
  }

  setActiveNav("learn");
  showLanguageScreen();
}


// The sidebar (desktop) and the bottom bar (mobile) both carry the same
// destinations, marked with data-nav, so highlight by name in both.
// Older callers pass a position instead of a name.
const NAV_BY_INDEX = ["home", "learn", "ask", "progress"];

export function setActiveNav(destination) {

  const name = typeof destination === "number"
    ? NAV_BY_INDEX[destination]
    : destination;

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.nav === name);
  });
}


registerActions({ showLearn });
