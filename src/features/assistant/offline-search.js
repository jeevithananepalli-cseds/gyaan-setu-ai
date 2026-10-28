import { detectLanguage } from "../../config/languages.js";
import { learningData } from "../../content/index.js";
import { offlineKnowledge } from "../../content/knowledge-base.js";
import { state } from "../../core/state.js";

// ======================================================
// SMART OFFLINE SEARCH
// ======================================================

export function cleanText(text) {

  return String(text)
    .toLowerCase()
    .replace(
      /[.,!?;:'"()[\]{}]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


export function getQuestionTokens(
  question
) {

  let words =
    cleanText(question)
      .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
      .split(" ")
      .filter(
        word =>
          word.length > 1
      );


  const stopWords =
    new Set([

        "what",
        "why",
        "when",
        "where",
        "which",
        "who",
        "how",
        "does",
        "do",
        "are",
        "is",
        "the",
        "a",
        "an",
        "to",
        "of",
        "for",
        "in",
        "on",
        "and",
        "please",
        "tell",
        "me",
        "about",
        "explain",
        "simply",
        "example",
        "give",
        "more",
        "we",
        "you",
        "they",
        "it",
        "its",
        "can",
        "need",
        "should",
        "would",
        "could",
        "will",
        "has",
        "have",
        "was",
        "were",
        "be",
        "this",
        "that",
        "these",
        "those",
        "our",
        "your",
        "my",
        "from",
        "with",
        "by",
        "at",
        "as",
        "or",
        "if",
        "so",
        "అంటే",
        "ఏమిటి",
        "ఏమిటి?",
        "మరియు",
        "ఎందుకు",
        "ఎలా",
        "కోసం",
        "లో",
        "కి",
        "కు",
        "తో",
        "ని",
        "యొక్క",
        "क्या",
        "है",
        "और",
        "क्यों",
        "कैसे",
        "के",
        "का",
        "की",
        "में",
        "से",
        "को",
        "लिए",
        "यह",
        "इस"

    ]);


  words =
    words.filter(
      word =>
        !stopWords.has(word)
    );


  return words;
}


export const assistantSynonyms = {
  plant: ["plants", "tree", "trees", "మొక్క", "మొక్కలు", "पौधा", "पौधे"],
  photosynthesis: ["photosynthesis", "కిరణజన్య సంయోగక్రియ", "ఫోటోసింథసిస్", "प्रकाश संश्लेषण", "फोटोसिंथेसिस"],
  water: ["నీరు", "నీటి", "पानी"],
  "water cycle": ["water cycle", "నీటి చక్రం", "जल चक्र"],
  animal: ["animals", "జంతువు", "జంతువులు", "जानवर"],
  food: ["ఆహారం", "भोजन", "खाना"],
  health: ["ఆరోగ్యం", "ఆరోగ్య", "स्वास्थ्य"],
  environment: ["పర్యావరణం", "पर्यावरण"],
  clean: ["cleanliness", "శుభ్రత", "सफाई"],
  recycle: ["recycling", "రీసైక్లింగ్", "पुनर्चक्रण"]
};


export function expandAssistantTokens(tokens) {
  return [...new Set(tokens.flatMap(token => {
    const match = Object.entries(assistantSynonyms)
      .find(([, synonyms]) => synonyms.includes(token));
    return match ? [token, match[0], ...match[1]] : [token];
  }))];
}


// Telugu and Hindi words change their endings in a sentence
// (పర్యావరణం -> పర్యావరణాన్ని, पौधा -> पौधों), so two words in those scripts
// count as the same when they share a long enough beginning.
const INDIC_SCRIPT = /[\p{Script=Devanagari}\p{Script=Telugu}]/u;

export function looseWordMatch(first, second) {
  if (first === second) return true;
  if (!INDIC_SCRIPT.test(first) || !INDIC_SCRIPT.test(second)) return false;

  const shortest = Math.min(first.length, second.length);
  let shared = 0;
  while (shared < shortest && first[shared] === second[shared]) shared++;

  return shared >= 3 && shared >= shortest - 3;
}

// English words match whole, or with a short ending added (plant / plants,
// ohm / ohms). Matching parts of words made "we" match "weather".
function englishWordMatch(word, token) {
  if (word === token) return true;
  const [shorter, longer] = word.length <= token.length ? [word, token] : [token, word];
  return shorter.length >= 3 && longer.startsWith(shorter) && longer.length - shorter.length <= 2;
}

function wordMatch(word, token) {
  return INDIC_SCRIPT.test(token) ? looseWordMatch(word, token) : englishWordMatch(word, token);
}

// How much of the question a topic or phrase accounts for, from 0 to 1.
// "friction" covers all of "What is friction?"; "Sun" covers only a third
// of "Why is the Sun hot in summer?".
function questionCoverage(questionTokens, phrase) {
  if (!questionTokens.length) return 0;
  const phraseWords = getQuestionTokens(phrase);
  const covered = questionTokens.filter(token => {
    const forms = expandAssistantTokens([token]);
    return phraseWords.some(word => forms.some(form => wordMatch(word, form)));
  });
  return covered.length / questionTokens.length;
}

export function textMatchScore(
  text,
  tokens
) {

  const content =
    cleanText(text);

  const words = content.split(" ");

  let score = 0;

  tokens.forEach(
    token => {
      const matches = token.includes(" ")
        ? content.includes(token)
        : INDIC_SCRIPT.test(token)
          ? words.some(word => looseWordMatch(word, token))
          : words.some(word => englishWordMatch(word, token));

      if (matches) score++;
    }
  );

  return score;
}


// ======================================================
// SEARCH LESSON DATABASE
// ======================================================

// The searchable parts of a lesson in one language, in a fixed order so the
// same part can be looked up in another language.
function lessonFields(lesson, language) {
  return [
    ["explanation", lesson.explanation[language], 4],
    ...(lesson.keyPoints[language] || []).map(point => ["key point", point, 3]),
    ["activity", lesson.activity?.[language] || "", 2],
    ...((lesson.quiz || []).map(item => [
      "quiz",
      `${item.question?.[language] || ""} ${(item.options?.[language] || []).join(" ")}`,
      2
    ]))
  ];
}

// Matches the question against lesson text in the language it is written in
// (matchLanguage), and answers with the same text in the answer language
// (state.selectedLanguage). So "ohm's law" typed in a Telugu chat still finds
// the lesson, and the answer comes from its Telugu text.
function collectLessonCandidates(classKeys, tokens, matchLanguage) {
  const candidates = [];
  const answerLanguage = state.selectedLanguage;

  classKeys.forEach(classKey => {
    const classData = learningData[classKey];
    if (!classData) return;

    classData.chapters.forEach(chapter => chapter.lessons.forEach(lesson => {
      const title = lesson.title[answerLanguage];
      const explanation = lesson.explanation[answerLanguage];

      // A question that names the lesson ("What is friction?") is a strong
      // match however short it is, and is answered with the explanation.
      const titleMatches = textMatchScore(`${lesson.title[matchLanguage]} ${chapter.title[matchLanguage]}`, tokens);
      if (titleMatches) {
        candidates.push({
          lessonTitle: title,
          answer: explanation,
          type: "title",
          score: titleMatches * 5 + (titleMatches === tokens.length ? 5 : 0)
        });
      }

      const answers = lessonFields(lesson, answerLanguage);

      lessonFields(lesson, matchLanguage).forEach(([type, text, weight], index) => {
        const score = textMatchScore(text, tokens) * weight;
        if (score) candidates.push({ lessonTitle: title, answer: answers[index]?.[1] || text, type, score });
      });
    }));
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

// The learner's own class is searched first. If nothing there is a strong
// match, every class is searched, so a Class 3 learner can still ask about
// friction.
const STRONG_LESSON_SCORE = 8;

export function searchLessonKnowledge(
  question
) {
  const tokens = expandAssistantTokens(getQuestionTokens(question));
  if (!tokens.length) return null;

  const matchLanguage = detectLanguage(question, state.selectedLanguage);
  const allClasses = Object.keys(learningData);
  const ownClass = state.selectedClass ? [`class${state.selectedClass}`] : allClasses;

  const best = collectLessonCandidates(ownClass, tokens, matchLanguage);
  if (!state.selectedClass || (best && best.score >= STRONG_LESSON_SCORE)) return best;

  const widest = collectLessonCandidates(allClasses, tokens, matchLanguage);
  return widest && (!best || widest.score > best.score) ? widest : best;
}


export function searchOfflineKnowledge(question) {
  // Spaces around both, so a phrase only matches whole words.
  const normalized = ` ${cleanText(question)} `;
  const questionTokens = getQuestionTokens(question);
  const tokens = expandAssistantTokens(questionTokens);
  if (!tokens.length) return null;
  let best = null;

  offlineKnowledge.forEach(entry => {
    const aliases = Object.values(entry.aliases).flat();
    let score = textMatchScore(
      `${entry.topic} ${aliases.join(" ")}`,
      tokens
    );
    // How much of the question the matched topic or phrase accounts for.
    let coverage = 0;

    // The question names the topic ("friction", "photosynthesis").
    if (textMatchScore(entry.topic, tokens) > 0) {
      score += 8;
      coverage = questionCoverage(questionTokens, entry.topic);
    }
    aliases.forEach(alias => {
      const phrase = cleanText(alias);
      if (!phrase) return;

      const aliasWords = getQuestionTokens(alias);
      const matchesPhrase = normalized.includes(` ${phrase} `);
      const matchesWords =
        INDIC_SCRIPT.test(phrase) &&
        aliasWords.length > 0 &&
        aliasWords.every(word => tokens.some(token => looseWordMatch(word, token)));

      if (matchesPhrase || matchesWords) {
        score += 8 + phrase.split(" ").length * 6;
        coverage = Math.max(coverage, questionCoverage(questionTokens, alias));
      }
    });

    // Confident: the topic or a phrase is at least half of what is asked,
    // not one shared word in a longer question.
    const phraseMatch = coverage >= 0.5;
    if (score && (!best || score > best.score)) {
      best = {
        lessonTitle: "",
        topic: entry.topic,
        answer: entry.answer[state.selectedLanguage],
        example: entry.example?.[state.selectedLanguage] || "",
        source: "knowledge",
        // The topic or one of its phrases is in the question, not just
        // some shared words.
        phraseMatch,
        score
      };
    }

  });
  return best;
}


export function hasOfflineKnowledgePhrase(question) {
  const normalized = cleanText(question);
  const tokens = expandAssistantTokens(getQuestionTokens(question));
  return offlineKnowledge.some(entry =>
    textMatchScore(entry.topic, tokens) > 0 ||
    Object.values(entry.aliases).flat().some(alias => {
      const phrase = cleanText(alias);
      return phrase.length > 3 && normalized.includes(phrase);
    })
  );
}


export function detectAssistantIntent(question) {
  const normalized = cleanText(question);
  if (normalized.includes("difference between")) return "difference";
  if (normalized.includes("explain simply")) return "simple";
  if (normalized.includes("give example") || normalized.includes("give an example")) return "example";
  if (normalized.startsWith("why") || normalized.includes("ఎందుకు") || normalized.includes("क्यों")) return "why";
  if (normalized.startsWith("how") || normalized.includes("ఎలా") || normalized.includes("कैसे")) return "how";
  if (normalized.startsWith("what") || normalized.includes("ఏమిటి") || normalized.includes("क्या")) return "what";
  if (normalized.includes("explain") || normalized.includes("వివరించు") || normalized.includes("समझाओ")) return "explain";
  return "general";
}


export function searchOfflineQuestions(question) {
  const tokens = expandAssistantTokens(getQuestionTokens(question));
  let best = null;
  const questionBank = globalThis.offlineQuestions || [];
  questionBank.forEach(item => {
    const score = textMatchScore(item.keywords.join(" "), tokens) * 3;
    if (score && (!best || score > best.score)) {
      best = {
        lessonTitle: "",
        answer: item[state.selectedLanguage],
        source: "offline question",
        score
      };
    }
  });
  return best;
}
