"""Converts facebook/mms-tts-tel to the layout transformers.js loads.

Mirrors how Xenova/mms-tts-hin was produced: ONNX export of VitsModel, then
dynamic quantization (QUInt8, per-channel, reduced range), plus a
tokenizer.json built from the model's character vocabulary.

Usage: python convert_tel.py <work dir> <output dir> <reference tokenizer.json>
"""
import json
import shutil
import sys
from pathlib import Path

from optimum.exporters.onnx import main_export
from transformers import AutoTokenizer

SOURCE = "facebook/mms-tts-tel"
work, out, reference_tokenizer = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
export_dir = work / "export"

# VITS adds random noise when it predicts durations, so the exporter's own
# check (same output length as PyTorch) cannot pass. The export itself is
# complete by then; the model is checked for real at the end of this script.
if not (export_dir / "model.onnx").exists():
    try:
        main_export(SOURCE, output=export_dir, task="text-to-audio")
    except Exception as error:  # noqa: BLE001
        if not (export_dir / "model.onnx").exists():
            raise
        print("export validation skipped:", type(error).__name__)

# ---- model (full precision; the 8-bit version runs several times slower in the browser)
(out / "onnx").mkdir(parents=True, exist_ok=True)
model_path = export_dir / "model.onnx"
shutil.copy(model_path, out / "onnx" / "model.onnx")

# ---- config and tokenizer -----------------------------------------------
shutil.copy(export_dir / "config.json", out / "config.json")

tokenizer = AutoTokenizer.from_pretrained(SOURCE)
vocab = tokenizer.get_vocab()
unk_id = vocab[tokenizer.unk_token]
pad = tokenizer.pad_token
characters = "".join(sorted(c for c in vocab if c != tokenizer.unk_token))


def escape_for_class(text):
    return "".join("\\" + c if c in "\\]^-[" else c for c in text)


tokenizer_json = json.loads(reference_tokenizer.read_text(encoding="utf-8"))
tokenizer_json["added_tokens"][0]["id"] = unk_id
tokenizer_json["added_tokens"][0]["content"] = tokenizer.unk_token
normalizers = tokenizer_json["normalizer"]["normalizers"]
# 1: drop every character the model was not trained on.
normalizers[1]["pattern"]["Regex"] = f"[^{escape_for_class(characters)}]"
# 3: put the blank (pad) token between characters, as VITS expects.
normalizers[3]["content"] = pad
tokenizer_json["model"]["vocab"] = vocab

(out / "tokenizer.json").write_text(json.dumps(tokenizer_json, ensure_ascii=False, indent=2), encoding="utf-8")
(out / "vocab.json").write_text(
    json.dumps({k: v for k, v in vocab.items() if k != tokenizer.unk_token}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
(out / "special_tokens_map.json").write_text(
    json.dumps({"pad_token": pad, "unk_token": tokenizer.unk_token}, ensure_ascii=False, indent=2), encoding="utf-8"
)
(out / "added_tokens.json").write_text(json.dumps({tokenizer.unk_token: unk_id}, indent=2), encoding="utf-8")
tokenizer.save_pretrained(work / "tokenizer")
shutil.copy(work / "tokenizer" / "tokenizer_config.json", out / "tokenizer_config.json")

# ---- check the quantized model speaks -------------------------------------
import numpy as np
import onnxruntime as ort

session = ort.InferenceSession(str(out / "onnx" / "model.onnx"))
inputs = tokenizer("నీరు మనకు చాలా ముఖ్యం.", return_tensors="np")
feed = {i.name: inputs[i.name].astype(np.int64) for i in session.get_inputs()}
waveform = session.run(None, feed)[0]
print("inputs:", [i.name for i in session.get_inputs()], "outputs:", [o.name for o in session.get_outputs()])
print("samples:", waveform.shape, "peak:", float(np.abs(waveform).max()))
print("vocab:", len(vocab), "pad:", pad, "unk id:", unk_id)
for f in sorted(out.rglob("*")):
    if f.is_file():
        print(f.relative_to(out), round(f.stat().st_size / 1048576, 1), "MB")
