import { beforeEach, describe, expect, it } from "vitest";
import { state } from "../../src/core/state.js";
import { isLessonComplete } from "../../src/features/progress/progress.service.js";
import {
  getLevels,
  getWeakLevels,
  isLevelPassed,
  isLevelUnlocked,
  nextLevelIndex,
  passMarkFor,
  recordLevelResult
} from "../../src/features/quiz/levels.js";

const lessonOfTen = { quiz: Array.from({ length: 10 }, (_, index) => ({ id: index })) };

beforeEach(() => {
  localStorage.clear();
  state.accounts = {};
  state.currentAccountId = null;
  state.selectedClass = 1;
  state.completedLessons = {};
  state.quizLevels = {};
  state.experiencePoints = 0;
});

describe("getLevels", () => {
  it("splits a lesson's quiz into levels of five", () => {
    const levels = getLevels(lessonOfTen);

    expect(levels).toHaveLength(2);
    expect(levels[0].start).toBe(0);
    expect(levels[1].start).toBe(5);
    expect(levels[1].questions[0]).toEqual({ id: 5 });
  });

  it("returns no levels for a lesson without a quiz", () => {
    expect(getLevels({})).toEqual([]);
  });
});

describe("passMarkFor", () => {
  it("needs 3 of 5, or every question in a shorter level", () => {
    expect(passMarkFor(5)).toBe(3);
    expect(passMarkFor(2)).toBe(2);
  });
});

describe("level unlocking", () => {
  it("opens only the first level at the start", () => {
    expect(isLevelUnlocked(1, 0, 0, 0)).toBe(true);
    expect(isLevelUnlocked(1, 0, 0, 1)).toBe(false);
    expect(nextLevelIndex(1, 0, 0, 2)).toBe(0);
  });

  it("keeps the next level locked after a failed attempt", () => {
    const result = recordLevelResult(1, 0, 0, 0, 2, 5, 2);

    expect(result.passed).toBe(false);
    expect(isLevelUnlocked(1, 0, 0, 1)).toBe(false);
  });

  it("opens the next level once the level is passed", () => {
    const result = recordLevelResult(1, 0, 0, 0, 3, 5, 2);

    expect(result).toEqual({ passed: true, firstPass: true, lessonCompleted: false });
    expect(isLevelPassed(1, 0, 0, 0)).toBe(true);
    expect(isLevelUnlocked(1, 0, 0, 1)).toBe(true);
    expect(nextLevelIndex(1, 0, 0, 2)).toBe(1);
  });

  it("keeps a level passed after a later poor attempt and remembers the best score", () => {
    recordLevelResult(1, 0, 0, 0, 4, 5, 2);
    recordLevelResult(1, 0, 0, 0, 1, 5, 2);

    expect(isLevelPassed(1, 0, 0, 0)).toBe(true);
    expect(state.quizLevels["1-0-0"][0]).toMatchObject({ best: 4, attempts: 2, passed: true });
  });
});

describe("lesson completion", () => {
  it("completes the lesson when the last level is passed", () => {
    recordLevelResult(1, 0, 0, 0, 5, 5, 2);
    const result = recordLevelResult(1, 0, 0, 1, 4, 5, 2);

    expect(result.lessonCompleted).toBe(true);
    expect(isLessonComplete(0, 0)).toBe(true);
    expect(state.completedLessons["1-0-0"]).toMatchObject({ score: 9, total: 10 });
  });

  it("completes a lesson in another class without changing the selected class", () => {
    state.selectedClass = 2;
    recordLevelResult(5, 1, 0, 0, 5, 5, 2);
    recordLevelResult(5, 1, 0, 1, 5, 5, 2);

    expect(state.selectedClass).toBe(2);
    expect(state.completedLessons["5-1-0"]).toBeDefined();
  });
});

describe("getWeakLevels", () => {
  it("lists levels scored below 4 of 5, weakest first", () => {
    recordLevelResult(1, 0, 0, 0, 3, 5, 2);
    recordLevelResult(2, 1, 0, 0, 1, 5, 2);
    recordLevelResult(3, 0, 0, 0, 5, 5, 2);

    const weak = getWeakLevels();

    expect(weak.map(level => level.classNumber)).toEqual([2, 1]);
    expect(weak[0]).toMatchObject({ chapterIndex: 1, lessonIndex: 0, levelIndex: 0, best: 1 });
  });

  it("drops a level once it is scored well", () => {
    recordLevelResult(1, 0, 0, 0, 2, 5, 2);
    recordLevelResult(1, 0, 0, 0, 5, 5, 2);

    expect(getWeakLevels()).toEqual([]);
  });
});
