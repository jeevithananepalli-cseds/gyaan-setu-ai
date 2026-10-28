// Offline question-and-answer knowledge used by the assistant search.
export const offlineKnowledge = [
  {
    topic: "photosynthesis",
    aliases: {
      English: ["photosynthesis", "plants make food", "how plants make food", "how plants prepare food", "why plants need sunlight", "plant food"],
      Telugu: ["కిరణజన్య సంయోగక్రియ", "మొక్కలు ఆహారం ఎలా తయారు చేస్తాయి"],
      Hindi: ["प्रकाश संश्लेषण", "पौधे भोजन कैसे बनाते हैं"]
    },
    answer: {
      English: "Photosynthesis is how green plants use sunlight, water and carbon dioxide to make food and release oxygen.",
      Telugu: "కిరణజన్య సంయోగక్రియలో ఆకుపచ్చ మొక్కలు సూర్యకాంతి, నీరు మరియు కార్బన్ డయాక్సైడ్‌తో ఆహారం తయారు చేసి ఆక్సిజన్‌ను విడుదల చేస్తాయి.",
      Hindi: "प्रकाश संश्लेषण में हरे पौधे सूर्य के प्रकाश, पानी और कार्बन डाइऑक्साइड से भोजन बनाते हैं और ऑक्सीजन छोड़ते हैं।"
    },
    example: {
      English: "A green leaf is like a tiny food factory.",
      Telugu: "ఆకుపచ్చ ఆకు ఒక చిన్న ఆహార కర్మాగారం లాంటిది.",
      Hindi: "हरी पत्ती एक छोटी भोजन बनाने वाली फैक्टरी जैसी होती है।"
    }
  },
  {
    topic: "plants",
    aliases: { English: ["plant", "plants", "tree", "trees", "parts of a plant"], Telugu: ["మొక్క", "మొక్కలు", "చెట్టు", "మొక్క భాగాలు"], Hindi: ["पौधा", "पौधे", "पेड़", "पौधे के भाग"] },
    answer: {
      English: "Plants are living things. Their roots hold them in soil, stems support them, leaves make food, and flowers can make seeds.",
      Telugu: "మొక్కలు జీవులు. వేర్లు మట్టిలో పట్టుకుంటాయి, కాండం ఆధారం ఇస్తుంది, ఆకులు ఆహారం తయారు చేస్తాయి, పువ్వులు విత్తనాలను తయారు చేయగలవు.",
      Hindi: "पौधे जीवित चीजें हैं। जड़ें उन्हें मिट्टी में पकड़ती हैं, तना सहारा देता है, पत्तियां भोजन बनाती हैं और फूल बीज बना सकते हैं।"
    }
  },
  {
    topic: "animals and habitats",
    aliases: { English: ["animals", "animal habitat", "where animals live", "homes of animals", "habitat"], Telugu: ["జంతువులు", "జంతువుల నివాసం", "జంతువులు ఎక్కడ ఉంటాయి"], Hindi: ["जानवर", "जानवरों का आवास", "जानवर कहाँ रहते हैं"] },
    answer: {
      English: "A habitat is the home of an animal. Animals live in places that give them food, water, air and shelter.",
      Telugu: "నివాసం అంటే జంతువు ఉండే ఇల్లు. ఆహారం, నీరు, గాలి మరియు రక్షణ లభించే చోట జంతువులు ఉంటాయి.",
      Hindi: "आवास किसी जानवर का घर होता है। जानवर वहाँ रहते हैं जहाँ उन्हें भोजन, पानी, हवा और आश्रय मिलता है।"
    }
  },
  {
    topic: "human body",
    aliases: { English: ["human body", "body parts", "our body", "organs"], Telugu: ["మానవ శరీరం", "శరీర భాగాలు", "మన శరీరం"], Hindi: ["मानव शरीर", "शरीर के अंग", "हमारा शरीर"] },
    answer: {
      English: "Our body has parts that work together. The heart pumps blood, the lungs help us breathe, and the brain helps us think.",
      Telugu: "మన శరీర భాగాలు కలిసి పనిచేస్తాయి. గుండె రక్తాన్ని పంపుతుంది, ఊపిరితిత్తులు శ్వాసకు సహాయపడతాయి, మెదడు ఆలోచించడానికి సహాయపడుతుంది.",
      Hindi: "हमारे शरीर के अंग मिलकर काम करते हैं। हृदय रक्त पंप करता है, फेफड़े सांस लेने में और मस्तिष्क सोचने में मदद करता है।"
    }
  },
  {
    topic: "healthy food and health",
    aliases: { English: ["food", "healthy food", "health", "healthy habits", "good food"], Telugu: ["ఆహారం", "ఆరోగ్యకరమైన ఆహారం", "ఆరోగ్యం", "ఆరోగ్య అలవాట్లు"], Hindi: ["भोजन", "स्वस्थ भोजन", "स्वास्थ्य", "स्वस्थ आदतें"] },
    answer: {
      English: "Healthy food gives us energy and helps us grow. Eat different fruits, vegetables, grains and proteins, drink clean water and keep clean.",
      Telugu: "ఆరోగ్యకరమైన ఆహారం శక్తిని ఇస్తుంది మరియు పెరగడానికి సహాయపడుతుంది. పండ్లు, కూరగాయలు, ధాన్యాలు, ప్రోటీన్ ఉన్న ఆహారం తిని శుభ్రమైన నీరు తాగాలి.",
      Hindi: "स्वस्थ भोजन हमें ऊर्जा देता है और बढ़ने में मदद करता है। फल, सब्जियां, अनाज और प्रोटीन खाएं, साफ पानी पिएं और स्वच्छ रहें।"
    }
  },
  {
    topic: "water cycle",
    aliases: { English: ["water cycle", "rain cycle", "how rain forms", "evaporation"], Telugu: ["నీటి చక్రం", "వర్షం ఎలా వస్తుంది", "నీరు ఆవిరి"], Hindi: ["जल चक्र", "बारिश कैसे होती है", "पानी का चक्र"] },
    answer: {
      English: "In the water cycle, the Sun warms water, it becomes vapour, clouds form, and water falls back as rain.",
      Telugu: "నీటి చక్రంలో సూర్యుడు నీటిని వేడి చేస్తాడు, అది ఆవిరిగా మారుతుంది, మేఘాలు ఏర్పడి నీరు వర్షంగా తిరిగి పడుతుంది.",
      Hindi: "जल चक्र में सूर्य पानी को गर्म करता है, पानी भाप बनता है, बादल बनते हैं और पानी बारिश के रूप में वापस गिरता है।"
    }
  },
  {
    topic: "water conservation",
    aliases: { English: ["water", "save water", "water conservation", "why water is important", "water is important"], Telugu: ["నీరు", "నీటిని ఆదా చేయడం", "నీటి సంరక్షణ", "నీరు ఎందుకు ముఖ్యం"], Hindi: ["पानी", "पानी बचाओ", "जल संरक्षण", "पानी क्यों जरूरी है"] },
    answer: {
      English: "Water is needed by people, animals and plants. Close taps, repair leaks and use only the water we need.",
      Telugu: "మనుషులు, జంతువులు మరియు మొక్కలకు నీరు అవసరం. కుళాయిలు మూసి, లీకేజీలను సరిచేసి అవసరమైనంత నీటినే వాడాలి.",
      Hindi: "लोगों, जानवरों और पौधों को पानी चाहिए। नल बंद करें, रिसाव ठीक करें और उतना ही पानी लें जितना चाहिए।"
    }
  },
  {
    topic: "weather and seasons",
    aliases: { English: ["weather", "seasons", "summer", "winter", "rainy season", "temperature"], Telugu: ["వాతావరణం", "ఋతువులు", "వేసవి", "చలికాలం", "వర్షాకాలం"], Hindi: ["मौसम", "ऋतुएं", "गर्मी", "सर्दी", "बरसात"] },
    answer: {
      English: "Weather tells us what the air is like today, such as sunny, rainy, windy or cloudy. Seasons bring regular changes during the year.",
      Telugu: "ఈ రోజు గాలి ఎలా ఉందో వాతావరణం చెబుతుంది, ఉదాహరణకు ఎండ, వర్షం, గాలి లేదా మేఘాలు. ఋతువులు సంవత్సరంలో క్రమమైన మార్పులను తెస్తాయి.",
      Hindi: "मौसम बताता है कि आज हवा कैसी है, जैसे धूप, बारिश, हवा या बादल। ऋतुएं साल में नियमित बदलाव लाती हैं।"
    }
  },
  {
    topic: "air and soil",
    aliases: { English: ["air", "soil", "soil types", "why soil is important", "what is air"], Telugu: ["గాలి", "మట్టి", "నేల", "మట్టి ఎందుకు ముఖ్యం"], Hindi: ["हवा", "मिट्टी", "मिट्टी क्यों जरूरी है"] },
    answer: {
      English: "Air is the mixture of gases around us and living things need it to breathe. Soil supports plants and contains minerals, air and water.",
      Telugu: "మన చుట్టూ ఉన్న వాయువుల మిశ్రమమే గాలి; జీవులు శ్వాసకు దాన్ని అవసరం పడతాయి. మట్టి మొక్కలకు ఆధారం ఇస్తుంది మరియు ఖనిజాలు, గాలి, నీటిని కలిగి ఉంటుంది.",
      Hindi: "हमारे चारों ओर गैसों का मिश्रण हवा है और जीवों को सांस लेने के लिए इसकी जरूरत होती है। मिट्टी पौधों को सहारा देती है और इसमें खनिज, हवा और पानी होते हैं।"
    }
  },
  {
    topic: "environment and pollution",
    aliases: { English: ["environment", "pollution", "protect environment", "clean environment", "harmful smoke"], Telugu: ["పర్యావరణం", "కాలుష్యం", "పర్యావరణ రక్షణ", "శుభ్రమైన పర్యావరణం"], Hindi: ["पर्यावरण", "प्रदूषण", "पर्यावरण की रक्षा", "स्वच्छ पर्यावरण"] },
    answer: {
      English: "The environment includes living things, air, water and land around us. Pollution makes it dirty, so we should keep places clean and avoid waste and smoke.",
      Telugu: "మన చుట్టూ ఉన్న జీవులు, గాలి, నీరు మరియు నేల పర్యావరణంలో భాగాలు. కాలుష్యం దాన్ని మురికిగా చేస్తుంది, కాబట్టి ప్రదేశాలను శుభ్రంగా ఉంచి వ్యర్థాలు, పొగను తగ్గించాలి.",
      Hindi: "हमारे चारों ओर के जीव, हवा, पानी और भूमि पर्यावरण का हिस्सा हैं। प्रदूषण इसे गंदा करता है, इसलिए जगहें साफ रखें और कचरे व धुएं को कम करें।"
    }
  },
  {
    topic: "recycling and forests",
    aliases: { English: ["recycling", "recycle", "reduce reuse recycle", "forests", "trees"], Telugu: ["రీసైక్లింగ్", "వ్యర్థాల పునర్వినియోగం", "అడవులు", "చెట్లు"], Hindi: ["पुनर्चक्रण", "कचरा पुनर्चक्रण", "वन", "पेड़"] },
    answer: {
      English: "Recycling turns some used materials into useful things again. Forests give homes to animals, clean air and many resources, so we must protect trees.",
      Telugu: "రీసైక్లింగ్‌లో వాడిన వస్తువులను మళ్లీ ఉపయోగకరమైన వస్తువులుగా మారుస్తారు. అడవులు జంతువులకు ఇళ్లు, శుభ్రమైన గాలి మరియు వనరులు ఇస్తాయి, కాబట్టి చెట్లను కాపాడాలి.",
      Hindi: "पुनर्चक्रण में इस्तेमाल की गई चीजों से फिर उपयोगी चीजें बनाई जाती हैं। वन जानवरों को घर, साफ हवा और संसाधन देते हैं, इसलिए पेड़ों की रक्षा करनी चाहिए।"
    }
  },
  {
    topic: "natural resources and agriculture",
    aliases: { English: ["natural resources", "resources from nature", "agriculture", "farming", "crops"], Telugu: ["సహజ వనరులు", "ప్రకృతి వనరులు", "వ్యవసాయం", "పంటలు"], Hindi: ["प्राकृतिक संसाधन", "प्रकृति के संसाधन", "कृषि", "खेती", "फसल"] },
    answer: {
      English: "Natural resources come from nature, such as water, soil, forests and sunlight. Agriculture is growing crops and keeping animals for food.",
      Telugu: "నీరు, మట్టి, అడవులు మరియు సూర్యకాంతి వంటి ప్రకృతి నుండి వచ్చే వాటిని సహజ వనరులు అంటారు. ఆహారం కోసం పంటలు పండించడం, జంతువులను పెంచడం వ్యవసాయం.",
      Hindi: "पानी, मिट्टी, वन और सूर्य का प्रकाश प्रकृति से मिलने वाले प्राकृतिक संसाधन हैं। भोजन के लिए फसल उगाना और जानवर पालना कृषि है।"
    }
  },
  {
    topic: "earth moon sun planets",
    aliases: { English: ["earth", "moon", "sun", "planets", "solar system", "day and night", "seasons"], Telugu: ["భూమి", "చంద్రుడు", "సూర్యుడు", "గ్రహాలు", "సౌర కుటుంబం", "పగలు రాత్రి"], Hindi: ["पृथ्वी", "चंद्रमा", "सूर्य", "ग्रह", "सौर मंडल", "दिन रात"] },
    answer: {
      English: "Earth is our home planet. It moves around the Sun, and the Moon moves around Earth. Earth’s turning causes day and night.",
      Telugu: "భూమి మన నివాస గ్రహం. అది సూర్యుని చుట్టూ తిరుగుతుంది, చంద్రుడు భూమి చుట్టూ తిరుగుతాడు. భూమి తన అక్షంపై తిరగడం వల్ల పగలు, రాత్రి ఏర్పడతాయి.",
      Hindi: "पृथ्वी हमारा घर ग्रह है। यह सूर्य के चारों ओर घूमती है और चंद्रमा पृथ्वी के चारों ओर घूमता है। पृथ्वी के घूमने से दिन और रात होते हैं।"
    }
  },
  {
    topic: "matter",
    aliases: { English: ["matter", "solid liquid gas", "states of matter", "things are made of"], Telugu: ["పదార్థం", "ఘన ద్రవ వాయువు", "పదార్థ స్థితులు"], Hindi: ["पदार्थ", "ठोस द्रव गैस", "पदार्थ की अवस्थाएं"] },
    answer: {
      English: "Matter is anything that takes up space. Solids keep their shape, liquids flow, and gases spread through space.",
      Telugu: "స్థలాన్ని ఆక్రమించే ప్రతిదీ పదార్థం. ఘన పదార్థాలకు ఆకారం ఉంటుంది, ద్రవాలు ప్రవహిస్తాయి, వాయువులు స్థలమంతా వ్యాపిస్తాయి.",
      Hindi: "जो जगह घेरता है वह पदार्थ है। ठोस अपना आकार रखते हैं, द्रव बहते हैं और गैसें जगह में फैलती हैं।"
    }
  },
  {
    topic: "force light sound and simple machines",
    aliases: { English: ["force", "push pull", "light", "sound", "simple machines", "lever", "pulley"], Telugu: ["బలం", "తోపు లాగుడు", "కాంతి", "శబ్దం", "సరళ యంత్రాలు"], Hindi: ["बल", "धक्का खींच", "प्रकाश", "ध्वनि", "सरल मशीनें"] },
    answer: {
      English: "A force is a push or pull that can move or change something. Light helps us see, sound is made by vibrations, and simple machines make work easier.",
      Telugu: "బలం అంటే తోపు లేదా లాగుడు; అది వస్తువును కదిలించవచ్చు లేదా మార్చవచ్చు. కాంతి చూడటానికి సహాయపడుతుంది, కంపనాల వల్ల శబ్దం వస్తుంది, సరళ యంత్రాలు పనిని సులభం చేస్తాయి.",
      Hindi: "बल धक्का या खींच है जो किसी चीज को चला या बदल सकता है। प्रकाश हमें देखने में मदद करता है, कंपन से ध्वनि बनती है और सरल मशीनें काम आसान करती हैं।"
    }
  },
  {
    topic: "basic mathematics",
    aliases: { English: ["math", "mathematics", "addition", "subtraction", "multiplication", "division", "shapes", "numbers"], Telugu: ["గణితం", "కూడిక", "తీసివేత", "గుణకారం", "భాగహారం", "సంఖ్యలు"], Hindi: ["गणित", "जोड़", "घटाव", "गुणा", "भाग", "संख्याएं"] },
    answer: {
      English: "Mathematics helps us count, compare and solve problems. Addition puts groups together, subtraction takes away, multiplication adds equal groups, and division shares equally.",
      Telugu: "గణితం లెక్కించడానికి, పోల్చడానికి మరియు సమస్యలు పరిష్కరించడానికి సహాయపడుతుంది. కూడిక సమూహాలను కలుపుతుంది, తీసివేత తగ్గిస్తుంది, గుణకారం సమాన సమూహాలను కలుపుతుంది, భాగహారం సమానంగా పంచుతుంది.",
      Hindi: "गणित गिनने, तुलना करने और समस्याएं हल करने में मदद करता है। जोड़ समूह मिलाता है, घटाव कम करता है, गुणा बराबर समूह जोड़ता है और भाग बराबर बांटता है।"
    }
  }
];
