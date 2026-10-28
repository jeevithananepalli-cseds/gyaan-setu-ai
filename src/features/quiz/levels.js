// Quiz levels: a lesson's questions are split into levels of five. A level
// opens once the one before it is passed, and the lesson counts as complete
// when its last level is passed.
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { lessonKey, markLessonComplete } from "../progress/progress.service.js";

export const QUESTIONS_PER_LEVEL = 5;

// Correct answers needed to pass a level of five.
export const PASS_MARK = 3;

// Below this a passed level still shows up in Practice.
export const GOOD_SCORE = 4;

// [{ index, start, questions }] for a lesson.
export function getLevels(lesson) {
  const quiz = lesson?.quiz || [];
  const levels = [];

  for (let start = 0; start < quiz.length; start += QUESTIONS_PER_LEVEL) {
    levels.push({
      index: levels.length,
      start,
      questions: quiz.slice(start, start + QUESTIONS_PER_LEVEL)
    });
  }

  return levels;
}

export function passMarkFor(questionCount) {
  return Math.min(PASS_MARK, questionCount);
}

// The saved results of one lesson: { [levelIndex]: { best, total, attempts, passed } }.
export function getLevelResults(classNumber, chapterIndex, lessonIndex) {
  return state.quizLevels[lessonKey(classNumber, chapterIndex, lessonIndex)] || {};
}

export function isLevelPassed(classNumber, chapterIndex, lessonIndex, levelIndex) {
  return Boolean(getLevelResults(classNumber, chapterIndex, lessonIndex)[levelIndex]?.passed);
}

export function isLevelUnlocked(classNumber, chapterIndex, lessonIndex, levelIndex) {
  return levelIndex === 0 || isLevelPassed(classNumber, chapterIndex, lessonIndex, levelIndex - 1);
}

// The level to open by default: the first one not passed yet, or the last.
export function nextLevelIndex(classNumber, chapterIndex, lessonIndex, levelCount) {
  for (let index = 0; index < levelCount; index++) {
    if (!isLevelPassed(classNumber, chapterIndex, lessonIndex, index)) return index;
  }
  return Math.max(0, levelCount - 1);
}

// Saves an attempt. Returns { passed, firstPass, lessonCompleted }.
export function recordLevelResult(classNumber, chapterIndex, lessonIndex, levelIndex, score, total, levelCount) {
  const key = lessonKey(classNumber, chapterIndex, lessonIndex);
  const results = state.quizLevels[key] || (state.quizLevels[key] = {});
  const previous = results[levelIndex] || { best: 0, total, attempts: 0, passed: false };
  const passed = score >= passMarkFor(total);

  results[levelIndex] = {
    best: Math.max(previous.best, score),
    total,
    attempts: previous.attempts + 1,
    passed: previous.passed || passed
  };

  const firstPass = passed && !previous.passed;
  const allPassed = Array.from({ length: levelCount }, (_, index) => results[index]?.passed).every(Boolean);
  const lessonCompleted = firstPass && allPassed;

  if (lessonCompleted) {
    const best = Object.values(results).reduce((sum, result) => sum + result.best, 0);
    const questions = Object.values(results).reduce((sum, result) => sum + result.total, 0);
    const previousClass = state.selectedClass;

    // markLessonComplete works on the selected class.
    state.selectedClass = classNumber;
    markLessonComplete(chapterIndex, lessonIndex, best, questions);
    state.selectedClass = previousClass;
  }
  else {
    saveAccountState();
  }

  return { passed, firstPass, lessonCompleted };
}

// Every attempted level that went less than well, weakest first:
// [{ classNumber, chapterIndex, lessonIndex, levelIndex, best, total, attempts, passed }]
export function getWeakLevels() {
  const weak = [];

  for (const [key, results] of Object.entries(state.quizLevels)) {
    const [classNumber, chapterIndex, lessonIndex] = key.split("-").map(Number);

    for (const [levelIndex, result] of Object.entries(results)) {
      if (result.best >= Math.min(GOOD_SCORE, result.total)) continue;
      weak.push({ classNumber, chapterIndex, lessonIndex, levelIndex: Number(levelIndex), ...result });
    }
  }

  return weak.sort((a, b) => a.best / a.total - b.best / b.total || a.classNumber - b.classNumber);
}
