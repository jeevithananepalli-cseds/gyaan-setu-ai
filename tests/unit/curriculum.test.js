import { describe, expect, it } from "vitest";
import { learningData } from "../../src/content/index.js";
import { QUESTIONS_PER_LEVEL } from "../../src/features/quiz/levels.js";

const LANGUAGES = ["English", "Telugu", "Hindi"];

const lessons = Object.values(learningData).flatMap(classData =>
  classData.chapters.flatMap(chapter => chapter.lessons)
);
const questions = lessons.flatMap(lesson => lesson.quiz);

describe("learningData", () => {
  it("contains classes 1 to 10", () => {
    expect(Object.keys(learningData)).toEqual(
      Array.from({ length: 10 }, (_, index) => `class${index + 1}`)
    );
  });

  it("gives every class at least 10 chapters", () => {
    for (const classData of Object.values(learningData)) {
      expect(classData.chapters.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("gives every lesson at least two full levels of questions", () => {
    for (const lesson of lessons) {
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(QUESTIONS_PER_LEVEL * 2);
      expect(lesson.quiz.length % QUESTIONS_PER_LEVEL).toBe(0);
    }
  });

  it("gives every question text and an explanation in all three languages", () => {
    for (const item of questions) {
      for (const language of LANGUAGES) {
        expect(item.question[language].trim().length).toBeGreaterThan(0);
        expect(item.explanation[language].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("gives the same number of options in each language, two or four", () => {
    for (const item of questions) {
      const count = item.options.English.length;

      expect([2, 4]).toContain(count);
      expect(item.options.Telugu).toHaveLength(count);
      expect(item.options.Hindi).toHaveLength(count);
    }
  });

  it("points every answer at an existing option", () => {
    for (const item of questions) {
      expect(Number.isInteger(item.answer)).toBe(true);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(item.options.English.length);
    }
  });

  it("does not put every answer in the same position within a lesson", () => {
    for (const lesson of lessons) {
      const positions = new Set(lesson.quiz.map(item => item.answer));
      expect(positions.size).toBeGreaterThan(1);
    }
  });
});
