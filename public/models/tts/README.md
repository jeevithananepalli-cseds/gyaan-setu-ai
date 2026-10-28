# Bundled voices

Text-to-speech voices used by the Ask Gyaan read-aloud feature when a device
has no voice of its own for the language.

| Folder | Language | Source |
| --- | --- | --- |
| `mms-tts-eng` | English | [Xenova/mms-tts-eng](https://huggingface.co/Xenova/mms-tts-eng), an ONNX conversion of [facebook/mms-tts-eng](https://huggingface.co/facebook/mms-tts-eng). Used offline when the device has no English voice of its own |
| `mms-tts-tel` | Telugu | [facebook/mms-tts-tel](https://huggingface.co/facebook/mms-tts-tel), converted to ONNX for this project |
| `mms-tts-hin` | Hindi | [Xenova/mms-tts-hin](https://huggingface.co/Xenova/mms-tts-hin), an ONNX conversion of [facebook/mms-tts-hin](https://huggingface.co/facebook/mms-tts-hin) |

Both are from Meta AI's Massively Multilingual Speech (MMS) project:

> Pratap et al., "Scaling Speech Technology to 1,000+ Languages", 2023.

## Licence

These models are licensed under
[Creative Commons Attribution-NonCommercial 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
(CC BY-NC 4.0). They may be used and shared with credit, **but not for
commercial purposes**. If Gyaan Setu is ever used commercially, these two
folders must be removed or replaced with voices under a different licence.
The rest of the app does not depend on them: read-aloud falls back to the
device's own voices.

## Files

Each `onnx/model.onnx` is stored as two parts (`.part-aa`, `.part-ab`)
because of GitHub's 100 MB file limit. The voice worker
(`src/ai/tts.worker.js`) joins them in the browser. To replace a model:

    npm run split:model -- path/to/model.onnx tts/mms-tts-tel/onnx/model.onnx

The full-precision models are used on purpose. The 8-bit versions are a third
of the size but took two to three times longer to produce speech in the
browser when measured.
