// Hybrid AI backend — Google Gemini API fallback.
//
// Used when the on-device model (SmolLM2) cannot run on this device or
// has not been downloaded yet.  The API key is injected at build time from
// the VITE_GEMINI_API_KEY environment variable; without it this module is
// a silent no-op and the app falls back to the built-in offline knowledge base.
//
// Model: gemini-2.0-flash-lite  (free-tier, very fast, no cost for education)

const GEMINI_KEY = String(import.meta.env?.VITE_GEMINI_API_KEY || "").trim();
const GEMINI_URL = GEMINI_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`
  : null;

const SYSTEM_INSTRUCTION = `You are Gyaan, a friendly AI tutor for Indian school students in classes 1–10. 
Answer questions clearly and simply, as if explaining to a young student. 
Keep answers to 2 short sentences maximum. 
Focus on curriculum topics: Maths, Science, EVS, Social Studies, English, Hindi, Telugu.
Do not answer adult topics, politics, or anything harmful.`;

/**
 * Returns true when Gemini API key is configured and the device is online.
 */
export function isCloudAiAvailable() {
  return Boolean(GEMINI_URL) && navigator.onLine;
}

/**
 * Asks Gemini the question and returns an English answer string.
 * Throws if the network fails or the API returns an error.
 *
 * @param {string} question  Already in English.
 * @param {string} [context] Optional lesson context (passed as extra info).
 * @returns {Promise<string>}
 */
export async function askCloudAi(question, context = "") {
  if (!GEMINI_URL) throw new Error("Cloud AI not configured (no VITE_GEMINI_API_KEY).");
  if (!navigator.onLine) throw new Error("Cloud AI needs an internet connection.");

  const contextPart = context
    ? `\nRelevant lesson information: ${context}\n`
    : "";

  const prompt = `${contextPart}Question: ${question}\nAnswer briefly in 2 sentences:`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 120)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text.trim();
}
