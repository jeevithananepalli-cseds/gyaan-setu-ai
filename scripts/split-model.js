#!/usr/bin/env node
// Splits a large model file into parts small enough for GitHub's 100 MB file
// limit. The service worker joins the parts back together in the browser, so
// every split file must also be listed in SPLIT_FILES in
// src/sw/service-worker.js with the same part suffixes this script prints.
//
// Usage:
//   npm run split:model -- <source file> [target path under public/models]
//
// Examples:
//   npm run split:model -- ./model_q4f16.onnx
//       -> public/models/SmolLM2-360M-Instruct/onnx/model_q4f16.onnx.part-aa ...
//   npm run split:model -- ./model.onnx tts/mms-tts-tel/onnx/model.onnx
//       -> public/models/tts/mms-tts-tel/onnx/model.onnx.part-aa ...

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODELS_DIR = path.join(ROOT_DIR, "public", "models");
const DEFAULT_TARGET = "SmolLM2-360M-Instruct/onnx/model_q4f16.onnx";
// Each part is 90 MiB, the size the committed parts were made with.
const PART_BYTES = 90 * 1024 * 1024;

const [source, target = DEFAULT_TARGET] = process.argv.slice(2);

if (!source) {
  console.error("Usage: npm run split:model -- <source file> [target path under public/models]");
  process.exit(1);
}

if (!fs.existsSync(source)) {
  console.error(`Model file not found: ${source}`);
  process.exit(1);
}

// aa, ab, ... az, ba, ... like the Unix `split` command.
function partSuffix(index) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return letters[Math.floor(index / letters.length)] + letters[index % letters.length];
}

const destination = path.join(MODELS_DIR, target);
const totalBytes = fs.statSync(source).size;
const partCount = Math.ceil(totalBytes / PART_BYTES);

fs.mkdirSync(path.dirname(destination), { recursive: true });

// Remove parts left over from a previous, larger model.
for (const name of fs.readdirSync(path.dirname(destination))) {
  if (name.startsWith(`${path.basename(destination)}.part-`)) {
    fs.rmSync(path.join(path.dirname(destination), name));
  }
}

const input = fs.openSync(source, "r");
const buffer = Buffer.alloc(PART_BYTES);
const suffixes = [];

try {
  for (let index = 0; index < partCount; index++) {
    const bytesRead = fs.readSync(input, buffer, 0, PART_BYTES, index * PART_BYTES);
    const suffix = partSuffix(index);
    const partPath = `${destination}.part-${suffix}`;

    fs.writeFileSync(partPath, buffer.subarray(0, bytesRead));
    suffixes.push(suffix);
    console.log(`${path.relative(ROOT_DIR, partPath)}  ${(bytesRead / 1024 / 1024).toFixed(1)} MB`);
  }
}
finally {
  fs.closeSync(input);
}

console.log(
  `\nList this in SPLIT_FILES in src/sw/service-worker.js:\n` +
  `  "./models/${target.replace(/\\/g, "/")}": ${JSON.stringify(suffixes)}`
);
