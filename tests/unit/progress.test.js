import { beforeEach, describe, expect, it } from "vitest";
import { learningData } from "../../src/content/index.js";
import { state } from "../../src/core/state.js";
import {
  getClassProgress,
  isLessonComplete,
  lessonKey,
  markLessonComplete
} from "../../src/features/progress/progress.service.js";

const classOneLessons = learningData.class1.chapters
  .reduce((count, chapter) => count + chapter.lessons.length, 0);

beforeEach(() => {
  localStorage.clear();
  state.accounts = {};
  state.currentAccountId = null;
  state.selectedClass = 1;
  state.completedLessons = {};
  state.experiencePoints = 0;
});

describe("lessonKey", () => {
  it("joins class, chapter and lesson", () => {
    expect(lessonKey(3, 1, 0)).toBe("3-1-0");
  });
});

describe("markLessonComplete", () => {
  it("records the score and marks the lesson complete", () => {
    expect(isLessonComplete(0, 0)).toBe(false);

    markLessonComplete(0, 0, 2, 3);

    expect(isLessonComplete(0, 0)).toBe(true);
    expect(state.completedLessons["1-0-0"]).toEqual({ completed: true, score: 2, total: 3 });
  });

  it("awards 10 points plus the score, once per lesson", () => {
    markLessonComplete(0, 0, 2, 3);
    expect(state.experiencePoints).toBe(12);

    markLessonComplete(0, 0, 3, 3);
    expect(state.experiencePoints).toBe(12);
    expect(state.completedLessons["1-0-0"].score).toBe(3);
  });

  it("keeps lessons of different classes apart", () => {
    markLessonComplete(0, 0, 3, 3);
    state.selectedClass = 2;

    expect(isLessonComplete(0, 0)).toBe(false);
  });
});

describe("getClassProgress", () => {
  it("is empty when no class is selected", () => {
    state.selectedClass = null;

    expect(getClassProgress()).toEqual({ complete: 0, total: 0, percent: 0 });
  });

  it("counts completed lessons against the class total", () => {
    markLessonComplete(0, 0, 3, 3);
    const progress = getClassProgress();

    expect(progress.total).toBe(classOneLessons);
    expect(progress.complete).toBe(1);
    expect(progress.percent).toBe(Math.round((1 / classOneLessons) * 100));
  });
});
