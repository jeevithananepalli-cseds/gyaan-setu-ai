#!/usr/bin/env node
// Checks every class in src/content/curriculum before it ships:
//   - each class has at least MIN_CHAPTERS chapters
//   - title, description, explanation, key points and activity exist in all
//     three languages
//   - each lesson has at least MIN_QUESTIONS quiz questions, in whole levels
//     of QUESTIONS_PER_LEVEL (see src/features/quiz/levels.js)
//   - every question has text, an explanation, and four options per language
//     (or two, for True/False), the same number in each language, and its
//     answer index points at one of them
//   - the lesson image exists under public/
// It also warns when every answer in a lesson is the same option, which
// makes a quiz guessable.
//
// Usage: npm run validate:content

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const CURRICULUM_DIR = path.join(ROOT_DIR, "src", "content", "curriculum");
const LANGUAGES = ["English", "Telugu", "Hindi"];
const OPTION_COUNTS = [4, 2];
const MIN_CHAPTERS = 10;
const QUESTIONS_PER_LEVEL = 5;
const MIN_QUESTIONS = 10;

const errors = [];
const warnings = [];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function checkLocalised(value, where, field) {
  for (const language of LANGUAGES) {
    if (!hasText(value?.[language])) {
      errors.push(`${where}: ${field} is missing in ${language}`);
    }
  }
}

function checkImage(lesson, where) {
  if (!hasText(lesson.image)) {
    errors.push(`${where}: image is missing`);
    return;
  }

  if (!fs.existsSync(path.join(PUBLIC_DIR, lesson.image.replace(/^\.\//, "")))) {
    errors.push(`${where}: image not found: ${lesson.image}`);
  }
}

function checkQuiz(lesson, where) {
  const quiz = lesson.quiz;

  if (!Array.isArray(quiz) || quiz.length < MIN_QUESTIONS) {
    errors.push(`${where}: needs at least ${MIN_QUESTIONS} quiz questions, has ${quiz?.length ?? 0}`);
  }
  else if (quiz.length % QUESTIONS_PER_LEVEL !== 0) {
    errors.push(`${where}: ${quiz.length} questions do not make whole levels of ${QUESTIONS_PER_LEVEL}`);
  }

  (quiz || []).forEach((item, index) => {
    const question = `${where} question ${index + 1}`;
    const expected = item.options?.English?.length;

    checkLocalised(item.question, question, "question");
    checkLocalised(item.explanation, question, "explanation");

    for (const language of LANGUAGES) {
      const options = item.options?.[language];
      if (!Array.isArray(options) || !OPTION_COUNTS.includes(options.length)) {
        errors.push(`${question}: expected 4 options (or 2 for True/False) in ${language}, found ${options?.length ?? 0}`);
      }
      else if (options.length !== expected) {
        errors.push(`${question}: ${language} has ${options.length} options but English has ${expected}`);
      }
      else if (!options.every(hasText)) {
        errors.push(`${question}: an option is empty in ${language}`);
      }
    }

    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= (expected || 0)) {
      errors.push(`${question}: answer ${item.answer} does not point at an option`);
    }
  });

  const answers = (quiz || []).filter(item => item.options?.English?.length === 4).map(item => item.answer);
  if (answers.length >= QUESTIONS_PER_LEVEL && new Set(answers).size === 1) {
    warnings.push(`${where}: every answer is option ${"ABCD"[answers[0]]}`);
  }
}

function checkLesson(lesson, where) {
  checkLocalised(lesson.title, where, "title");
  checkLocalised(lesson.explanation, where, "explanation");
  checkLocalised(lesson.activity, where, "activity");

  for (const language of LANGUAGES) {
    const points = lesson.keyPoints?.[language];
    if (!Array.isArray(points) || points.length === 0 || !points.every(hasText)) {
      errors.push(`${where}: keyPoints are missing in ${language}`);
    }
  }

  checkImage(lesson, where);
  checkQuiz(lesson, where);
}

function loadLearningData() {
  const data = {};
  const files = fs.readdirSync(CURRICULUM_DIR)
    .map(name => name.match(/^class-(\d+)\.json$/))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]));

  for (const match of files) {
    data[`class${match[1]}`] = JSON.parse(fs.readFileSync(path.join(CURRICULUM_DIR, match[0]), "utf8"));
  }

  return data;
}

const learningData = loadLearningData();
let lessonCount = 0;
let questionCount = 0;

for (const [classKey, classData] of Object.entries(learningData)) {
  checkLocalised(classData.subject, classKey, "subject");

  if (!Array.isArray(classData.chapters) || classData.chapters.length < MIN_CHAPTERS) {
    errors.push(`${classKey}: needs at least ${MIN_CHAPTERS} chapters, has ${classData.chapters?.length ?? 0}`);
  }

  const ids = new Set();

  (classData.chapters || []).forEach(chapter => {
    const chapterWhere = `${classKey} / ${chapter.id}`;

    if (ids.has(chapter.id)) errors.push(`${chapterWhere}: duplicate chapter id`);
    ids.add(chapter.id);

    checkLocalised(chapter.title, chapterWhere, "title");
    checkLocalised(chapter.description, chapterWhere, "description");

    if (!Array.isArray(chapter.lessons) || chapter.lessons.length === 0) {
      errors.push(`${chapterWhere}: has no lessons`);
      return;
    }

    chapter.lessons.forEach(lesson => {
      lessonCount++;
      questionCount += lesson.quiz?.length || 0;
      checkLesson(lesson, `${chapterWhere} / ${lesson.id}`);
    });
  });
}

console.log(`Checked ${lessonCount} lessons and ${questionCount} questions in ${Object.keys(learningData).length} classes.`);

if (warnings.length) {
  console.warn(`\n${warnings.length} warning(s):`);
  warnings.forEach(message => console.warn(`  - ${message}`));
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.slice(0, 40).forEach(message => console.error(`  - ${message}`));
  if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
  process.exit(1);
}

console.log("Content is valid.");
