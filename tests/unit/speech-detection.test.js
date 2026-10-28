import { describe, expect, it } from "vitest";
import { findSpeech } from "../../src/ai/speech-detection.js";
import { isUsableTranscript } from "../../src/ai/speech-recognition-models.js";

const FRAME = 0.1;

function frame(level) {
  // A square wave has an RMS equal to its amplitude.
  return Float32Array.from({ length: 160 }, (_, index) => (index % 2 ? level : -level));
}

function run(levels, options = {}) {
  const detector = findSpeech({ frameSeconds: FRAME, ...options });
  let stoppedAt = -1;
  levels.forEach((level, index) => {
    if (stoppedAt >= 0) return;
    if (detector.push(frame(level)).done) stoppedAt = index;
  });
  return { ...detector.result(), stoppedAt };
}

const quiet = count => Array(count).fill(0.002);
const loud = count => Array(count).fill(0.2);

describe("findSpeech", () => {
  it("finds a spoken question and stops after the pause that follows it", () => {
    const result = run([...quiet(5), ...loud(10), ...quiet(20)]);

    expect(result.speechStarted).toBe(true);
    expect(result.startFrame).toBe(5);
    expect(result.endFrame).toBe(14);
    // 1.3 s of quiet after the last loud frame.
    expect(result.stoppedAt).toBe(14 + 13);
  });

  it("keeps listening through short pauses between words", () => {
    const result = run([...quiet(5), ...loud(4), ...quiet(6), ...loud(4), ...quiet(20)]);
    expect(result.endFrame).toBe(18);
  });

  it("gives up when nothing is said", () => {
    const result = run(quiet(200));
    expect(result.speechStarted).toBe(false);
    expect(result.stoppedAt).toBe(79);
  });

  it("ignores a single click", () => {
    const result = run([...quiet(5), 0.3, ...quiet(100)]);
    expect(result.speechStarted).toBe(false);
  });

  it("never records longer than the limit", () => {
    const result = run([...quiet(5), ...loud(300)]);
    expect(result.stoppedAt).toBe(149);
  });

  it("works in a noisy room", () => {
    const result = run([...Array(5).fill(0.03), ...Array(10).fill(0.3), ...Array(20).fill(0.03)]);
    expect(result.speechStarted).toBe(true);
    expect(result.endFrame).toBe(14);
  });
});

describe("isUsableTranscript", () => {
  it("accepts real questions in the right script, or English words", () => {
    expect(isUsableTranscript("What is Ohm's law?", "English")).toBe(true);
    expect(isUsableTranscript("కిరణజన్య సంయోగక్రియ అంటే ఏమిటి", "Telugu")).toBe(true);
    expect(isUsableTranscript("ब्लैक होल क्या है", "Hindi")).toBe(true);
  });

  it("drops what Whisper invents from silence", () => {
    expect(isUsableTranscript("", "English")).toBe(false);
    expect(isUsableTranscript("[BLANK_AUDIO]", "English")).toBe(false);
    expect(isUsableTranscript("Thank you.", "English")).toBe(false);
    expect(isUsableTranscript("(music)", "Telugu")).toBe(false);
  });
});
