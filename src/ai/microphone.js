// Records one spoken question from the microphone for on-device speech
// recognition: listens until the learner stops talking, then returns the
// audio as 16 kHz mono samples (what Whisper expects).
import { findSpeech } from "./speech-detection.js";

const TARGET_RATE = 16000;
const FRAME_SIZE = 2048;

export function canRecord() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia &&
    (window.AudioContext || window.webkitAudioContext) &&
    window.OfflineAudioContext
  );
}

// Downsamples with the browser's own resampler.
async function resample(samples, fromRate) {
  if (fromRate === TARGET_RATE) return samples;
  const length = Math.max(1, Math.round(samples.length * TARGET_RATE / fromRate));
  const offline = new OfflineAudioContext(1, length, TARGET_RATE);
  const buffer = offline.createBuffer(1, samples.length, fromRate);
  buffer.copyToChannel(samples, 0);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

function joinFrames(frames) {
  const total = frames.reduce((sum, frame) => sum + frame.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const frame of frames) {
    joined.set(frame, offset);
    offset += frame.length;
  }
  return joined;
}

// Starts recording. Returns { done, stop, cancel }:
//   done    a promise of the 16 kHz samples (empty if nothing was said)
//   stop()  finish now and use what was said so far
//   cancel() finish now and use nothing
// onSpeech() is called once, when the learner starts talking.
export async function startRecording({ onSpeech } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  await context.resume().catch(() => {});
  const rate = context.sampleRate;
  const input = context.createMediaStreamSource(stream);
  // ScriptProcessorNode is deprecated but works in every browser that has
  // microphone access, without loading a separate worklet file.
  const processor = context.createScriptProcessor(FRAME_SIZE, 1, 1);
  const muted = context.createGain();
  muted.gain.value = 0;

  const frames = [];
  const detector = findSpeech({ frameSeconds: FRAME_SIZE / rate });
  let finished = false;
  let cancelled = false;
  let heardSpeech = false;
  let finish;
  const ended = new Promise(resolve => {
    finish = resolve;
  });

  processor.onaudioprocess = event => {
    if (finished) return;
    const frame = new Float32Array(event.inputBuffer.getChannelData(0));
    frames.push(frame);
    const state = detector.push(frame);
    if (state.speechStarted && !heardSpeech) {
      heardSpeech = true;
      onSpeech?.();
    }
    if (state.done) stopNow();
  };

  input.connect(processor);
  processor.connect(muted);
  muted.connect(context.destination);

  function stopNow() {
    if (finished) return;
    finished = true;
    processor.disconnect();
    input.disconnect();
    stream.getTracks().forEach(track => track.stop());
    finish();
  }

  const done = ended.then(async () => {
    const { speechStarted, startFrame, endFrame } = detector.result();
    await context.close().catch(() => {});
    if (cancelled || !speechStarted) return new Float32Array(0);

    // Keep a little before and after the speech, as Whisper likes.
    const from = Math.max(0, startFrame - Math.ceil(0.3 / (FRAME_SIZE / rate)));
    const to = Math.min(frames.length, endFrame + Math.ceil(0.3 / (FRAME_SIZE / rate)) + 1);
    return resample(joinFrames(frames.slice(from, to)), rate);
  });

  return {
    done,
    stop: stopNow,
    cancel() {
      cancelled = true;
      stopNow();
    }
  };
}
