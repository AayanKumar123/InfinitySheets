// College Board Advanced Placement — complete course list with CED units.
// Source: current AP Course and Exam Descriptions (2025–26 academic year).
// Topics are the official CED units in syllabus order.

const AP = 'https://apcentral.collegeboard.org/courses/';

const PHYSICS_1_UNITS = [
  'Unit 1: Kinematics',
  'Unit 2: Force and Translational Dynamics',
  'Unit 3: Work, Energy, and Power',
  'Unit 4: Linear Momentum',
  'Unit 5: Torque and Rotational Dynamics',
  'Unit 6: Energy and Momentum of Rotating Systems',
  'Unit 7: Oscillations',
  'Unit 8: Fluids',
];

const CALC_AB_UNITS = [
  'Unit 1: Limits and Continuity',
  'Unit 2: Differentiation: Definition and Fundamental Properties',
  'Unit 3: Differentiation: Composite, Implicit, and Inverse Functions',
  'Unit 4: Contextual Applications of Differentiation',
  'Unit 5: Analytical Applications of Differentiation',
  'Unit 6: Integration and Accumulation of Change',
  'Unit 7: Differential Equations',
  'Unit 8: Applications of Integration',
];

const ENGLISH_LANG_TOPICS = [
  'Big Idea: Rhetorical Situation',
  'Big Idea: Claims and Evidence',
  'Big Idea: Reasoning and Organization',
  'Big Idea: Style',
  'Unit 1–3: Rhetorical situation, claims, evidence, and thesis',
  'Unit 4–6: Reasoning, organization, and style in argument',
  'Unit 7–9: Synthesis, complexity, and sophistication',
  'Free response: Synthesis essay',
  'Free response: Rhetorical analysis essay',
  'Free response: Argument essay',
  'Multiple choice: Reading and writing questions',
];

const US_HISTORY_PERIODS = [
  'Period 1: 1491–1607 — Native societies and European contact',
  'Period 2: 1607–1754 — Colonial America',
  'Period 3: 1754–1800 — Revolution and the new nation',
  'Period 4: 1800–1848 — Expansion, reform, and the market revolution',
  'Period 5: 1844–1877 — Civil War and Reconstruction',
  'Period 6: 1865–1898 — The Gilded Age',
  'Period 7: 1890–1945 — Progressivism, world wars, and the Depression',
  'Period 8: 1945–1980 — Cold War and civil rights',
  'Period 9: 1980–Present — Contemporary America',
];

const MICRO_UNITS = [
  'Unit 1: Basic Economic Concepts',
  'Unit 2: Supply and Demand',
  'Unit 3: Production, Cost, and the Perfect Competition Model',
  'Unit 4: Imperfect Competition',
  'Unit 5: Factor Markets',
  'Unit 6: Market Failure and the Role of Government',
];

const MACRO_UNITS = [
  'Unit 1: Basic Economic Concepts',
  'Unit 2: Economic Indicators and the Business Cycle',
  'Unit 3: National Income and Price Determination',
  'Unit 4: Financial Sector',
  'Unit 5: Long-Run Consequences of Stabilization Policies',
  'Unit 6: Open Economy—International Trade and Finance',
];

const WORLD_LANGUAGE_UNITS = [
  'Unit 1: Families in Different Societies',
  'Unit 2: The Influence of Language and Culture on Identity',
  'Unit 3: Influences of Beauty and Art',
  'Unit 4: How Science and Technology Affect Our Lives',
  'Unit 5: Factors That Impact the Quality of Life',
  'Unit 6: Environmental, Political, and Societal Challenges',
  'Interpretive communication: print and audio texts',
  'Interpersonal writing: email reply',
  'Presentational writing: argumentative essay',
  'Interpersonal speaking: conversation',
  'Presentational speaking: cultural comparison',
];

const EAST_ASIAN_LANGUAGE_UNITS = [
  'Theme: Families and Communities',
  'Theme: Personal and Public Identities',
  'Theme: Beauty and Aesthetics',
  'Theme: Science and Technology',
  'Theme: Contemporary Life',
  'Theme: Global Challenges',
  'Interpretive communication: listening and reading',
  'Interpersonal writing and speaking',
  'Presentational writing and speaking',
];

