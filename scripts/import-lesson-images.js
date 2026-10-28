#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Lesson image paths in the content are relative to the served site root.
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const CURRICULUM_DIR = path.join(ROOT_DIR, "src", "content", "curriculum");
const IMAGES_DIR = path.join(PUBLIC_DIR, "images", "lessons");
const METADATA_PATH = path.join(IMAGES_DIR, "image-metadata.json");
const MANIFEST_PATH = path.join(IMAGES_DIR, "image-manifest.json");
const PLACEHOLDER_PATH = path.join(IMAGES_DIR, "placeholder-education.svg");

const CHECK_ONLY = process.argv.includes("--check");

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return String(value || "lesson")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "lesson";
}

// Classes 1-5 live in one JSON file per class: class-1.json -> data.class1.
function curriculumFiles() {
  return fs.readdirSync(CURRICULUM_DIR)
    .filter(name => /^class-\d+\.json$/.test(name))
    .sort((a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10));
}

function loadLearningData() {
  const data = {};
  for (const name of curriculumFiles()) {
    const classKey = `class${parseInt(name.slice(6), 10)}`;
    data[classKey] = JSON.parse(fs.readFileSync(path.join(CURRICULUM_DIR, name), "utf8"));
  }
  return data;
}

function saveLearningData(data) {
  for (const [classKey, classData] of Object.entries(data)) {
    const file = path.join(CURRICULUM_DIR, `class-${classKey.replace("class", "")}.json`);
    fs.writeFileSync(file, `${JSON.stringify(classData, null, 2)}\n`, "utf8");
  }
}

function ensurePlaceholder() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
  <title id="title">Educational lesson illustration placeholder</title>
  <desc id="desc">Placeholder image for a lesson when an external educational image is unavailable.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#f0fdf4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" rx="32" fill="url(#bg)"/>
  <circle cx="130" cy="130" r="70" fill="#93c5fd" opacity="0.7"/>
  <circle cx="1030" cy="650" r="120" fill="#86efac" opacity="0.5"/>
  <rect x="120" y="110" width="960" height="520" rx="24" fill="#ffffff" opacity="0.8"/>
  <rect x="180" y="200" width="220" height="220" rx="26" fill="#dbeafe"/>
  <circle cx="290" cy="310" r="72" fill="#60a5fa" opacity="0.75"/>
  <rect x="500" y="210" width="430" height="28" rx="14" fill="#93c5fd"/>
  <rect x="500" y="270" width="300" height="22" rx="11" fill="#bfdbfe"/>
  <rect x="500" y="330" width="360" height="22" rx="11" fill="#bfdbfe"/>
  <rect x="500" y="390" width="250" height="22" rx="11" fill="#bfdbfe"/>
  <path d="M260 550 L470 390 L610 500 L770 325 L970 550 Z" fill="#a7f3d0" opacity="0.9"/>
  <text x="600" y="610" text-anchor="middle" font-size="52" font-family="Arial, sans-serif" fill="#1e3a8a" font-weight="700">Gyaan Setu</text>
  <text x="600" y="670" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#334155">Educational Illustration</text>
