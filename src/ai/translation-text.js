// Text handling around the IndicTrans2 translation model, kept free of any
// model code so it can be tested on its own.
//
// IndicTrans2 reads and writes every Indian language in Devanagari: Telugu is
// mapped letter for letter into Devanagari before it goes in, and the
// model's output is mapped back into Telugu. This works because the Unicode
// blocks of the Brahmic scripts share one layout, so the same sound sits at
// the same offset in each block.

// The model's own language tags.
export const LANGUAGE_TAGS = {
  English: "eng_Latn",
  Telugu: "tel_Telu",
  Hindi: "hin_Deva"
};

// The two model folders under public/models/indictrans2/.
export function translationDirection(from, to) {
  return from === "English" && to !== "English" ? "en-indic" : "indic-en";
}

const SCRIPT_START = { Hindi: 0x0900, Telugu: 0x0c00 };
const BLOCK_SIZE = 0x80;
// The danda and double danda live in the Devanagari block but are shared by
// every Indian script, so they are never moved.
const SHARED_MARKS = new Set([0x0964, 0x0965]);

function moveScript(text, fromStart, toStart) {
  if (fromStart === toStart) return text;

  let result = "";
  for (const character of text) {
    const code = character.codePointAt(0);
    const offset = code - fromStart;
    result += offset >= 0 && offset < BLOCK_SIZE && !SHARED_MARKS.has(code)
      ? String.fromCodePoint(toStart + offset)
      : character;
  }
  return result;
}

// Telugu text to the Devanagari form the model reads. Hindi and English pass
// through unchanged.
export function toModelScript(text, language) {
  return language === "Telugu" ? moveScript(text, SCRIPT_START.Telugu, SCRIPT_START.Hindi) : text;
}

// The model's Devanagari output to the target language's own script.
export function fromModelScript(text, language) {
  return language === "Telugu" ? moveScript(text, SCRIPT_START.Hindi, SCRIPT_START.Telugu) : text;
}

// The model works best on one sentence at a time. Splits after . ! ? and the
// danda when a space follows, so decimals ("9.8 m/s²") and formulas stay whole.
export function splitSentences(text) {
  return String(text || "")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/(?<=[.!?।॥])\s+(?=\S)/u).map(part => part.trim()).filter(Boolean));
}

// A piece worth sending to the model: it has a real word in it. "V = IR",
// "9.8" or an emoji on its own is kept as it is. (Telugu and Hindi letters
// alternate with vowel signs, so any letter of those scripts counts.)
export function needsTranslation(text) {
  return /\p{L}{3,}|[ऀ-ൿ]/u.test(text);
}

// The model leaves a space before closing punctuation ("ఉంటుంది ." or
// "है ।"); remove it and any doubled spaces.
export function tidyTranslation(text) {
  return String(text || "")
    .replace(/\s+([.,!?;:।॥)])/gu, "$1")
    .replace(/([(])\s+/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