const ART_DESIGN_TOPICS = [
  'Sustained Investigation (portfolio section 1)',
  'Selected Works (portfolio section 2)',
  'Inquiry: developing a guiding question',
  'Practice, experimentation, and revision',
  'Materials, processes, and ideas',
  'Elements and principles of design',
  'Written evidence and artist statements',
];

const CAPSTONE_BIG_IDEAS = [
  'Big Idea 1: Question and Explore',
  'Big Idea 2: Understand and Analyze',
  'Big Idea 3: Evaluate Multiple Perspectives',
  'Big Idea 4: Synthesize Ideas',
  'Big Idea 5: Team, Transform, and Transmit',
];

export default {
  board: 'AP',
  subjects: [
    // ---------------- Math & Computer Science ----------------
    { name: 'Calculus AB', url: AP + 'ap-calculus-ab', topics: [...CALC_AB_UNITS] },
    {
      name: 'Calculus BC',
      url: AP + 'ap-calculus-bc',
      topics: [
        ...CALC_AB_UNITS,
        'Unit 9: Parametric Equations, Polar Coordinates, and Vector-Valued Functions',
        'Unit 10: Infinite Sequences and Series',
      ],
    },
    {
      name: 'Precalculus',
      url: AP + 'ap-precalculus',
      topics: [
        'Unit 1: Polynomial and Rational Functions',
        'Unit 2: Exponential and Logarithmic Functions',
        'Unit 3: Trigonometric and Polar Functions',
        'Unit 4: Functions Involving Parameters, Vectors, and Matrices',
      ],
    },
    {
      name: 'Statistics',
      url: AP + 'ap-statistics',
      topics: [
        'Unit 1: Exploring One-Variable Data',
        'Unit 2: Exploring Two-Variable Data',
        'Unit 3: Collecting Data',
        'Unit 4: Probability, Random Variables, and Probability Distributions',
        'Unit 5: Sampling Distributions',
        'Unit 6: Inference for Categorical Data: Proportions',
        'Unit 7: Inference for Quantitative Data: Means',
        'Unit 8: Inference for Categorical Data: Chi-Square',
        'Unit 9: Inference for Quantitative Data: Slopes',
      ],
    },
    {
      name: 'Computer Science',
      url: AP + 'ap-computer-science-a',
      topics: [
        'Unit 1: Using Objects and Methods',
        'Unit 2: Selection and Iteration',
        'Unit 3: Class Creation',
        'Unit 4: Data Collections',
      ],
    },
    {
      name: 'Computer Science Principles',
      url: AP + 'ap-computer-science-principles',
      topics: [
        'Big Idea 1: Creative Development',
        'Big Idea 2: Data',
        'Big Idea 3: Algorithms and Programming',
        'Big Idea 4: Computer Systems and Networks',
        'Big Idea 5: Impact of Computing',
        'Create performance task',
      ],
    },

    // ---------------- Sciences ----------------
    { name: 'Physics', url: AP + 'ap-physics-1', topics: [...PHYSICS_1_UNITS] },
    { name: 'Physics 1', url: AP + 'ap-physics-1', topics: [...PHYSICS_1_UNITS] },
    {
      name: 'Physics 2',
      url: AP + 'ap-physics-2',
      topics: [
        'Unit 9: Thermodynamics',
        'Unit 10: Electric Force, Field, and Potential',
        'Unit 11: Electric Circuits',
        'Unit 12: Magnetism and Electromagnetism',
        'Unit 13: Geometric Optics',
        'Unit 14: Waves, Sound, and Physical Optics',
        'Unit 15: Modern Physics',
      ],
    },
    {
      name: 'Physics C: Mechanics',
      url: AP + 'ap-physics-c-mechanics',
      topics: [
        'Unit 1: Kinematics',
        'Unit 2: Force and Translational Dynamics',
        'Unit 3: Work, Energy, and Power',
        'Unit 4: Linear Momentum',
        'Unit 5: Torque and Rotational Dynamics',
        'Unit 6: Energy and Momentum of Rotating Systems',
        'Unit 7: Oscillations',
      ],
    },
    {
      name: 'Physics C: Electricity & Magnetism',
      url: AP + 'ap-physics-c-electricity-and-magnetism',
      topics: [
        'Unit 8: Electric Charges, Fields, and Gauss\'s Law',
        'Unit 9: Electric Potential',
        'Unit 10: Conductors and Capacitors',
        'Unit 11: Electric Circuits',
        'Unit 12: Magnetic Fields and Electromagnetism',
        'Unit 13: Electromagnetic Induction',
      ],
    },
    {
      name: 'Chemistry',
      url: AP + 'ap-chemistry',
      topics: [
        'Unit 1: Atomic Structure and Properties',
        'Unit 2: Compound Structure and Properties',
        'Unit 3: Properties of Substances and Mixtures',
        'Unit 4: Chemical Reactions',
        'Unit 5: Kinetics',
        'Unit 6: Thermochemistry',
        'Unit 7: Equilibrium',
        'Unit 8: Acids and Bases',
        'Unit 9: Thermodynamics and Electrochemistry',
      ],
    },
    {
      name: 'Biology',
      url: AP + 'ap-biology',
      topics: [
        'Unit 1: Chemistry of Life',
        'Unit 2: Cell Structure and Function',
        'Unit 3: Cellular Energetics',
        'Unit 4: Cell Communication and Cell Cycle',
        'Unit 5: Heredity',
        'Unit 6: Gene Expression and Regulation',
        'Unit 7: Natural Selection',
        'Unit 8: Ecology',
      ],
    },
    {
      name: 'Environmental Science',
      url: AP + 'ap-environmental-science',
      topics: [
        'Unit 1: The Living World: Ecosystems',
        'Unit 2: The Living World: Biodiversity',
        'Unit 3: Populations',
        'Unit 4: Earth Systems and Resources',
        'Unit 5: Land and Water Use',
        'Unit 6: Energy Resources and Consumption',
        'Unit 7: Atmospheric Pollution',
        'Unit 8: Aquatic and Terrestrial Pollution',
        'Unit 9: Global Change',
      ],
    },

    // ---------------- English ----------------
    { name: 'English', url: AP + 'ap-english-language-and-composition', topics: [...ENGLISH_LANG_TOPICS] },
    { name: 'English Language', url: AP + 'ap-english-language-and-composition', topics: [...ENGLISH_LANG_TOPICS] },
    {
      name: 'English Literature',
      url: AP + 'ap-english-literature-and-composition',
      topics: [
        'Unit 1: Short Fiction I',
        'Unit 2: Poetry I',
        'Unit 3: Longer Fiction or Drama I',
        'Unit 4: Short Fiction II',
        'Unit 5: Poetry II',
        'Unit 6: Longer Fiction or Drama II',
        'Unit 7: Short Fiction III',
        'Unit 8: Poetry III',
        'Unit 9: Longer Fiction or Drama III',
      ],
    },

    // ---------------- History & Social Sciences ----------------
    { name: 'History', url: AP + 'ap-united-states-history', topics: [...US_HISTORY_PERIODS] },
    { name: 'US History', url: AP + 'ap-united-states-history', topics: [...US_HISTORY_PERIODS] },
    {
      name: 'World History',
      url: AP + 'ap-world-history',
      topics: [
        'Unit 1: The Global Tapestry (c. 1200–1450)',
        'Unit 2: Networks of Exchange (c. 1200–1450)',
        'Unit 3: Land-Based Empires (c. 1450–1750)',
        'Unit 4: Transoceanic Interconnections (c. 1450–1750)',
        'Unit 5: Revolutions (c. 1750–1900)',
        'Unit 6: Consequences of Industrialization (c. 1750–1900)',
        'Unit 7: Global Conflict (c. 1900–present)',
        'Unit 8: Cold War and Decolonization (c. 1900–present)',
        'Unit 9: Globalization (c. 1900–present)',
      ],
    },
    {
      name: 'European History',
      url: AP + 'ap-european-history',
      topics: [
        'Unit 1: Renaissance and Exploration',
        'Unit 2: Age of Reformation',
        'Unit 3: Absolutism and Constitutionalism',
        'Unit 4: Scientific, Philosophical, and Political Developments',
        'Unit 5: Conflict, Crisis, and Reaction in the Late 18th Century',
        'Unit 6: Industrialization and Its Effects',
        'Unit 7: 19th-Century Perspectives and Political Developments',
        'Unit 8: 20th-Century Global Conflicts',
        'Unit 9: Cold War and Contemporary Europe',
      ],
    },
    {
      name: 'US Government',
      url: AP + 'ap-united-states-government-and-politics',
      topics: [
        'Unit 1: Foundations of American Democracy',
        'Unit 2: Interactions Among Branches of Government',
        'Unit 3: Civil Liberties and Civil Rights',
        'Unit 4: American Political Ideologies and Beliefs',
        'Unit 5: Political Participation',
        'Required foundational documents',
        'Required Supreme Court cases',
      ],
    },
    {
      name: 'Comparative Government',
      url: AP + 'ap-comparative-government-and-politics',
      topics: [
        'Unit 1: Political Systems, Regimes, and Governments',
        'Unit 2: Political Institutions',
        'Unit 3: Political Culture and Participation',
        'Unit 4: Party and Electoral Systems and Citizen Organizations',
        'Unit 5: Political and Economic Changes and Development',
        'Course countries: China, Iran, Mexico, Nigeria, Russia, United Kingdom',
      ],
    },
    {
      name: 'Human Geography',
      url: AP + 'ap-human-geography',
      topics: [
        'Unit 1: Thinking Geographically',
        'Unit 2: Population and Migration Patterns and Processes',
        'Unit 3: Cultural Patterns and Processes',
        'Unit 4: Political Patterns and Processes',
        'Unit 5: Agriculture and Rural Land-Use Patterns and Processes',
        'Unit 6: Cities and Urban Land-Use Patterns and Processes',
        'Unit 7: Industrial and Economic Development Patterns and Processes',
      ],
    },
    {
      name: 'Economics',
      topics: [
        'Microeconomics Unit 1: Basic Economic Concepts',
        'Microeconomics Unit 2: Supply and Demand',
        'Microeconomics Unit 3: Production, Cost, and the Perfect Competition Model',
        'Microeconomics Unit 4: Imperfect Competition',
        'Microeconomics Unit 5: Factor Markets',
        'Microeconomics Unit 6: Market Failure and the Role of Government',
        'Macroeconomics Unit 1: Basic Economic Concepts',
        'Macroeconomics Unit 2: Economic Indicators and the Business Cycle',
        'Macroeconomics Unit 3: National Income and Price Determination',
        'Macroeconomics Unit 4: Financial Sector',
        'Macroeconomics Unit 5: Long-Run Consequences of Stabilization Policies',
        'Macroeconomics Unit 6: Open Economy—International Trade and Finance',
      ],
    },
    { name: 'Microeconomics', url: AP + 'ap-microeconomics', topics: [...MICRO_UNITS] },
    { name: 'Macroeconomics', url: AP + 'ap-macroeconomics', topics: [...MACRO_UNITS] },
    {
      name: 'Psychology',
      url: AP + 'ap-psychology',
      topics: [
        'Unit 1: Biological Bases of Behavior',
        'Unit 2: Cognition',
        'Unit 3: Development and Learning',
        'Unit 4: Social Psychology and Personality',
        'Unit 5: Mental and Physical Health',
        'Research methods and data interpretation (integrated across units)',
      ],
    },
    {
      name: 'African American Studies',
      url: AP + 'ap-african-american-studies',
      topics: [
        'Unit 1: Origins of the African Diaspora',
        'Unit 2: Freedom, Enslavement, and Resistance',
        'Unit 3: The Practice of Freedom',
        'Unit 4: Movements and Debates',
        'Individual student project',
      ],
    },

    // ---------------- Arts ----------------
    {
      name: 'Art History',
      url: AP + 'ap-art-history',
      topics: [
        'Unit 1: Global Prehistory (30,000–500 BCE)',
        'Unit 2: Ancient Mediterranean (3500 BCE–300 CE)',
        'Unit 3: Early Europe and Colonial Americas (200–1750 CE)',
        'Unit 4: Later Europe and Americas (1750–1980 CE)',
        'Unit 5: Indigenous Americas (1000 BCE–1980 CE)',
        'Unit 6: Africa (1100–1980 CE)',
        'Unit 7: West and Central Asia (500 BCE–1980 CE)',
        'Unit 8: South, East, and Southeast Asia (300 BCE–1980 CE)',
        'Unit 9: The Pacific (700–1980 CE)',
        'Unit 10: Global Contemporary (1980 CE–present)',
      ],
    },
    {
      name: 'Music Theory',
      url: AP + 'ap-music-theory',
      topics: [
        'Unit 1: Music Fundamentals I: Pitch, Major Scales and Key Signatures, Rhythm, Meter, and Expressive Elements',
        'Unit 2: Music Fundamentals II: Minor Scales and Key Signatures, Melody, Timbre, and Texture',
        'Unit 3: Music Fundamentals III: Triads and Seventh Chords',
        'Unit 4: Harmony and Voice Leading I: Chord Function, Cadence, and Phrase',
        'Unit 5: Harmony and Voice Leading II: Chord Progressions and Predominant Function',
        'Unit 6: Harmony and Voice Leading III: Embellishments, Motives, and Melodic Devices',
        'Unit 7: Harmony and Voice Leading IV: Secondary Function',
        'Unit 8: Modes and Form',
        'Sight-singing and aural skills',
      ],
    },
    { name: '2-D Art & Design', url: AP + 'ap-2-d-art-and-design', topics: [...ART_DESIGN_TOPICS] },
    { name: '3-D Art & Design', url: AP + 'ap-3-d-art-and-design', topics: [...ART_DESIGN_TOPICS] },
    { name: 'Drawing', url: AP + 'ap-drawing', topics: [...ART_DESIGN_TOPICS] },

    // ---------------- World Languages & Cultures ----------------
    { name: 'Spanish', url: AP + 'ap-spanish-language-and-culture', topics: [...WORLD_LANGUAGE_UNITS] },
    {
      name: 'Spanish Literature',
      url: AP + 'ap-spanish-literature-and-culture',
      topics: [
        'Unit 1: La época medieval',
        'Unit 2: El siglo XVI',
        'Unit 3: El siglo XVII',
        'Unit 4: La literatura romántica, realista y naturalista',
        'Unit 5: La Generación del 98 y el Modernismo',
        'Unit 6: Teatro y poesía del siglo XX',
        'Unit 7: El "Boom" latinoamericano',
        'Unit 8: Escritores contemporáneos',
      ],
    },
    { name: 'French', url: AP + 'ap-french-language-and-culture', topics: [...WORLD_LANGUAGE_UNITS] },
    { name: 'German', url: AP + 'ap-german-language-and-culture', topics: [...WORLD_LANGUAGE_UNITS] },
    { name: 'Italian', url: AP + 'ap-italian-language-and-culture', topics: [...WORLD_LANGUAGE_UNITS] },
    { name: 'Chinese', url: AP + 'ap-chinese-language-and-culture', topics: [...EAST_ASIAN_LANGUAGE_UNITS] },
    { name: 'Japanese', url: AP + 'ap-japanese-language-and-culture', topics: [...EAST_ASIAN_LANGUAGE_UNITS] },
    {
      name: 'Latin',
      url: AP + 'ap-latin',
      topics: [
        'Unit 1: Vergil, Aeneid, Book 1',
        'Unit 2: Caesar, Gallic War, Books 1 and 6',
        'Unit 3: Vergil, Aeneid, Book 2',
        'Unit 4: Caesar, Gallic War, Book 4',
        'Unit 5: Vergil, Aeneid, Book 4',
        'Unit 6: Caesar, Gallic War, Book 5, Part I',
        'Unit 7: Vergil, Aeneid, Books 6, 8, and 12',
        'Unit 8: Caesar, Gallic War, Books 5 (Part II), 6, and 7',
        'Sight reading: prose and poetry',
      ],
    },

    // ---------------- AP Capstone ----------------
    {
      name: 'Seminar',
      url: AP + 'ap-seminar',
      topics: [
        ...CAPSTONE_BIG_IDEAS,
        'Performance Task 1: Team Project and Presentation',
        'Performance Task 2: Individual Research-Based Essay and Presentation',
        'End-of-Course Exam',
      ],
    },
    {
      name: 'Research',
      url: AP + 'ap-research',
      topics: [
        ...CAPSTONE_BIG_IDEAS,
        'Process and Reflection Portfolio (PREP)',
        'Academic Paper',
        'Presentation and Oral Defense',
      ],
    },
  ],
};
