---
license: other
license_name: mixed
language:
  - en
  - te
  - hi
tags:
  - onnx
  - transformers.js
  - education
  - offline
---

# Gyaan Setu models

The on-device AI models used by [Gyaan Setu](https://gyaan-setu-beige.vercel.app),
an offline learning app for school children in English, Telugu and Hindi.

The app downloads each model once, keeps it on the device, and runs it in the
browser with [transformers.js](https://github.com/huggingface/transformers.js)
and ONNX Runtime Web, so it keeps working without the internet. The files are
copies of the original models, converted or quantized to ONNX. Nothing was
retrained.

| Folder | Used for | Original model | Licence |
| --- | --- | --- | --- |
| `SmolLM2-360M-Instruct/` | Tutor answers (English) | [HuggingFaceTB/SmolLM2-360M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) | Apache 2.0 |
| `indictrans2/en-indic/` | English → Telugu/Hindi translation | [ai4bharat/indictrans2-en-indic-dist-200M](https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M) | MIT |
| `indictrans2/indic-en/` | Telugu/Hindi → English translation | [ai4bharat/indictrans2-indic-en-dist-200M](https://huggingface.co/ai4bharat/indictrans2-indic-en-dist-200M) | MIT |
| `tts/mms-tts-eng/`, `tts/mms-tts-tel/`, `tts/mms-tts-hin/` | Read-aloud voices | [facebook/mms-tts](https://huggingface.co/facebook/mms-tts) | **CC-BY-NC 4.0** (non-commercial) |
| `whisper/whisper-base.en/` | English voice input | [openai/whisper-base.en](https://huggingface.co/openai/whisper-base.en) (ONNX by Xenova) | MIT |

Each folder's own README has the details. Files named `*.part-aa`,
`*.part-ab`, … are one file split into parts; the app joins them after
downloading.

The MMS voices may only be used for non-commercial purposes.
