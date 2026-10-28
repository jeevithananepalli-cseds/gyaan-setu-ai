import { ACCOUNTS_KEY, CURRENT_ACCOUNT_KEY } from "../../config/constants.js";
import { registerActions } from "../../core/actions.js";
import { state } from "../../core/state.js";
import { getItem, removeItem, setItem } from "../../core/storage.js";
import { renderAccountArea, showAuthScreen } from "./auth.view.js";
import { showHome } from "../home/home.view.js";
import { showLanguageScreen } from "../onboarding/language.view.js";
import { textByLanguage } from "../../i18n/index.js";

export function loadCurrentAccount() {

  const account =
    state.currentAccountId
      ? state.accounts[state.currentAccountId]
      : null;


  if (!account) {
    state.currentAccountId = null;
    return;
  }


  state.selectedLanguage = account.language || "English";
  state.selectedClass = Number(account.classNumber) || null;
  state.completedLessons = account.progress || {};
  state.lastLesson = account.lastLesson || null;
  state.wrongAnswers = account.wrongAnswers || [];
  state.quizLevels = account.quizLevels || {};
  state.experiencePoints = Number(account.experiencePoints) || 0;
}


export function saveAccounts() {

  setItem(
    ACCOUNTS_KEY,
    JSON.stringify(state.accounts)
  );
}


export function saveAccountState() {

  if (!state.currentAccountId || !state.accounts[state.currentAccountId]) {
    return;
  }


  state.accounts[state.currentAccountId].language = state.selectedLanguage;
  state.accounts[state.currentAccountId].classNumber = state.selectedClass;
  state.accounts[state.currentAccountId].progress = state.completedLessons;
  state.accounts[state.currentAccountId].lastLesson = state.lastLesson;
  state.accounts[state.currentAccountId].wrongAnswers = state.wrongAnswers;
  state.accounts[state.currentAccountId].quizLevels = state.quizLevels;
  state.accounts[state.currentAccountId].experiencePoints = state.experiencePoints;

  saveAccounts();
}


export function accountName() {

  return state.currentAccountId && state.accounts[state.currentAccountId]
    ? state.accounts[state.currentAccountId].name
    : "";
}


export async function hashPin(pin) {

  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(
    new Uint8Array(hash)
  )
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}


export function migrateAnonymousProgress() {

  const oldProgress =
    getItem("gyaanProgress");

  if (!oldProgress) {
    return;
  }


  state.completedLessons =
    JSON.parse(oldProgress || "{}");

  state.selectedLanguage =
    getItem("gyaanLanguage") || "English";

  state.selectedClass =
    Number(getItem("gyaanClass")) || null;

  state.lastLesson =
    JSON.parse(
      getItem("gyaanLastLesson") || "null"
    );
}


export function accountIdFromName(name) {

  return name.trim().toLowerCase();
}


export async function handleRegister(event) {

  event.preventDefault();

  const form = event.target;
  const name = form.studentName.value.trim();
  const pin = form.pin.value.trim();
  const id = accountIdFromName(name);


  if (name.length < 2 || !/^\d{4}$/.test(pin)) {
    showAuthScreen(
      "register",
      textByLanguage(
        "Enter a name and a 4-digit PIN.",
        "పేరు మరియు 4 అంకెల పిన్ నమోదు చేయండి.",
        "नाम और 4 अंकों का पिन दर्ज करें।"
      )
    );
    return;
  }


  if (state.accounts[id]) {
    showAuthScreen(
      "register",
      textByLanguage(
        "That student account already exists.",
        "ఆ విద్యార్థి ఖాతా ఇప్పటికే ఉంది.",
        "यह विद्यार्थी खाता पहले से मौजूद है।"
      )
    );
    return;
  }


  if (Object.keys(state.accounts).length === 0) {
    migrateAnonymousProgress();
  }


  state.accounts[id] = {
    name,
    pinHash: await hashPin(pin),
    language: state.selectedLanguage,
    classNumber: state.selectedClass,
    progress: state.completedLessons,
    lastLesson: state.lastLesson,
    wrongAnswers: state.wrongAnswers,
    quizLevels: state.quizLevels,
    experiencePoints: state.experiencePoints
  };

  state.currentAccountId = id;
  setItem(CURRENT_ACCOUNT_KEY, state.currentAccountId);
  saveAccounts();
  renderAccountArea();
  showHome();
}


export async function handleLogin(event) {

  event.preventDefault();

  const form = event.target;
  const id = accountIdFromName(form.studentName.value);
  const account = state.accounts[id];
  const chosenLanguage = state.selectedLanguage;


  if (!account || account.pinHash !== await hashPin(form.pin.value.trim())) {
    showAuthScreen(
      "login",
      textByLanguage(
        "The student name or PIN is incorrect.",
        "విద్యార్థి పేరు లేదా పిన్ తప్పుగా ఉంది.",
        "विद्यार्थी का नाम या पिन गलत है।"
      )
    );
    return;
  }


  state.currentAccountId = id;
  setItem(CURRENT_ACCOUNT_KEY, state.currentAccountId);
  loadCurrentAccount();

  if (state.languageChosenBeforeAuth) {
    state.selectedLanguage = chosenLanguage;
    saveAccountState();
  }

  state.languageChosenBeforeAuth = false;
  renderAccountArea();
  showHome();
}


export function logout() {

  saveAccountState();
  state.currentAccountId = null;
  removeItem(CURRENT_ACCOUNT_KEY);
  state.selectedLanguage = "English";
  state.selectedClass = null;
  state.completedLessons = {};
  state.lastLesson = null;
  state.wrongAnswers = [];
  state.quizLevels = {};
  state.experiencePoints = 0;
  state.languageChosenBeforeAuth = false;
  renderAccountArea();
  showLanguageScreen();
}


registerActions({ handleRegister, handleLogin, logout });
