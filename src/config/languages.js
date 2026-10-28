// Supported languages, their speech codes and script detection.

export const LANGUAGES = ["English", "Telugu", "Hindi"];

// BCP 47 codes used for speech recognition and read-aloud.
export const speechLanguageCodes = {
  English: "en-IN",
  Telugu: "te-IN",
  Hindi: "hi-IN"
};

const TELUGU_LETTERS = /[ఀ-౿]/g;
const DEVANAGARI_LETTERS = /[ऀ-ॿ]/g;
const LATIN_LETTERS = /[A-Za-z]/g;

// Works out which language a piece of text is written in from its script, so
// a question typed in Telugu is answered in Telugu whatever the app language
// is. Text with no letters at all (numbers, emoji) keeps the fallback.
export function detectLanguage(text, fallback = "English") {
  const value = String(text || "");
  const counts = {
    Telugu: (value.match(TELUGU_LETTERS) || []).length,
    Hindi: (value.match(DEVANAGARI_LETTERS) || []).length,
    English: (value.match(LATIN_LETTERS) || []).length
  };

  if (counts.Telugu === 0 && counts.Hindi === 0) {
    return counts.English > 0 ? "English" : fallback;
  }

  // Indian-language questions often carry an English word or two
  // ("photosynthesis అంటే ఏమిటి?"), so any Indic script outranks Latin.
  return counts.Telugu >= counts.Hindi ? "Telugu" : "Hindi";
}
