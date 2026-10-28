# Translation models

Used by Ask Gyaan so that the English tutor model can answer questions asked
in Telugu or Hindi, and so that its answers can be shown in Telugu or Hindi.
They run on the device, in `src/ai/translator.worker.js`.

| Folder | Direction | Source |
| --- | --- | --- |
| `en-indic` | English to Telugu / Hindi | [hari31416/indictrans2-en-indic-dist-200M-ONNX-int8](https://huggingface.co/hari31416/indictrans2-en-indic-dist-200M-ONNX-int8), an ONNX export of [ai4bharat/indictrans2-en-indic-dist-200M](https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M) |
| `indic-en` | Telugu / Hindi to English | [hari31416/indictrans2-indic-en-dist-200M-ONNX-int8](https://huggingface.co/hari31416/indictrans2-indic-en-dist-200M-ONNX-int8), an ONNX export of [ai4bharat/indictrans2-indic-en-dist-200M](https://huggingface.co/ai4bharat/indictrans2-indic-en-dist-200M) |

IndicTrans2 is by AI4Bharat:

> Gala et al., "IndicTrans2: Towards High-Quality and Accessible Machine
> Translation Models for all 22 Scheduled Indian Languages", Transactions on
> Machine Learning Research, 2023.

## Licence

MIT, for both the original models and the ONNX exports. They can be used for
any purpose, including commercially, as long as the copyright notice is kept.

## Why these models

Measured against Meta's NLLB-200 (distilled 600M), the other model that runs
in the browser and covers Telugu:

| | NLLB-200 | IndicTrans2 |
| --- | --- | --- |
| "current" in a physics answer | ప్రస్తుతము / वर्तमान ("the present") | కరెంట్ / धारा |
| కిరణజన్య సంయోగక్రియ అంటే ఏమిటి? | "What is radiation synthesis?" | "What is photosynthesis?" |
| Time per sentence (laptop) | 7-21 s | 0.2-1.5 s |
| Download | about 900 MB | about 570 MB (both directions) |
| Licence | non-commercial only | MIT |

## Files

The model reads every Indian language in Devanagari, so Telugu text is
mapped letter for letter into Devanagari on the way in and back on the way
out (`src/ai/translation-text.js`).

`manifest.json` in each folder lists the files and their sizes; the worker
uses it to download a direction, show progress and store it in the
`gyaan-setu-translator-v1` cache. Files over 90 MB are stored as parts
(`.part-aa`, `.part-ab`, ...) because of GitHub's 100 MB file limit, and the
worker joins them. To replace a file, split it with

    npm run split:model -- path/to/decoder_shared.onnx.data indictrans2/en-indic/decoder_shared.onnx.data

and update the sizes and part lists in that folder's `manifest.json`.

A direction is downloaded the first time it is needed: `en-indic` (309 MB)
for the first answer shown in Telugu or Hindi, `indic-en` (262 MB) for the
first question typed or spoken in Telugu or Hindi script.
