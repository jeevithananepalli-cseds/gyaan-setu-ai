export function resolveLessonImageUrl(lesson) {
    // ---------------------------------------------------------
    // GYAAN SETU - SAFE LESSON IMAGE RESOLVER
    // ---------------------------------------------------------
    // IMPORTANT:
    // - Does NOT modify lesson content
    // - Does NOT modify AI
    // - Does NOT modify chat
    // - Does NOT modify quizzes
    // - Keeps existing Class 1-5 images working
    // - Class 6-10 only receives an image when there is a
    //   specific topic match
    // - No unrelated fallback images
    // ---------------------------------------------------------

    const PLACEHOLDER = "./images/lessons/placeholder-education.svg";

    if (!lesson) {
        return PLACEHOLDER;
    }

    const candidate = String(lesson.image || "").trim();

    // ---------------------------------------------------------
    // 1. KEEP ALL EXISTING VALID LESSON IMAGES
    //    This protects your existing Class 1-5 images.
    // ---------------------------------------------------------
    if (candidate && candidate.includes("/images/lessons/")) {
        return candidate;
    }

    // ---------------------------------------------------------
    // 2. GET ONLY THE INFORMATION NEEDED FOR IMAGE MATCHING
    // ---------------------------------------------------------
    const title = String(lesson.title?.English || "")
        .trim()
        .toLowerCase();

    const lessonId = String(lesson.id || "")
        .trim()
        .toLowerCase();

    // ---------------------------------------------------------
    // 3. EXACT / SPECIFIC TOPIC IMAGE MAP
    //
    // IMPORTANT:
    // Do NOT use broad words such as:
    // "body", "food", "plant", "water", "environment"
    // by themselves.
    //
    // This prevents unrelated images.
    // ---------------------------------------------------------
    const topicImages = {

        // =====================================================
        // FOOD / NUTRITION
        // =====================================================

        "healthy food":
            "./images/lessons/healthy-food.png",

        "food and nutrition":
            "./images/lessons/healthy-food.png",

        "nutrients in food":
            "./images/lessons/healthy-food.png",

        // =====================================================
        // PLANTS
        // =====================================================

        "nutrition in plants":
            "./images/lessons/plants.png",

        "photosynthesis":
            "./images/lessons/plants.png",

        "how plants make food":
            "./images/lessons/plants.png",

        // =====================================================
        // ANIMALS
        // =====================================================

        "nutrition in animals":
            "./images/lessons/animals.png",

        // =====================================================
        // WATER
        // =====================================================

        "water":
            "./images/lessons/water.png",

        "water conservation":
            "./images/lessons/water-conservation.png",

        "conservation of water":
            "./images/lessons/water-conservation.png",

        "water resources":
            "./images/lessons/water.png",

        // =====================================================
        // WEATHER / CLIMATE
        // =====================================================

        "weather":
            "./images/lessons/weather.png",

        "weather and climate":
            "./images/lessons/weather.png",

        "climate":
            "./images/lessons/weather.png",

        // =====================================================
        // FORESTS
        // =====================================================

        "forest":
            "./images/lessons/forest.png",

        "forests":
            "./images/lessons/forest.png",

        "forest and wildlife":
            "./images/lessons/forest.png",

        // =====================================================
        // ANIMAL HABITAT
        // =====================================================

        "animal habitat":
            "./images/lessons/animal-habitat.png",

        "habitats":
            "./images/lessons/animal-habitat.png",

        "habitat":
            "./images/lessons/animal-habitat.png",

        // =====================================================
        // AGRICULTURE
        // =====================================================

        "agriculture":
            "./images/lessons/agriculture.png",

        "crop production":
            "./images/lessons/agriculture.png",

        "farming":
            "./images/lessons/agriculture.png",

        // =====================================================
        // ENVIRONMENT
        // =====================================================

        "clean environment":
            "./images/lessons/clean-environment.png",

        "environment":
            "./images/lessons/environment.png",

        "our environment":
            "./images/lessons/environment.png",

        // =====================================================
        // NATURAL RESOURCES
        // =====================================================

        "natural resources":
            "./images/lessons/natural-resources.png",

        "natural resource":
            "./images/lessons/natural-resources.png",

        // =====================================================
        // RECYCLING
        // =====================================================

        "recycling":
            "./images/lessons/recycling.png",

        "waste management":
            "./images/lessons/recycling.png",

        "recycle":
            "./images/lessons/recycling.png",

        // =====================================================
        // TREES
        // =====================================================

        "trees":
            "./images/lessons/trees.png",

        "tree":
            "./images/lessons/trees.png",

        // =====================================================
        // HEALTH
        // =====================================================

        "health":
            "./images/lessons/health.png",

        "human health":
            "./images/lessons/health.png",

        "hygiene":
            "./images/lessons/health.png",

        // =====================================================
        // BODY
        // =====================================================

        "body parts":
            "./images/lessons/body-parts.png",

        "human body":
            "./images/lessons/body-parts.png",

        // =====================================================
        // LIVING THINGS
        // =====================================================

        "living things":
            "./images/lessons/living-things.png",

        "living things and their surroundings":
            "./images/lessons/living-things.png",

        // =====================================================
        // CLEAN HOME
        // =====================================================

        "clean home":
            "./images/lessons/clean-home.png",

        "hygiene at home":
            "./images/lessons/clean-home.png",

        // =====================================================
        // ROAD SAFETY
        // =====================================================

        "road safety":
            "./images/lessons/safe-travel-road-safety.jpg",

        "safe travel":
            "./images/lessons/safe-travel-road-safety.jpg",

        "safety on roads":
            "./images/lessons/safe-travel-road-safety.jpg",

        "methods of separation":
          "./images/lessons/methods-of-separation.svg",

        // =====================================================
        // MOTION
        // =====================================================
        // NOTE:
        // Your current screenshot shows "Speed and Motion".
        // There is NO suitable local motion image in your
        // current images/lessons folder.
        //
        // Therefore it is intentionally NOT mapped to a
        // landscape/environment image.
        //
        // Add a proper motion image later, then uncomment:
        //
        // "speed and motion":
        //     "./images/lessons/speed-and-motion.png",
        //
        // "motion and measurement":
        //     "./images/lessons/motion-and-measurement.png",

    };


    // ---------------------------------------------------------
    // 4. FIRST: EXACT TITLE MATCH
    // ---------------------------------------------------------
    if (topicImages[title]) {
        return topicImages[title];
    }


    // ---------------------------------------------------------
    // 5. CONTROLLED ID MATCH
    //
    // Useful when the lesson title changes by language but
    // the lesson ID stays stable.
    // ---------------------------------------------------------
    const idImages = {
      "food-body-energy": "./images/lessons/healthy-food.png",
      "food-components": "./images/lessons/healthy-food.png",
      "fabric-understanding": "./images/lessons/fibre-to-fabric.svg",
      "materials-groups": "./images/lessons/sorting-materials.svg",
      "separation-methods": "./images/lessons/methods-of-separation.svg",
      "types-of-changes": "./images/lessons/changes-around-us.svg",
      "plant-parts": "./images/lessons/plants.png",
      "joints-and-movement": "./images/lessons/joints-and-movement.svg",
      "habitats-adaptations": "./images/lessons/habitats-and-adaptations.svg",
      "measuring-motion": "./images/lessons/motion-and-measurement.svg",
      "light-and-shadow": "./images/lessons/light-and-shadows.svg",
      "simple-circuit": "./images/lessons/electricity-and-circuits.svg",
      "magnets- basics": "./images/lessons/magnetic-materials.svg",
      "water-usefulness": "./images/lessons/water.png",
      "air-properties": "./images/lessons/air-around-us.svg",
      "waste-management": "./images/lessons/waste-and-cleanliness.svg",
      "plant-food": "./images/lessons/plants.png",
      "animal-digestion": "./images/lessons/food-and-digestion.svg",
      "heat-transfer": "./images/lessons/temperature-and-heat.svg",
      "acid-base-salt": "./images/lessons/acids-bases-and-salts.svg",
      "weather-patterns": "./images/lessons/weather.png",
      "force-pressure": "./images/lessons/force-and-motion.svg",
      "friction-lesson": "./images/lessons/friction.svg",
      "cell-basics": "./images/lessons/cells-and-cell-structure.svg",
      "microbes-life": "./images/lessons/microorganisms.svg",
      "farming-practices": "./images/lessons/agriculture.png",
      "motion-basics": "./images/lessons/speed-and-motion.svg",
      "cell-study": "./images/lessons/cells-and-cell-structure.svg",
      "chemical-change": "./images/lessons/new-substances-from-reactions.svg",
      "life-functions": "./images/lessons/nutrition-and-respiration.svg"
    };


    if (idImages[lessonId]) {
        return idImages[lessonId];
    }


    // ---------------------------------------------------------
    // 6. SAFE CONTROLLED PHRASE MATCH
    //
    // These are longer, specific phrases.
    // They are NOT generic words.
    // ---------------------------------------------------------

    const specificPhraseImages = [

        {
            phrases: [
                "how plants make food",
                "nutrition in plants",
                "photosynthesis"
            ],
            image: "./images/lessons/plants.png"
        },

        {
            phrases: [
                "nutrition in animals"
            ],
            image: "./images/lessons/animals.png"
        },

        {
            phrases: [
                "water conservation",
                "conservation of water"
            ],
            image: "./images/lessons/water-conservation.png"
        },

        {
            phrases: [
                "natural resources"
            ],
            image: "./images/lessons/natural-resources.png"
        },

        {
            phrases: [
                "forest and wildlife"
            ],
            image: "./images/lessons/forest.png"
        },

        {
            phrases: [
                "animal habitat"
            ],
            image: "./images/lessons/animal-habitat.png"
        },

        {
            phrases: [
                "crop production"
            ],
            image: "./images/lessons/agriculture.png"
        },

        {
            phrases: [
                "waste management"
            ],
            image: "./images/lessons/recycling.png"
        },

        {
            phrases: [
                "clean environment"
            ],
            image: "./images/lessons/clean-environment.png"
        },

        {
            phrases: [
                "road safety",
                "safe travel"
            ],
            image: "./images/lessons/safe-travel-road-safety.jpg"
        }
    ];


    for (const rule of specificPhraseImages) {

        for (const phrase of rule.phrases) {

            if (title === phrase || lessonId === phrase) {
                return rule.image;
            }

        }
    }


    // ---------------------------------------------------------
    // 7. OLD / MISSING CLASS 6-10 IMAGE PATHS
    //
    // Your science-content.js currently contains paths such as:
    //
    // ./images/science/class6-science.svg
    //
    // Those files do not exist in your current images folder.
    //
    // DO NOT replace them with environment.png or another
    // unrelated image.
    // ---------------------------------------------------------

    if (candidate.includes("/images/science/")) {
        return PLACEHOLDER;
    }


    // ---------------------------------------------------------
    // 8. FINAL SAFE FALLBACK
    //
    // Placeholder is better than showing a wrong image.
    // ---------------------------------------------------------

    return PLACEHOLDER;
}
