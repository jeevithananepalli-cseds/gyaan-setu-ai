import { state } from "../../core/state.js";
import { textByLanguage, uiText } from "../../i18n/index.js";

export function getBadgeList(completed) {

  const badgeDefinitions = [
    ["🌱", "First Step", "మొదటి అడుగు", "पहला कदम", 1],
    ["⭐", "Quiz Starter", "క్విజ్ స్టార్టర్", "क्विज़ स्टार्टर", 10],
    ["🔥", "Learning Streak", "అభ్యాస పరంపర", "सीखने की निरंतरता", 25],
    ["🏆", "Gyaan Champion", "జ్ఞాన్ ఛాంపియన్", "ज्ञान चैंपियन", 50]
  ];


  return badgeDefinitions
    .map(
      badge => {
        const unlocked = state.experiencePoints >= badge[4] || completed >= badge[4] / 10;

        return `
          <div class="badge-item ${unlocked ? "unlocked" : "locked"}">
            <span>${badge[0]}</span>
            <strong>${textByLanguage(badge[1], badge[2], badge[3])}</strong>
            <small>${unlocked ? textByLanguage("Unlocked", "అన్‌లాక్ అయింది", "अनलॉक है") : `${badge[4]} XP`}</small>
          </div>
        `;
      }
    )
    .join("");
}


// ======================================================
// ACHIEVEMENTS
// ======================================================

export function getAchievements(
  completed
) {

  let html = "";


  if (
    completed >= 1
  ) {

    html += `

      <div class="achievement-card">

        <span>⭐</span>

        <div>

          <strong>
            ${textByLanguage("First Step", "మొదటి అడుగు", "पहला कदम")}
          </strong>

          <p>
            ${textByLanguage("Completed your first lesson", "మీ మొదటి పాఠం పూర్తయింది", "अपना पहला पाठ पूरा किया")}
          </p>

        </div>

      </div>

    `;

  }


  if (
    completed >= 5
  ) {

    html += `

      <div class="achievement-card">

        <span>🔥</span>

        <div>

          <strong>
            ${textByLanguage("Learning Streak", "అభ్యాస పరంపర", "सीखने की निरंतरता")}
          </strong>

          <p>
            ${textByLanguage("Completed 5 lessons", "5 పాఠాలు పూర్తయ్యాయి", "5 पाठ पूरे किए")}
          </p>

        </div>

      </div>

    `;

  }


  if (
    completed >= 10
  ) {

    html += `

      <div class="achievement-card">

        <span>🏅</span>

        <div>

          <strong>
            ${textByLanguage("Learning Explorer", "అభ్యాస అన్వేషకుడు", "सीखने का खोजकर्ता")}
          </strong>

          <p>
            ${textByLanguage("Completed 10 lessons", "10 పాఠాలు పూర్తయ్యాయి", "10 पाठ पूरे किए")}
          </p>

        </div>

      </div>

    `;

  }


  if (
    completed >= 20
  ) {

    html += `

      <div class="achievement-card">

        <span>🏆</span>

        <div>

          <strong>
            ${textByLanguage("Gyaan Champion", "జ్ఞాన్ ఛాంపియన్", "ज्ञान चैंपियन")}
          </strong>

          <p>
            ${textByLanguage("Completed 20 lessons", "20 పాఠాలు పూర్తయ్యాయి", "20 पाठ पूरे किए")}
          </p>

        </div>

      </div>

    `;

  }


  if (!html) {

    html = `

      <div class="achievement-card">

        <span>🎯</span>

        <div>

          <strong>
            ${uiText("startLearning")}
          </strong>

          <p>
            ${textByLanguage(
              "Complete your first lesson to unlock an achievement.",
              "విజయాన్ని అన్‌లాక్ చేయడానికి మీ మొదటి పాఠాన్ని పూర్తి చేయండి.",
              "उपलब्धि पाने के लिए अपना पहला पाठ पूरा करें।"
            )}
          </p>

        </div>

      </div>

    `;

  }


  return html;
}
