// Merges every class into the single learningData object the app reads.
// Each class is one JSON file in ./curriculum (see docs/CONTENT_GUIDE.md).
import class1 from "./curriculum/class-1.json";
import class2 from "./curriculum/class-2.json";
import class3 from "./curriculum/class-3.json";
import class4 from "./curriculum/class-4.json";
import class5 from "./curriculum/class-5.json";
import class6 from "./curriculum/class-6.json";
import class7 from "./curriculum/class-7.json";
import class8 from "./curriculum/class-8.json";
import class9 from "./curriculum/class-9.json";
import class10 from "./curriculum/class-10.json";

export const learningData = {
  class1,
  class2,
  class3,
  class4,
  class5,
  class6,
  class7,
  class8,
  class9,
  class10
};
