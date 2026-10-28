// Tells speech from silence in microphone audio, frame by frame, so
// recording stops by itself when the learner has finished the question.
// Kept free of browser APIs so it can be tested.

function rms(frame) {
  let sum = 0;
  for (let index = 0; index < frame.length; index++) sum += frame[index] * frame[index];
  return Math.sqrt(sum / (frame.length || 1));
}

// options (seconds):
//   frameSeconds   length of one frame
//   silenceAfter   this much quiet after speech ends the question (1.3)
//   waitForSpeech  give up if nothing is said for this long (8)
//   maxLength      never record longer than this (15)
export function findSpeech({
  frameSeconds,
  silenceAfter = 1.3,
  waitForSpeech = 8,
  maxLength = 15
}) {
  const framesFor = seconds => Math.max(1, Math.round(seconds / frameSeconds));
  const calibrationFrames = framesFor(0.3);
  const silenceFrames = framesFor(silenceAfter);
  const waitFrames = framesFor(waitForSpeech);
  const maxFrames = framesFor(maxLength);

  let frameCount = 0;
  let noiseFloor = 0;
  let speechStarted = false;
  let startFrame = -1;
  let endFrame = -1;
  let loudInARow = 0;
  let quietInARow = 0;
  let done = false;

  // Speech is a few times louder than the room, and never below a small
  // absolute level (a silent microphone has a floor of almost zero).
  const threshold = () => Math.max(0.012, noiseFloor * 3);

  return {
    push(frame) {
      if (done) return { speechStarted, startFrame, done };
      const level = rms(frame);
      const index = frameCount++;

      // The room's level: the quietest of the first frames, then following
      // the quiet parts slowly (a fan switched on, a noisier room).
      if (index < calibrationFrames) {
        noiseFloor = index === 0 ? level : Math.min(noiseFloor, level);
      }

      const loud = index >= calibrationFrames && level > threshold();
      if (!loud && index >= calibrationFrames) {
        noiseFloor = noiseFloor * 0.95 + Math.min(level, threshold()) * 0.05;
      }

      if (!speechStarted) {
        loudInARow = loud ? loudInARow + 1 : 0;
        // Two loud frames in a row: a word, not a click.
        if (loudInARow >= 2) {
          speechStarted = true;
          startFrame = index - 1;
          endFrame = index;
        }
        else if (index + 1 >= waitFrames) {
          done = true;
        }
      }
      else if (loud) {
        quietInARow = 0;
        endFrame = index;
      }
      else if (++quietInARow >= silenceFrames) {
        done = true;
      }

      if (frameCount >= maxFrames) done = true;
      return { speechStarted, startFrame, done };
    },

    result() {
      return { speechStarted, startFrame, endFrame: speechStarted ? endFrame : -1 };
    }
  };
}
