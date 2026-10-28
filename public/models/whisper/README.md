# Speech recognition models

Used by Ask Gyaan's microphone so that spoken questions are turned into text
on the device, with no internet connection and without sending the
learner's voice anywhere. They run in `src/ai/speech-recognition.worker.js`;
`src/ai/speech-recognition-models.js` lists them.

| Folder | Language | Source | Licence |
| --- | --- | --- | --- |
| `whisper-base.en` | English | [Xenova/whisper-base.en](https://huggingface.co/Xenova/whisper-base.en), an ONNX conversion of [openai/whisper-base.en](https://huggingface.co/openai/whisper-base.en) | Apache-2.0 |

Planned, waiting for conversion to ONNX (see below):

| Folder | Language | Source | Licence | Reported word error rate |
| --- | --- | --- | --- | --- |
| `whisper-telugu-base` | Telugu | [vasista22/whisper-telugu-base](https://huggingface.co/vasista22/whisper-telugu-base) (IIT Madras, Vistaar project) | Apache-2.0 | 13.4% (FLEURS) |
| `whisper-hindi-base` | Hindi | [collabora/whisper-base-hindi](https://huggingface.co/collabora/whisper-base-hindi) | CC-BY-4.0 (credit Collabora) | 8.5% |

Until a language's model is here, its voice input uses the browser's own
recognition, which needs the internet in most browsers.

## Files

Each folder has the 8-bit `onnx/encoder_model_quantized.onnx` and
`onnx/decoder_model_merged_quantized.onnx` (about 77 MB together) plus the
tokenizer and config files. A language is downloaded the first time its
microphone is used and stored in the `gyaan-setu-speech-v1` cache.

## Adding the Telugu and Hindi models

Convert with transformers.js's script (version 3.7.2, matching
`public/vendor/onnx/transformers.min.js`):

    git clone --branch 3.7.2 https://github.com/huggingface/transformers.js
    cd transformers.js
    pip install -r scripts/requirements.txt
    python -m scripts.convert --quantize --model_id vasista22/whisper-telugu-base
    python -m scripts.convert --quantize --model_id collabora/whisper-base-hindi

Copy each output folder here as `whisper-telugu-base` and
`whisper-hindi-base` (only the `_quantized` ONNX files are needed), then set
`bundled: true` for the language in `src/ai/speech-recognition-models.js`.
