// System prompt for the on-device model. The model only works well in
// English, so questions in Telugu or Hindi reach it translated into English
// and its answers are translated back (see translator.worker.js).
export const SYSTEM_PROMPT = `You are Gyaan, a friendly offline tutor for school children in Classes 1 to 10.
Answer ONLY in simple English.
Answer the question directly. If no lesson information is provided, use your general knowledge.
Do not say "No matching lesson was found".`;

// The answer is cut off at the token limit, often mid-sentence. Keep only
// whole sentences (when there is at least one), so the learner, the
// translation and the read-aloud never get half a sentence.
export function trimToSentence(text) {
  return trimLastSentence(removeRepeatedSentences(text));
}

// The small model sometimes says the same sentence twice; keep the first.
export function removeRepeatedSentences(text) {
  const seen = new Set();
  return String(text || "")
    .split(/\n+/)
    .map(line => line
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => {
        const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(" "))
    .filter(line => line.trim())
    .join("\n");
}

function trimLastSentence(text) {
  const value = String(text || "").trim();
  if (/[.!?]$/.test(value)) return value;

  const end = Math.max(value.lastIndexOf(". "), value.lastIndexOf("! "), value.lastIndexOf("? "));
  return end < 0 ? value : value.slice(0, end + 1);
}