</svg>
`;
  fs.writeFileSync(PLACEHOLDER_PATH, svg, "utf8");
}

function buildQuery(lesson, chapterTitle) {
  const rawParts = [
    lesson?.title?.English,
    chapterTitle?.English,
    lesson?.title?.Hindi,
    lesson?.title?.Telugu,
    lesson?.id
  ].filter(Boolean);
  const base = rawParts.join(" ") || "education topic";
  return [
    `${base} educational diagram illustration for school students`,
    `${base} educational illustration students`,
    `${base} school learning poster`,
    `${base} classroom teaching diagram`,
    `${base} educational concept`
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}

function normaliseMetadataName(title) {
  return slugify(title || "lesson");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "GyaanSetuImageImporter/1.0 (Educational project importer)"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

async function findImageForLesson(lesson, chapterTitle) {
  const queryVariants = buildQuery(lesson, chapterTitle);
  let bestMatch = null;
  let query = queryVariants[0];

  for (const variant of queryVariants) {
    const requestUrl = new URL("https://api.openverse.org/v1/images/");
    requestUrl.search = new URLSearchParams({
      q: variant,
      page_size: "5",
      license_type: "all",
      page: "1"
    }).toString();

    const data = await fetchJson(requestUrl.toString()).catch(() => null);
    const results = Array.isArray(data?.results) ? data.results : [];
    const candidate = results.find(result => {
      const url = result?.url;
      const license = result?.license || result?.license_url;
      return Boolean(url && license && !result?.mature);
    }) || results[0];

    if (candidate) {
      bestMatch = candidate;
      query = variant;
      break;
    }
  }

  const fileUrl = bestMatch?.url;
  const license = bestMatch?.license || bestMatch?.license_url || "Unknown";

  if (!fileUrl) {
    return null;
  }

  const parsedUrl = new URL(fileUrl);
  const extension = path.extname(parsedUrl.pathname).toLowerCase() || ".jpg";
  const safeName = normaliseMetadataName(lesson?.title?.English || chapterTitle?.English || lesson?.id || "lesson");
  const uniqueName = `${safeName}-${Date.now()}${extension}`;
  const localPath = path.join(IMAGES_DIR, uniqueName);
  const response = await fetch(fileUrl, {
    headers: {
      "User-Agent": "GyaanSetuImageImporter/1.0 (Educational project importer)"
    }
  });

  if (!response.ok) {
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, bytes);

  return {
    filename: uniqueName,
    relativePath: `./images/lessons/${uniqueName}`,
    sourceUrl: bestMatch?.foreign_landing_url || fileUrl,
    sourceName: bestMatch?.provider || "Openverse",
    query,
    license,
    title: lesson?.title?.English || chapterTitle?.English || lesson?.id || "Lesson image"
  };
}

function collectLessonEntries(data) {
  const lessons = [];

  Object.entries(data || {}).forEach(([classKey, classData]) => {
    if (!classData || !Array.isArray(classData.chapters)) return;

    classData.chapters.forEach(chapter => {
      if (!chapter || !Array.isArray(chapter.lessons)) return;

      chapter.lessons.forEach(lesson => {
        lessons.push({ classKey, chapter, lesson });
      });
    });
  });

  return lessons;
}

async function main() {
  ensureDirectory(IMAGES_DIR);
  ensurePlaceholder();

  const data = loadLearningData();
  if (!data || typeof data !== "object") {
    throw new Error("learningData could not be loaded from src/content/curriculum");
  }

  const entries = collectLessonEntries(data);
  const metadata = fs.existsSync(METADATA_PATH) ? JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")) : {};
  const manifestFiles = ["./images/lessons/placeholder-education.svg"];
  let updatedCount = 0;

  for (const { chapter, lesson } of entries) {
    const currentImage = String(lesson.image || "").trim();
    const pathExists = currentImage && fs.existsSync(path.join(PUBLIC_DIR, currentImage.replace(/^\.\//, "")));
    const isFallbackImage = currentImage === "./images/lessons/placeholder-education.svg";

    if (currentImage && pathExists && !isFallbackImage) {
      if (!manifestFiles.includes(currentImage)) {
        manifestFiles.push(currentImage);
      }
      continue;
    }

    if (CHECK_ONLY) {
      console.log(`Needs image: ${lesson.title?.English || lesson.id}`);
      continue;
    }

    const result = await findImageForLesson(lesson, chapter.title).catch(() => null);

    if (result) {
      lesson.image = result.relativePath;
      metadata[lesson.id] = {
        lessonId: lesson.id,
        classKey: `${lesson.id}`,
        title: result.title,
        filename: result.filename,
        relativePath: result.relativePath,
        sourceUrl: result.sourceUrl,
        sourceName: result.sourceName,
        license: result.license,
        query: result.query,
        createdAt: new Date().toISOString()
      };
      updatedCount += 1;
      manifestFiles.push(result.relativePath);
      console.log(`Imported image for ${lesson.title?.English || lesson.id}: ${result.relativePath}`);
    }
    else {
      lesson.image = "./images/lessons/placeholder-education.svg";
      metadata[lesson.id] = {
        lessonId: lesson.id,
        classKey: "fallback",
        title: lesson?.title?.English || lesson?.id || "Lesson",
        filename: "placeholder-education.svg",
        relativePath: "./images/lessons/placeholder-education.svg",
        sourceUrl: null,
        sourceName: "Local fallback",
        license: "Fallback placeholder",
        query: buildQuery(lesson, chapter.title)[0],
        createdAt: new Date().toISOString(),
        status: "fallback"
      };
      manifestFiles.push("./images/lessons/placeholder-education.svg");
      console.log(`Fallback used for ${lesson.title?.English || lesson.id}`);
    }
  }

  if (!CHECK_ONLY) {
    saveLearningData(data);
    fs.writeFileSync(METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify({ files: [...new Set(manifestFiles)].sort() }, null, 2)}\n`, "utf8");
    console.log(`Updated ${updatedCount} lesson images.`);
  }
  else {
    console.log("Check mode complete. No files were written.");
  }
}

main().catch(error => {
  console.error("Image import failed:", error);
  process.exit(1);
});
