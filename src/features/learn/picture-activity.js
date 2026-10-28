import { learningData } from "../../content/index.js";
import { registerActions } from "../../core/actions.js";
import { state } from "../../core/state.js";
import { saveAccountState } from "../auth/auth.service.js";
import { resolveLessonImageUrl } from "./lesson-image.js";
import { textByLanguage } from "../../i18n/index.js";

export function renderPictureActivity(
  lesson,
  chapterIndex,
  lessonIndex
) {

  const classData = learningData[`class${state.selectedClass}`];
  const allLessons = classData.chapters
    .flatMap(chapter => chapter.lessons);
  const distractors = allLessons
    .filter(item => item.id !== lesson.id)
    .slice(0, 2)
    .map(item => item.title[state.selectedLanguage]);
  const options = [lesson.title[state.selectedLanguage], ...distractors];


  while (options.length < 3) {
    options.push(
      textByLanguage("Something else", "మరొక విషయం", "कुछ और")
    );
  }


  const pictureImage = resolveLessonImageUrl(lesson);

  return `
    <div class="picture-activity">
      <div class="picture-activity-heading">
        <span class="picture-activity-icon">🖼️</span>
        <div>
          <h3>${textByLanguage("Picture Check", "చిత్రాన్ని గుర్తించండి", "चित्र पहचानें")}</h3>
          <p>${textByLanguage("Look at the picture and choose what this lesson is about.", "చిత్రాన్ని చూసి ఈ పాఠం దేని గురించి చెప్పుతుందో ఎంచుకోండి.", "चित्र देखकर चुनें कि यह पाठ किस बारे में है।")}</p>
        </div>
      </div>
      ${pictureImage
        ? `<img class="picture-activity-image" src="${pictureImage}" alt="${lesson.title[state.selectedLanguage]}" data-fallback-src="./images/lessons/placeholder-education.svg">`
        : `<div class="picture-activity-visual">${lesson.visual || "📘"}</div>`}
      <div class="picture-options">
        ${options.map(
          (option, optionIndex) => `
            <button class="picture-option" data-action="checkPictureAnswer(this, ${optionIndex}, 0)">
              ${option}
            </button>
          `
        ).join("")}
      </div>
      <p class="picture-feedback" aria-live="polite"></p>
    </div>
  `;
}


export function checkPictureAnswer(button, selectedOption, correctOption) {

  const container = button.closest(".picture-activity");
  const buttons = container.querySelectorAll(".picture-option");
  const feedback = container.querySelector(".picture-feedback");

  buttons.forEach(item => item.disabled = true);

  if (selectedOption === correctOption) {
    button.classList.add("practice-correct");
    feedback.textContent = textByLanguage("Correct! +2 XP", "సరైనది! +2 XP", "सही! +2 XP");
    state.experiencePoints += 2;
    saveAccountState();
  }

  else {
    button.classList.add("practice-wrong");
    buttons[correctOption].classList.add("practice-correct");
    feedback.textContent = textByLanguage("Good try!", "మంచి ప్రయత్నం!", "अच्छी कोशिश!");
  }
}


registerActions({ checkPictureAnswer });
