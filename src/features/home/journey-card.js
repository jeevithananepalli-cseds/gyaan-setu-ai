import { learningData } from "../../content/index.js";
import { state } from "../../core/state.js";
import { getClassProgressFor } from "../progress/progress.service.js";
import { getClassName, textByLanguage } from "../../i18n/index.js";

// ======================================================
// LEARNING JOURNEY PRESENTATION
// ======================================================

// A numbered class tile. The tone cycles through the pastel palette.
export function journeyClassCard(number, icon) {
  const progress = getClassProgressFor(number);
  const lessons = textByLanguage("lessons", "పాఠాలు", "पाठ");

  return `
    <button
      class="class-tile tone-${(number - 1) % 5} ${state.selectedClass === number ? "selected" : ""}"
      data-action="selectClass(${number})"
      aria-label="${getClassName(number)}, ${progress.complete}/${progress.total} ${lessons}"
    >
      <strong>${number}</strong>
      <span class="class-tile-icon" aria-hidden="true">${icon}</span>
      <small>${progress.complete}/${progress.total}</small>
    </button>
  `;
}


export function getJourneyLessons() {
  const classNumber = state.selectedClass || 1;
  const classData = learningData[`class${classNumber}`];
  if (!classData) {
    return [];
  }
  return classData.chapters.flatMap((chapter, chapterIndex) =>
    chapter.lessons.map((lesson, lessonIndex) => ({
      chapter,
      lesson,
      chapterIndex,
      lessonIndex
    }))
  );
}
