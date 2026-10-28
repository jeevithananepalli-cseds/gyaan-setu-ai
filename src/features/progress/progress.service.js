import { learningData } from "../../content/index.js";
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { getClassName } from "../../i18n/index.js";

// ======================================================
// LESSON PROGRESS
// ======================================================

export function lessonKey(
  classNumber,
  chapterIndex,
  lessonIndex
) {

  return `${classNumber}-${chapterIndex}-${lessonIndex}`;
}


export function isLessonComplete(
  chapterIndex,
  lessonIndex
) {

  const key =
    lessonKey(
      state.selectedClass,
      chapterIndex,
      lessonIndex
    );


  return Boolean(
    state.completedLessons[key]
  );
}


export function markLessonComplete(
  chapterIndex,
  lessonIndex,
  score,
  total
) {

  const key =
    lessonKey(
      state.selectedClass,
      chapterIndex,
      lessonIndex
    );

  const wasAlreadyComplete =
    Boolean(state.completedLessons[key]);


  state.completedLessons[key] = {

    completed: true,
    score: score,
    total: total

  };


  if (!wasAlreadyComplete) {
    state.experiencePoints += 10 + score;
  }


  saveAccountState();
}


export function rememberWrongAnswer(
  chapterIndex,
  lessonIndex,
  questionIndex,
  selectedOption,
  correctOption
) {

  const exists =
    state.wrongAnswers.some(
      item =>
        item.classNumber === state.selectedClass &&
        item.chapterIndex === chapterIndex &&
        item.lessonIndex === lessonIndex &&
        item.questionIndex === questionIndex
    );


  if (exists) {
    return;
  }


  state.wrongAnswers.push({
    classNumber: state.selectedClass,
    chapterIndex,
    lessonIndex,
    questionIndex,
    selectedOption,
    correctOption
  });

  saveAccountState();
}


export function clearWrongAnswer(
  classNumber,
  chapterIndex,
  lessonIndex,
  questionIndex
) {

  state.wrongAnswers =
    state.wrongAnswers.filter(
      item =>
        !(
          item.classNumber === classNumber &&
          item.chapterIndex === chapterIndex &&
          item.lessonIndex === lessonIndex &&
          item.questionIndex === questionIndex
        )
    );

  saveAccountState();
}


// ======================================================
// CLASS PROGRESS
// ======================================================

export function getClassProgress() {

  if (!state.selectedClass) {

    return {
      complete: 0,
      total: 0,
      percent: 0
    };

  }


  const classData =
    learningData[
      `class${state.selectedClass}`
    ];


  let total = 0;

  let complete = 0;


  classData.chapters.forEach(
    (chapter, chapterIndex) => {

      chapter.lessons.forEach(
        (lesson, lessonIndex) => {

          total++;


          if (
            isLessonComplete(
              chapterIndex,
              lessonIndex
            )
          ) {

            complete++;

          }

        }
      );

    }
  );


  const percent =
    total === 0
      ? 0
      : Math.round(
          (complete / total) * 100
        );


  return {

    complete,
    total,
    percent

  };
}


// ======================================================
// OVERALL PROGRESS
// ======================================================

export function getOverallProgress() {

  let totalLessons = 0;

  let completed = 0;


  Object.keys(
    learningData
  ).forEach(
    classKey => {

      const classNumber =
        Number(
          classKey.replace(
            "class",
            ""
          )
        );


      const classData =
        learningData[classKey];


      classData.chapters.forEach(
        (chapter, chapterIndex) => {

          chapter.lessons.forEach(
            (lesson, lessonIndex) => {

              totalLessons++;


              const key =
                lessonKey(
                  classNumber,
                  chapterIndex,
                  lessonIndex
                );


              if (
                state.completedLessons[key]
              ) {

                completed++;

              }

            }
          );

        }
      );

    }
  );


  const percent =
    totalLessons === 0
      ? 0
      : Math.round(
          (completed / totalLessons) * 100
        );


  return {

    totalLessons,
    completed,
    percent

  };
}


// ======================================================
// SAVE LAST LESSON
// ======================================================

export function saveLastLesson(
  chapterIndex,
  lessonIndex
) {

  state.lastLesson = {

    classNumber:
      state.selectedClass,

    chapterIndex:
      chapterIndex,

    lessonIndex:
      lessonIndex

  };


  saveAccountState();
}


// ======================================================
// GET LAST LESSON DETAILS
// ======================================================

export function getLastLessonDetails() {

  if (!state.lastLesson) {

    return null;

  }


  try {

    const classData =
      learningData[
        `class${state.lastLesson.classNumber}`
      ];


    const chapter =
      classData.chapters[
        state.lastLesson.chapterIndex
      ];


    const lesson =
      chapter.lessons[
        state.lastLesson.lessonIndex
      ];


    return {

      title:
        lesson.title[
          state.selectedLanguage
        ],

      className:
        getClassName(
          state.lastLesson.classNumber
        )

    };

  }

  catch (error) {

    return null;

  }
}


export function getClassProgressFor(classNumber) {
  const previousClass = state.selectedClass;
  state.selectedClass = classNumber;
  const progress = getClassProgress();
  state.selectedClass = previousClass;
  return progress;
}
