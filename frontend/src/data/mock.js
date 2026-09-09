// Mock data for InfinitySheets clone (frontend-only)

// Kept in alphabetical order by display name — this order is used
// everywhere tracks are listed (hero chips, onboarding, pickers).
export const EXAM_TRACKS = [
  { id: 'AP', name: 'AP', title: 'College-level depth', desc: 'Advanced Placement practice across calculus, sciences, and English with free-response technique.' },
  { id: 'ASA', name: 'AS & A Level', title: 'Advanced subject depth', desc: 'Focused preparation for Cambridge advanced-level mathematics, sciences, and economics.' },
  { id: 'CBSE', name: 'CBSE', title: 'NCERT-aligned revision', desc: 'Topic practice across mathematics, sciences, and English for CBSE assessments.' },
  { id: 'IB', name: 'IB', title: 'Concept and analysis practice', desc: 'Practice for IB mathematics, sciences, economics, and English coursework.' },
  { id: 'ICSE', name: 'ICSE', title: 'Detailed subject practice', desc: 'Broad, rigorous preparation including science, English, and computer applications.' },
  { id: 'IGCSE', name: 'IGCSE', title: 'International exam technique', desc: 'Cambridge-style subject practice with structured and application-focused questions.' },
  { id: 'JEE', name: 'JEE', title: 'Concept-heavy problem solving', desc: 'Physics, chemistry, and maths sheets built around difficult multi-step questions.' },
  { id: 'LSAT', name: 'LSAT', title: 'Logic under time pressure', desc: 'Logical reasoning and reading comprehension drills with pacing-focused feedback.' },
  { id: 'NEET', name: 'NEET', title: 'High-volume recall and accuracy', desc: 'Biology-heavy revision plus chemistry and physics practice.' },
  { id: 'SAT', name: 'SAT', title: 'Timed reasoning practice', desc: 'Reading, writing, and math sets with pacing-focused feedback.' },
  { id: 'SSLC', name: 'SSLC', title: 'State syllabus mastery', desc: 'Mathematics, science, social science, and English practice for secondary-level exams.' },
];

// Default duration (in minutes) of the actual exam for each track. Used as the
// default value for the worksheet duration slider.
export const EXAM_DURATIONS = {
  AP: 180,
  SSLC: 150,
  CBSE: 180,
  ICSE: 150,
  IGCSE: 120,
  ASA: 90,
  IB: 90,
  SAT: 134,
  JEE: 180,
  NEET: 200,
  LSAT: 140,
};

export const FEATURES = [
  { title: 'Weakness Analysis', desc: 'Every answer sharpens the picture of which concepts need attention—no self-diagnosis required.', icon: 'Brain', tone: 'secondary' },
  { title: 'Targeted Worksheets', desc: 'Practice exactly what you need, instead of repeating what you already know.', icon: 'Target', tone: 'accent' },
  { title: 'Scores & Predicted Grades', desc: 'An accurate score after every session, plus a predicted grade—especially handy for IGCSE and IB, where predictions shape university applications.', icon: 'LineChart', tone: 'primary' },
  { title: 'Custom Feedback & Advice', desc: 'Personalized feedback on every worksheet and clear advice on what to do next—like a tutor reviewing every session.', icon: 'Lightbulb', tone: 'success' },
  { title: 'A Huge Question Bank', desc: 'SSLC, CBSE, ICSE, IGCSE, A Levels, IB, SAT, JEE, NEET and more—including exams with barely any practice-paper support.', icon: 'BookOpen', tone: 'primary' },
  { title: 'Fresh Questions, Free', desc: 'AI does one job here: generating new exam-style questions. For courses like IB or CLAT, where practice material sits behind paywalls, you get an endless supply at no cost.', icon: 'Brain', tone: 'secondary' },
];

export const HOW_IT_WORKS = [
  { n: '01', title: 'Complete a Worksheet', text: 'Answer fresh exam-style questions matched to your syllabus and current level.' },
  { n: '02', title: 'Weakness Analysis', text: 'The platform pinpoints the exact topics and question types costing you marks.' },
  { n: '03', title: 'Targeted Worksheets', text: 'Your next sheet adapts: more, easier problems on your weak points to build them up, and fewer, harder problems on your strong points to keep them sharp.' },
  { n: '04', title: 'Smart Recommendations', text: 'Know exactly what to study next—no planning, no hunting for material.' },
  { n: '05', title: 'Track Your Progress', text: 'Watch topic mastery, predicted scores, and study streaks improve over time.' },
];

export const WHY_IT_WORKS = [
  'Active recall—practice beats rereading',
  'Fresh exam-style questions generated for you',
  'Targets your weak concepts automatically',
  'Accurate scores and predicted grades',
  'Instant, personalized feedback',
  'Completely free—no paywalled practice material',
];

export const RESEARCH_STATS = [
  { num: '2\u00d7', title: 'The testing effect', desc: 'Roediger & Karpicke (2006): practicing retrieval roughly doubled long-term retention compared to repeated rereading.' },
  { num: '#1', title: 'Top-rated study technique', desc: 'Dunlosky et al. (2013) reviewed ten popular study techniques and rated practice testing among the most effective of all.' },
  { num: 'Targeted', title: 'Feedback accelerates learning', desc: 'Decades of research show that immediate, specific feedback\u2014exactly what every worksheet gives you\u2014speeds up improvement.' },
];

export const TESTIMONIALS = [
  { quote: 'I finally knew exactly what to study instead of wasting time guessing.', name: 'High school senior', role: 'IB student' },
  { quote: 'The targeted worksheets helped me improve the topics I struggled with the most.', name: 'IGCSE learner', role: 'Year 11' },
  { quote: 'It is like having a personal tutor that understands how I learn.', name: 'SAT prep student', role: 'Grade 12' },
];

// Subjects per exam track
export const SUBJECTS = {
  SSLC: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'English', 'Computer Science', 'Hindi', 'Kannada'],
  CBSE: ['Mathematics', 'Applied Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'History', 'Geography', 'Political Science', 'Economics', 'English', 'Hindi', 'Computer Science', 'Informatics Practices', 'Accountancy', 'Business Studies', 'Psychology', 'Sociology', 'Physical Education', 'Legal Studies'],
  ICSE: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Applications', 'Computer Science', 'English', 'Hindi', 'History', 'Geography', 'Political Science', 'Economics', 'Commercial Studies', 'Accounts', 'Business Studies', 'Psychology', 'Sociology', 'Environmental Science', 'Physical Education'],
  IGCSE: ['Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology', 'Combined Science', 'Economics', 'Accounting', 'Business Studies', 'English', 'English Literature', 'Computer Science', 'ICT', 'History', 'Geography', 'Sociology', 'Environmental Management', 'Global Perspectives', 'Design & Technology', 'Art & Design', 'Physical Education', 'Travel & Tourism', 'French', 'Spanish', 'Hindi'],
  ASA: ['Mathematics', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Accounting', 'Business Studies', 'Computer Science', 'Psychology', 'Sociology', 'English Literature', 'History', 'Geography', 'Law', 'Media Studies', 'Global Perspectives', 'Environmental Management', 'Design & Technology', 'Art & Design', 'Physical Education', 'French', 'Spanish'],
  IB: ['Mathematics AA', 'Mathematics AI', 'Physics', 'Chemistry', 'Biology', 'Environmental Systems', 'Sports, Exercise & Health Science', 'Design Technology', 'Computer Science', 'Economics', 'Business Management', 'Psychology', 'History', 'Geography', 'Global Politics', 'Philosophy', 'Digital Society', 'English', 'English Language & Literature', 'Spanish B', 'French B', 'Hindi B', 'Chinese B', 'Visual Arts', 'Theatre', 'Music'],
  AP: ['Calculus AB', 'Calculus BC', 'Precalculus', 'Statistics', 'Physics', 'Chemistry', 'Biology', 'Environmental Science', 'Computer Science', 'Computer Science Principles', 'English', 'English Language', 'History', 'US History', 'World History', 'European History', 'US Government', 'Human Geography', 'Economics', 'Psychology', 'Art History', 'Spanish', 'French'],
  // Single-paper exams are one subject each; their topics span the whole syllabus.
  SAT: ['SAT'],
  JEE: ['JEE'],
  NEET: ['NEET'],
  LSAT: ['LSAT'],
};

export const TOPICS = {
  'Computer Science': ['Programming Basics', 'Data Structures', 'Algorithms', 'Databases', 'Networks'],
  'Business Studies': ['Business Objectives', 'Marketing', 'Finance & Accounts', 'People in Business', 'Operations'],
  'Business Management': ['Business Organisation', 'Human Resources', 'Marketing', 'Finance & Accounts', 'Operations Management'],
  Accountancy: ['Partnership Accounts', 'Company Accounts', 'Financial Statements', 'Cash Flow', 'Ratio Analysis'],
  History: ['Sources & Evidence', 'Revolutions', 'World Wars', 'Cold War', 'Independence Movements'],
  Geography: ['Physical Geography', 'Population & Settlement', 'Economic Activity', 'Environmental Risks', 'Map Skills'],
  Psychology: ['Research Methods', 'Biological Approach', 'Cognitive Approach', 'Sociocultural Approach', 'Abnormal Psychology'],
  'Environmental Systems': ['Systems & Models', 'Ecosystems', 'Biodiversity', 'Pollution Management', 'Climate Change'],
  'English Literature': ['Prose', 'Poetry', 'Drama', 'Unseen Texts', 'Literary Devices'],
  Statistics: ['Exploring Data', 'Sampling & Experiments', 'Probability', 'Inference for Means', 'Inference for Proportions'],
  'Calculus AB': ['Limits & Continuity', 'Differentiation', 'Applications of Derivatives', 'Integration', 'Differential Equations'],
  'Calculus BC': ['Parametric & Polar', 'Series', 'Advanced Integration', 'Vector Functions', 'Applications of Series'],
  Mathematics: ['Algebra', 'Trigonometry', 'Geometry', 'Calculus', 'Probability', 'Statistics'],
  'Mathematics AA': ['Functions', 'Sequences', 'Calculus', 'Probability'],
  'Mathematics AI': ['Statistics', 'Modelling', 'Geometry'],
  'Further Maths': ['Complex Numbers', 'Matrices', 'Differential Equations'],
  Math: ['Heart of Algebra', 'Problem Solving', 'Advanced Math', 'Geometry'],
  SAT: ['Heart of Algebra', 'Problem Solving', 'Advanced Math', 'Geometry', 'Passages', 'Vocabulary in Context', 'Grammar', 'Rhetoric'],
  NEET: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Physiology', 'Organic', 'Inorganic', 'Physical', 'Mechanics', 'Modern Physics'],
  Physics: ['Mechanics', 'Electrostatics', 'Optics', 'Thermodynamics', 'Modern Physics', 'Waves'],
  Chemistry: ['Organic', 'Inorganic', 'Physical', 'Coordination Compounds', 'Equilibrium'],
  Biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Physiology'],
  'Social Science': ['History', 'Geography', 'Civics', 'Economics'],
  English: ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Writing'],
  'Computer Applications': ['Java Basics', 'OOP', 'Arrays', 'Strings'],
  Economics: ['Microeconomics', 'Macroeconomics', 'International Trade'],
  Reading: ['Passages', 'Vocabulary in Context'],
  Writing: ['Grammar', 'Rhetoric'],
  'Logical Reasoning': ['Assumptions', 'Strengthen & Weaken', 'Flaws', 'Inference', 'Parallel Reasoning'],
  'Reading Comprehension': ['Main Point', 'Author Attitude', 'Comparative Passages', 'Detail & Structure'],
  JEE: ['Mechanics', 'Electrostatics', 'Optics', 'Thermodynamics', 'Modern Physics', 'Waves', 'Organic', 'Inorganic', 'Physical', 'Coordination Compounds', 'Equilibrium', 'Algebra', 'Trigonometry', 'Geometry', 'Calculus', 'Probability', 'Statistics'],
  LSAT: ['Assumptions', 'Strengthen & Weaken', 'Flaws', 'Inference', 'Parallel Reasoning', 'Main Point', 'Author Attitude', 'Comparative Passages', 'Detail & Structure'],
  Hindi: ['Prose', 'Poetry', 'Grammar', 'Letter Writing', 'Comprehension'],
  Kannada: ['Prose', 'Poetry', 'Grammar', 'Essay Writing', 'Comprehension'],
  'Political Science': ['Constitution & Institutions', 'Political Theory', 'Indian Politics', 'International Relations', 'Elections & Parties'],
  Sociology: ['Society & Structure', 'Culture & Socialisation', 'Social Change', 'Social Institutions', 'Research Methods'],
  'Physical Education': ['Planning in Sports', 'Sports Nutrition', 'Biomechanics', 'Training Methods', 'Sports Psychology'],
  'Informatics Practices': ['Python & Pandas', 'Data Visualisation', 'Databases & SQL', 'Networking', 'Societal Impacts'],
  'Legal Studies': ['Judiciary', 'Legal Services', 'Contract Law', 'Constitutional Law', 'Human Rights'],
  'Applied Mathematics': ['Numbers & Quantification', 'Calculus Applications', 'Probability Distributions', 'Financial Mathematics', 'Linear Programming'],
  'Commercial Studies': ['Business Organisations', 'Marketing', 'Finance & Banking', 'Human Resources', 'Consumer Protection'],
  Accounts: ['Journal & Ledger', 'Final Accounts', 'Partnership', 'Company Accounts', 'Ratio Analysis'],
  'Environmental Science': ['Ecosystems', 'Resources & Conservation', 'Pollution', 'Sustainable Development', 'Environmental Laws'],
  'Additional Mathematics': ['Functions & Quadratics', 'Logarithms & Indices', 'Trigonometry', 'Calculus', 'Vectors & Matrices'],
  'Combined Science': ['Cells & Organisation', 'Chemical Reactions', 'Forces & Energy', 'Electricity', 'Inheritance'],
  Accounting: ['Double Entry', 'Trial Balance', 'Financial Statements', 'Adjustments', 'Ratio Analysis'],
  'Environmental Management': ['Rocks & Minerals', 'Energy Resources', 'Water', 'Atmosphere & Climate', 'Biodiversity'],
  ICT: ['Hardware & Software', 'Networks & Internet', 'Data Handling', 'Spreadsheets & Databases', 'Digital Safety'],
  'Design & Technology': ['Design Process', 'Materials', 'Manufacturing', 'Product Analysis', 'Sustainability'],
  'Art & Design': ['Observation', 'Composition', 'Media & Techniques', 'Artist Research', 'Portfolio Development'],
  French: ['Listening', 'Reading', 'Writing', 'Speaking', 'Grammar'],
  Spanish: ['Listening', 'Reading', 'Writing', 'Speaking', 'Grammar'],
  'Global Perspectives': ['Research Skills', 'Analysis', 'Evaluation', 'Reflection', 'Collaboration'],
  'Travel & Tourism': ['Tourism Industry', 'Destinations', 'Customer Service', 'Marketing & Promotion', 'Sustainable Tourism'],
  Law: ['Legal Systems', 'Contract', 'Tort', 'Criminal Law', 'Statutory Interpretation'],
  'Media Studies': ['Media Language', 'Representation', 'Audiences', 'Industries', 'Production'],
  'English Language & Literature': ['Readers, Writers & Texts', 'Time & Space', 'Intertextuality', 'Textual Analysis', 'Individual Oral'],
  'Global Politics': ['Power & Sovereignty', 'Human Rights', 'Development', 'Peace & Conflict', 'Engagement Activity'],
  Philosophy: ['Being Human', 'Ethics', 'Epistemology', 'Philosophy of Religion', 'Unseen Text Analysis'],
  'Spanish B': ['Identities', 'Experiences', 'Human Ingenuity', 'Social Organisation', 'Sharing the Planet'],
  'French B': ['Identities', 'Experiences', 'Human Ingenuity', 'Social Organisation', 'Sharing the Planet'],
  'Hindi B': ['Identities', 'Experiences', 'Human Ingenuity', 'Social Organisation', 'Sharing the Planet'],
  'Chinese B': ['Identities', 'Experiences', 'Human Ingenuity', 'Social Organisation', 'Sharing the Planet'],
  'Visual Arts': ['Comparative Study', 'Process Portfolio', 'Exhibition', 'Art-making Techniques', 'Contextual Analysis'],
  Theatre: ['Solo Theatre Piece', 'Director\u2019s Notebook', 'Research Presentation', 'Collaborative Project', 'Theatre Traditions'],
  Music: ['Exploring Music', 'Experimenting', 'Presenting', 'Musical Analysis', 'Composition'],
  'Design Technology': ['Human Factors', 'Resource Management', 'Modelling', 'Innovation & Design', 'Classic Design'],
  'Sports, Exercise & Health Science': ['Anatomy', 'Exercise Physiology', 'Energy Systems', 'Movement Analysis', 'Skill in Sport'],
  'Digital Society': ['Concepts', 'Content', 'Contexts', 'Inquiry', 'HL Extension'],
  'US History': ['Colonial America', 'Revolution & Constitution', 'Civil War & Reconstruction', 'Industrialisation & Progressivism', '20th Century & Cold War'],
  'World History': ['Global Tapestry 1200\u20131450', 'Networks of Exchange', 'Land & Sea Empires', 'Revolutions', 'Global Conflict & Cold War'],
  'European History': ['Renaissance & Reformation', 'Absolutism', 'Enlightenment & Revolution', 'Industrialisation', '20th Century Europe'],
  'US Government': ['Foundations of Democracy', 'Branches of Government', 'Civil Liberties & Rights', 'Political Participation', 'Ideologies & Beliefs'],
  'Human Geography': ['Population & Migration', 'Culture', 'Political Geography', 'Agriculture', 'Cities & Urban Land Use'],
  'English Language': ['Rhetorical Analysis', 'Argument', 'Synthesis', 'Style & Tone', 'Evidence'],
  'Computer Science Principles': ['Creative Development', 'Data', 'Algorithms & Programming', 'Computer Systems & Networks', 'Impact of Computing'],
  Precalculus: ['Polynomial & Rational Functions', 'Exponential & Logarithmic', 'Trigonometric Functions', 'Polar & Parametric', 'Matrices & Vectors'],
  'Art History': ['Global Prehistory', 'Ancient Mediterranean', 'Early Europe & Americas', 'Later Europe & Americas', 'Global Contemporary'],
};

// Brief summary of what each topic covers — used on the Course Overview page.
export const TOPIC_SUMMARY = {
  // Mathematics
  Algebra: 'Equations, inequalities, polynomials, and manipulation of algebraic expressions.',
  Trigonometry: 'Ratios, identities, and equations involving sine, cosine, tangent and their inverses.',
  Geometry: 'Shapes, angles, congruence, similarity, coordinate geometry, and proofs.',
  Calculus: 'Limits, derivatives, integrals and how they model change and area.',
  Probability: 'Chance, sample spaces, combinations, and conditional probability.',
  Statistics: 'Data description, distributions, sampling, and interpretation of summaries.',
  Functions: 'Domain, range, transformations, and composition across function families.',
  Sequences: 'Arithmetic, geometric, recursive and series with convergence ideas.',
  Modelling: 'Turning real-world scenarios into mathematical relationships to predict outcomes.',
  'Complex Numbers': 'Operations on a + bi form, Argand diagrams, polar form and roots of unity.',
  Matrices: 'Matrix arithmetic, determinants, inverses and solving linear systems.',
  'Differential Equations': 'Modelling change with first and second order equations and solution techniques.',
  'Heart of Algebra': 'Linear equations, systems, and inequalities — SAT foundations.',
  'Problem Solving': 'Ratios, percentages, and data analysis in real contexts.',
  'Advanced Math': 'Quadratics, exponentials, and manipulating higher-order expressions.',

  // Physics
  Mechanics: 'Motion, forces, energy, and momentum — the core of classical physics.',
  Electrostatics: 'Charges, electric fields, potential, and Coulomb interactions.',
  Optics: 'Reflection, refraction, lenses, mirrors and the wave nature of light.',
  Thermodynamics: 'Heat, work, laws of thermodynamics, and gas behaviour.',
  'Modern Physics': 'Photoelectric effect, atomic models, and an intro to quantum ideas.',
  Waves: 'Transverse and longitudinal waves, interference, resonance and sound.',

  // Chemistry
  Organic: 'Carbon compounds, functional groups, and common reaction mechanisms.',
  Inorganic: 'Periodic trends, bonding, and reactions of non-organic elements and compounds.',
  Physical: 'Rates, energetics, equilibria and quantitative chemistry principles.',
  'Coordination Compounds': 'Ligands, complex ions, geometry, and bonding in transition metal complexes.',
  Equilibrium: 'Reversible reactions, Le Chatelier, and equilibrium constants.',

  // Biology
  'Cell Biology': 'Cell structure, organelles, transport, and the basics of cellular processes.',
  Genetics: 'Inheritance, DNA, alleles, and Mendelian and molecular genetics.',
  Ecology: 'Ecosystems, food webs, energy flow, and human impact on the environment.',
  'Human Physiology': 'Body systems — circulation, respiration, digestion, and homeostasis.',
  'Plant Physiology': 'Photosynthesis, transport, and plant growth and reproduction.',

  // Social Science
  History: 'Key events, movements, and thinkers that shaped the modern world.',
  Geography: 'Physical features, climate, resources, and human geography.',
  Civics: 'Government, rights, duties, and how democratic institutions work.',
  Economics: 'How individuals, firms, and governments make choices with scarce resources.',

  // English
  'Reading Comprehension': 'Main idea, inference, tone, and close reading of passages.',
  Grammar: 'Sentence structure, tenses, agreement and standard usage.',
  Vocabulary: 'Word meanings, roots, and vocabulary in context.',
  Writing: 'Structuring arguments, essays, and clear, persuasive expression.',

  // Computer Applications
  'Java Basics': 'Syntax, variables, control flow, and simple program design in Java.',
  OOP: 'Classes, objects, inheritance, and polymorphism.',
  Arrays: 'Declaring, iterating, and manipulating one- and two-dimensional arrays.',
  Strings: 'String methods, character handling, and common text-processing patterns.',

  // Economics (subject-level topics)
  Microeconomics: 'Demand, supply, elasticity, and how markets allocate resources.',
  Macroeconomics: 'GDP, inflation, unemployment, and fiscal & monetary policy.',
  'International Trade': 'Comparative advantage, exchange rates, and trade policy.',

  // SAT Reading & Writing
  Passages: 'Reading long texts efficiently and answering evidence-based questions.',
  'Vocabulary in Context': 'Choosing the meaning of a word based on how it is used in the passage.',
  Rhetoric: 'Recognising author choices — tone, style, and argument structure.',
};



// Question bank for worksheet generation
export const QUESTION_BANK = {
  'Programming Basics': [
    { q: 'Which data type would best store the value 3.14159?', options: ['int', 'float', 'boolean', 'char'], a: 1 },
    { q: 'A loop that runs while a condition stays true is called a:', options: ['for loop', 'while loop', 'switch', 'function'], a: 1 },
    { q: 'What is the output of 7 % 3 in most languages?', options: ['2', '1', '2.33', '0'], a: 1 },
  ],
  'Data Structures': [
    { q: 'Which structure follows Last In, First Out?', options: ['Queue', 'Stack', 'Linked list', 'Tree'], a: 1 },
    { q: 'Accessing an element by index in an array takes:', options: ['O(n) time', 'O(log n) time', 'O(1) time', 'O(n²) time'], a: 2 },
  ],
  Algorithms: [
    { q: 'Binary search requires the input list to be:', options: ['Sorted', 'Unsorted', 'All positive', 'Of even length'], a: 0 },
    { q: 'The worst-case time complexity of bubble sort is:', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'], a: 2 },
  ],
  Marketing: [
    { q: 'Which of these is NOT one of the four Ps of the marketing mix?', options: ['Product', 'Price', 'Promotion', 'Profit'], a: 3 },
    { q: 'Dividing a market into groups with shared characteristics is called:', options: ['Segmentation', 'Diversification', 'Integration', 'Liquidation'], a: 0 },
  ],
  'Finance & Accounts': [
    { q: 'Gross profit is calculated as:', options: ['Revenue − cost of sales', 'Revenue − all expenses', 'Assets − liabilities', 'Cash in − cash out'], a: 0 },
    { q: 'A break-even point is reached when:', options: ['Profit is maximised', 'Total revenue equals total costs', 'Fixed costs are zero', 'Variable costs equal fixed costs'], a: 1 },
  ],
  'Financial Statements': [
    { q: 'Which statement shows a firm’s position at a single point in time?', options: ['Income statement', 'Balance sheet', 'Cash flow statement', 'Trial balance'], a: 1 },
    { q: 'In the accounting equation, assets equal:', options: ['Liabilities + capital', 'Capital − liabilities', 'Revenue − expenses', 'Cash + stock'], a: 0 },
  ],
  'Research Methods': [
    { q: 'A study where neither participant nor researcher knows the condition is:', options: ['Single blind', 'Double blind', 'Field study', 'Case study'], a: 1 },
    { q: 'The variable a researcher deliberately changes is the:', options: ['Dependent variable', 'Control variable', 'Independent variable', 'Confounding variable'], a: 2 },
  ],
  'Cognitive Approach': [
    { q: 'The multi-store model divides memory into sensory, short-term and:', options: ['Working memory', 'Long-term memory', 'Episodic buffer', 'Procedural memory'], a: 1 },
  ],
  Ecosystems: [
    { q: 'Roughly what proportion of energy transfers between trophic levels?', options: ['1%', '10%', '50%', '90%'], a: 1 },
    { q: 'An organism that makes its own food from sunlight is a:', options: ['Producer', 'Primary consumer', 'Decomposer', 'Detritivore'], a: 0 },
  ],
  'Climate Change': [
    { q: 'Which gas contributes most to the enhanced greenhouse effect by volume released?', options: ['Carbon dioxide', 'Helium', 'Nitrogen', 'Argon'], a: 0 },
  ],
  'Limits & Continuity': [
    { q: 'What is the limit of (x² − 1)/(x − 1) as x approaches 1?', options: ['0', '1', '2', 'Undefined'], a: 2 },
    { q: 'A function is continuous at x = a when the limit at a equals:', options: ['Zero', 'f(a)', 'The derivative at a', 'Infinity'], a: 1 },
  ],
  Differentiation: [
    { q: 'The derivative of sin(x) is:', options: ['cos(x)', '−cos(x)', 'sin(x)', '−sin(x)'], a: 0 },
    { q: 'Using the power rule, the derivative of 5x³ is:', options: ['15x²', '5x²', '3x²', '15x³'], a: 0 },
  ],
  Series: [
    { q: 'The geometric series with |r| < 1 converges to:', options: ['a/(1 − r)', 'a(1 − r)', 'arⁿ', 'Infinity'], a: 0 },
  ],
  'Exploring Data': [
    { q: 'Which measure of centre is most resistant to outliers?', options: ['Mean', 'Median', 'Range', 'Standard deviation'], a: 1 },
    { q: 'A distribution with a long right tail is described as:', options: ['Skewed left', 'Skewed right', 'Symmetric', 'Uniform'], a: 1 },
  ],
  'Sources & Evidence': [
    { q: 'A letter written by someone present at an event is best described as a:', options: ['Primary source', 'Secondary source', 'Tertiary source', 'Historiography'], a: 0 },
  ],
  'World Wars': [
    { q: 'The treaty that formally ended the First World War with Germany was signed at:', options: ['Vienna', 'Versailles', 'Yalta', 'Potsdam'], a: 1 },
  ],
  'Physical Geography': [
    { q: 'A landform created by deposition at a river mouth is a:', options: ['Delta', 'Meander', 'Gorge', 'Waterfall'], a: 0 },
    { q: 'Relief rainfall occurs when air is forced to rise over:', options: ['A warm front', 'High ground', 'A city', 'The sea'], a: 1 },
  ],
  Prose: [
    { q: 'A narrator who knows the thoughts of every character is:', options: ['First person', 'Third person limited', 'Third person omniscient', 'Unreliable'], a: 2 },
  ],
  'Literary Devices': [
    { q: '“The wind whispered through the trees” is an example of:', options: ['Simile', 'Personification', 'Hyperbole', 'Onomatopoeia'], a: 1 },
  ],
  Mechanics: [
    { q: 'A body moves with a uniform velocity of 10 m/s. What is its acceleration?', options: ['10 m/s\u00b2', '0 m/s\u00b2', '5 m/s\u00b2', '\u22125 m/s\u00b2'], a: 1 },
    { q: 'The SI unit of force is:', options: ['Joule', 'Watt', 'Newton', 'Pascal'], a: 2 },
    { q: 'A ball is dropped from a height of 20 m. Time to reach ground (g = 10 m/s\u00b2)?', options: ['1 s', '2 s', '3 s', '4 s'], a: 1 },
    { q: 'Momentum is the product of:', options: ['Mass and velocity', 'Mass and acceleration', 'Force and time', 'Force and distance'], a: 0 },
  ],
  Electrostatics: [
    { q: 'Coulomb’s law states force is inversely proportional to:', options: ['Distance', 'Distance squared', 'Charge', 'Charge squared'], a: 1 },
    { q: 'The SI unit of electric charge is:', options: ['Volt', 'Coulomb', 'Ampere', 'Ohm'], a: 1 },
    { q: 'Like charges:', options: ['Attract', 'Repel', 'Neither', 'Both'], a: 1 },
    { q: 'Electric field at the center of a uniformly charged ring is:', options: ['Maximum', 'Zero', 'Infinite', 'Half'], a: 1 },
  ],
  Optics: [
    { q: 'A convex lens has a focal length of:', options: ['Negative', 'Positive', 'Zero', 'Infinity'], a: 1 },
    { q: 'Speed of light in vacuum is approximately:', options: ['3\u00d710\u2078 m/s', '3\u00d710\u2076 m/s', '3\u00d710\u00b9\u2070 m/s', '3\u00d710\u2074 m/s'], a: 0 },
  ],
  Thermodynamics: [
    { q: 'First law of thermodynamics is based on conservation of:', options: ['Charge', 'Energy', 'Mass', 'Momentum'], a: 1 },
  ],
  'Modern Physics': [
    { q: 'Photoelectric effect was explained by:', options: ['Newton', 'Einstein', 'Bohr', 'Planck'], a: 1 },
  ],
  Waves: [
    { q: 'Sound waves are:', options: ['Transverse', 'Longitudinal', 'Both', 'None'], a: 1 },
  ],
  Algebra: [
    { q: 'Solve: 2x + 6 = 14', options: ['x = 2', 'x = 4', 'x = 6', 'x = 8'], a: 1 },
    { q: 'Roots of x\u00b2 \u2212 5x + 6 = 0', options: ['1, 6', '2, 3', '\u22122, \u22123', '\u22121, \u22126'], a: 1 },
  ],
  Trigonometry: [
    { q: 'sin\u00b2\u03b8 + cos\u00b2\u03b8 equals:', options: ['0', '1', '2', '\u03b8'], a: 1 },
    { q: 'tan(45\u00b0) equals:', options: ['0', '1', '\u221a3', '1/\u221a3'], a: 1 },
  ],
  Geometry: [
    { q: 'Sum of interior angles of a triangle:', options: ['90\u00b0', '180\u00b0', '270\u00b0', '360\u00b0'], a: 1 },
  ],
  Calculus: [
    { q: 'd/dx(x\u00b2) equals:', options: ['x', '2x', 'x\u00b2', '2'], a: 1 },
  ],
  Probability: [
    { q: 'Probability of an impossible event is:', options: ['0', '1', '0.5', 'Undefined'], a: 0 },
  ],
  Statistics: [
    { q: 'Median of 2, 3, 5, 7, 9 is:', options: ['3', '5', '7', '9'], a: 1 },
  ],
  Organic: [
    { q: 'Methane has how many hydrogen atoms?', options: ['2', '3', '4', '5'], a: 2 },
    { q: 'Functional group of alcohol is:', options: ['\u2013COOH', '\u2013OH', '\u2013CHO', '\u2013NH\u2082'], a: 1 },
  ],
  Inorganic: [
    { q: 'Atomic number of carbon:', options: ['4', '6', '8', '12'], a: 1 },
  ],
  Physical: [
    { q: 'pH of pure water at 25\u00b0C:', options: ['5', '6', '7', '8'], a: 2 },
  ],
  'Coordination Compounds': [
    { q: 'Central atom in [Cu(NH\u2083)\u2084]\u00b2\u207a is:', options: ['N', 'Cu', 'H', 'Cl'], a: 1 },
  ],
  Equilibrium: [
    { q: 'Le Chatelier’s principle applies to:', options: ['Reaction rate', 'Equilibrium shift', 'Catalysis', 'Solubility only'], a: 1 },
  ],
  'Cell Biology': [
    { q: 'Powerhouse of the cell:', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'], a: 1 },
  ],
  Genetics: [
    { q: 'Father of genetics:', options: ['Darwin', 'Mendel', 'Watson', 'Crick'], a: 1 },
  ],
  Ecology: [
    { q: 'Producers in an ecosystem are mainly:', options: ['Animals', 'Plants', 'Fungi', 'Bacteria'], a: 1 },
  ],
  'Human Physiology': [
    { q: 'Normal human body temperature in \u00b0C:', options: ['35', '36.5', '37', '38'], a: 2 },
  ],
  'Plant Physiology': [
    { q: 'Photosynthesis occurs in:', options: ['Mitochondria', 'Chloroplast', 'Ribosome', 'Vacuole'], a: 1 },
  ],
  History: [
    { q: 'Year of Indian independence:', options: ['1942', '1945', '1947', '1950'], a: 2 },
  ],
  Geography: [
    { q: 'Largest continent by area:', options: ['Africa', 'Asia', 'Europe', 'Australia'], a: 1 },
  ],
  Civics: [
    { q: 'India is a:', options: ['Monarchy', 'Republic', 'Theocracy', 'Dictatorship'], a: 1 },
  ],
  Economics: [
    { q: 'GDP stands for:', options: ['Gross Domestic Product', 'General Domestic Price', 'Gross Distribution Plan', 'Global Domestic Price'], a: 0 },
  ],
  'Reading Comprehension': [
    { q: 'The main idea of a passage is best described as:', options: ['A minor detail', 'The central message', 'A direct quote', 'A summary of words'], a: 1 },
  ],
  Grammar: [
    { q: 'Identify the verb: "She runs fast."', options: ['She', 'runs', 'fast', 'none'], a: 1 },
  ],
  Vocabulary: [
    { q: 'Synonym of "happy":', options: ['Sad', 'Joyful', 'Angry', 'Tired'], a: 1 },
  ],
};

// Default fallback questions for any topic missing
export const FALLBACK_QUESTIONS = [
  { q: 'This worksheet uses sample questions. Pick the correct option:', options: ['Option A', 'Option B (correct)', 'Option C', 'Option D'], a: 1 },
  { q: 'Which of these is true about practice?', options: ['It is unhelpful', 'It builds mastery', 'It is random', 'None'], a: 1 },
  { q: 'A worksheet helps you to:', options: ['Avoid study', 'Test understanding', 'Sleep', 'Browse social'], a: 1 },
  { q: 'Best way to review mistakes:', options: ['Ignore them', 'Analyze and retry', 'Delete them', 'Forget'], a: 1 },
  { q: 'Spaced repetition improves:', options: ['Speed only', 'Long-term recall', 'Sleep', 'Nothing'], a: 1 },
];

export const STATS_LANDING = [
  { num: '9', label: 'exam and syllabus pathways' },
  { num: '48', label: 'subjects across all courses' },
  { num: '400+', label: 'focused syllabus topics' },
];

// Subject overview info: symbol, tagline, description, key topics, study tips
export const SUBJECT_INFO = {
  SAT: {
    emoji: 'SAT',
    tone: 'primary',
    tagline: 'Reading, writing & math under time.',
    description: 'The whole SAT in one place — Reading & Writing plus Math, practised for pacing and accuracy the way the digital test delivers them.',
    keyTopics: ['Heart of Algebra', 'Problem Solving', 'Advanced Math', 'Reading passages', 'Grammar & rhetoric'],
    studyTips: ['Answer easy questions first, flag the rest', 'Plug in answer choices on tricky math', 'Read the whole passage before detail questions'],
  },
  JEE: {
    emoji: 'JEE',
    tone: 'secondary',
    tagline: 'Physics, chemistry & maths at Advanced depth.',
    description: 'One JEE subject covering Physics, Chemistry and Mathematics — multi-step problems, negative marking discipline and speed under NTA conditions.',
    keyTopics: ['Mechanics', 'Electrostatics', 'Physical chemistry', 'Organic chemistry', 'Calculus'],
    studyTips: ['Attempt the sure questions first, leave the traps', 'Practise numericals to the exact unit and format', 'Time every mock at 3 hours, no exceptions'],
  },
  LSAT: {
    emoji: 'LS',
    tone: 'accent',
    tagline: 'Logic under time pressure.',
    description: 'One LSAT subject covering Logical Reasoning and Reading Comprehension — argument structure, flaw patterns and disciplined elimination at pace.',
    keyTopics: ['Assumptions', 'Strengthen & weaken', 'Flaws', 'Main point', 'Comparative passages'],
    studyTips: ['Find the conclusion before reading answers', 'Predict the answer, then eliminate', 'Track question types you miss and drill them'],
  },
  NEET: {
    emoji: 'NE',
    tone: 'success',
    tagline: 'Biology-heavy recall with physics & chemistry.',
    description: 'One NEET subject covering Biology, Chemistry and Physics — high-volume recall and accuracy across the full syllabus.',
    keyTopics: ['Human physiology', 'Plant physiology', 'Genetics', 'Organic chemistry', 'Mechanics'],
    studyTips: ['Prioritise Biology — it is half the paper', 'Revise NCERT lines almost verbatim', 'Time full mock papers weekly'],
  },
  'Logical Reasoning': {
    emoji: 'LR',
    tone: 'secondary',
    tagline: 'Find the gap in the argument.',
    description: 'Assumptions, flaws, strengthen and weaken, inference and parallel reasoning — the reasoning skills that make up most of an LSAT score.',
    keyTopics: ['Assumptions', 'Strengthen & weaken', 'Flaws', 'Inference', 'Parallel reasoning'],
    studyTips: ['Name the conclusion before the answers', 'Predict before reading options', 'Review every wrong answer for why'],
  },
  'Reading Comprehension': {
    emoji: 'RC',
    tone: 'accent',
    tagline: 'Structure first, detail second.',
    description: 'Main point, author attitude, comparative passages and structural questions, practised for speed and accuracy together.',
    keyTopics: ['Main point', 'Author attitude', 'Comparative passages', 'Detail & structure'],
    studyTips: ['Map each paragraph in a few words', 'Track the author opinion markers', 'Answer from the text, not memory'],
  },
  'Computer Science': {
    emoji: 'CS',
    tone: 'primary',
    tagline: 'Think in algorithms, write in code.',
    description: 'Programming constructs, data structures, algorithms and databases — practised the way papers actually test them, with tracing questions and complexity reasoning.',
    keyTopics: ['Programming basics', 'Data structures', 'Algorithms', 'Databases', 'Networks'],
    studyTips: ['Trace code by hand before running it', 'Learn one sorting algorithm properly', 'Write pseudocode first'],
  },
  'Business Studies': {
    emoji: 'BS',
    tone: 'success',
    tagline: 'How organisations actually run.',
    description: 'Objectives, marketing, finance, people and operations, with the case-study technique these papers reward.',
    keyTopics: ['Business objectives', 'Marketing', 'Finance & accounts', 'People in business', 'Operations'],
    studyTips: ['Always apply theory to the case', 'Quote figures from the stimulus', 'Finish with a judgement'],
  },
  'Business Management': {
    emoji: 'BM',
    tone: 'success',
    tagline: 'Strategy, people and numbers together.',
    description: 'The IB business toolkit — organisation, human resources, marketing, finance and operations, assessed through applied commentary.',
    keyTopics: ['Business organisation', 'Human resources', 'Marketing', 'Finance & accounts', 'Operations management'],
    studyTips: ['Use the business tools by name', 'Evaluate, do not just describe', 'Practise with real company data'],
  },
  Accountancy: {
    emoji: 'AC',
    tone: 'secondary',
    tagline: 'Every number tells a story.',
    description: 'Partnership and company accounts, financial statements, cash flow and ratio analysis, drilled until the formats are automatic.',
    keyTopics: ['Partnership accounts', 'Company accounts', 'Financial statements', 'Cash flow', 'Ratio analysis'],
    studyTips: ['Learn the formats cold', 'Check that the balance sheet balances', 'Show your workings for method marks'],
  },
  History: {
    emoji: 'HI',
    tone: 'accent',
    tagline: 'Evidence, cause and consequence.',
    description: 'Source analysis and essay technique across revolutions, world wars, the Cold War and independence movements.',
    keyTopics: ['Sources & evidence', 'Revolutions', 'World wars', 'Cold War', 'Independence movements'],
    studyTips: ['Date every source you use', 'Argue with specific evidence', 'Plan the essay before writing'],
  },
  Geography: {
    emoji: 'GE',
    tone: 'success',
    tagline: 'Place, process and pattern.',
    description: 'Physical and human geography with the map, graph and case-study skills examiners look for.',
    keyTopics: ['Physical geography', 'Population & settlement', 'Economic activity', 'Environmental risks', 'Map skills'],
    studyTips: ['Memorise two case studies per topic', 'Practise grid references', 'Describe the pattern, then explain it'],
  },
  Psychology: {
    emoji: 'PS',
    tone: 'secondary',
    tagline: 'Why people do what they do.',
    description: 'Research methods and the biological, cognitive and sociocultural approaches, with the study-evaluation technique papers reward.',
    keyTopics: ['Research methods', 'Biological approach', 'Cognitive approach', 'Sociocultural approach', 'Abnormal psychology'],
    studyTips: ['Learn studies by name, date and finding', 'Evaluate methodology, not just results', 'Use the approach vocabulary'],
  },
  'Environmental Systems': {
    emoji: 'ES',
    tone: 'success',
    tagline: 'Systems thinking for a changing planet.',
    description: 'Ecosystems, biodiversity, pollution management and climate change, framed through systems and models.',
    keyTopics: ['Systems & models', 'Ecosystems', 'Biodiversity', 'Pollution management', 'Climate change'],
    studyTips: ['Draw systems diagrams with flows', 'Quantify wherever you can', 'Link every issue to a management strategy'],
  },
  'English Literature': {
    emoji: 'EL',
    tone: 'accent',
    tagline: 'Close reading, clearly argued.',
    description: 'Prose, poetry, drama and unseen texts, practised through the analytical paragraph structure these papers expect.',
    keyTopics: ['Prose', 'Poetry', 'Drama', 'Unseen texts', 'Literary devices'],
    studyTips: ['Quote briefly and analyse deeply', 'Name the technique and its effect', 'Track one theme across the text'],
  },
  Statistics: {
    emoji: 'ST',
    tone: 'primary',
    tagline: 'Reading the story inside the data.',
    description: 'Exploring data, sampling, probability and inference, with the interpretation-in-context that earns full marks.',
    keyTopics: ['Exploring data', 'Sampling & experiments', 'Probability', 'Inference for means', 'Inference for proportions'],
    studyTips: ['State conditions before every test', 'Interpret in context, not just numerically', 'Sketch the distribution first'],
  },
  'Calculus AB': {
    emoji: 'AB',
    tone: 'primary',
    tagline: 'Rates of change, rigorously.',
    description: 'Limits, derivatives, integrals and differential equations at AP Calculus AB scope, with justification-writing practice.',
    keyTopics: ['Limits & continuity', 'Differentiation', 'Applications of derivatives', 'Integration', 'Differential equations'],
    studyTips: ['Justify answers with theorems by name', 'Practise without the calculator too', 'Watch units in applied problems'],
  },
  'Calculus BC': {
    emoji: 'BC',
    tone: 'primary',
    tagline: 'AB, plus series and parametrics.',
    description: 'Everything in AB extended with parametric and polar functions, vector-valued functions and infinite series.',
    keyTopics: ['Parametric & polar', 'Series', 'Advanced integration', 'Vector functions', 'Applications of series'],
    studyTips: ['Know every convergence test', 'Practise integration by parts daily', 'Convert fluently between forms'],
  },
  Mathematics: {
    emoji: 'M',
    tone: 'primary',
    tagline: 'The language of patterns and proof.',
    description: 'Build fluency in algebra, geometry, calculus, and statistics through targeted practice. Mastery here unlocks confidence across every science subject.',
    keyTopics: ['Algebra & equations', 'Trigonometry', 'Geometry', 'Calculus basics', 'Probability & statistics'],
    studyTips: ['Practice 10 mixed problems daily', 'Re-solve mistakes from memory', 'Time yourself on past papers'],
  },
  'Mathematics AA': {
    emoji: 'M',
    tone: 'blue',
    tagline: 'Analysis & approaches in IB Maths.',
    description: 'Rigorous focus on proofs, functions, and calculus. AA students will spend more time on abstract reasoning and algebraic manipulation.',
    keyTopics: ['Functions', 'Sequences & series', 'Calculus', 'Probability'],
    studyTips: ['Memorise key derivatives and integrals', 'Annotate your worked examples', 'Practice IA-style problems'],
  },
  'Mathematics AI': {
    emoji: 'M',
    tone: 'blue',
    tagline: 'Applications & interpretation.',
    description: 'AI emphasises real-world modelling, technology use, and statistics. Great for students heading into the social sciences.',
    keyTopics: ['Statistics', 'Modelling', 'Geometry', 'Number'],
    studyTips: ['Practice with GDC efficiently', 'Interpret graphs carefully', 'Connect topics to real datasets'],
  },
  'Further Maths': {
    emoji: '\u221E',
    tone: 'violet',
    tagline: 'For students hungry for more.',
    description: 'A deeper dive into complex numbers, matrices, and differential equations. Built for future engineers and mathematicians.',
    keyTopics: ['Complex numbers', 'Matrices', 'Differential equations', 'Polar coordinates'],
    studyTips: ['Work proofs forwards and backwards', 'Group similar problem types', 'Push past the first attempt'],
  },
  Math: {
    emoji: 'M',
    tone: 'blue',
    tagline: 'SAT math: speed, accuracy, strategy.',
    description: 'Train on the four content areas of the SAT math section: Heart of Algebra, Problem Solving and Data Analysis, Passport to Advanced Math, and Additional Topics.',
    keyTopics: ['Heart of Algebra', 'Problem Solving', 'Advanced Math', 'Geometry'],
    studyTips: ['Skip and return on hard ones', 'Estimate answers first', 'Memorise the formula sheet'],
  },
  Physics: {
    emoji: 'P',
    tone: 'violet',
    tagline: 'How the universe works.',
    description: 'From projectile motion to electromagnetism. Physics rewards conceptual clarity plus mathematical precision.',
    keyTopics: ['Mechanics', 'Electrostatics', 'Optics', 'Thermodynamics', 'Modern physics', 'Waves'],
    studyTips: ['Draw force diagrams first', 'Always check units', 'Solve symbolically before plugging in'],
  },
  Chemistry: {
    emoji: 'C',
    tone: 'cyan',
    tagline: 'Reactions, bonds, and matter.',
    description: 'Organic, inorganic, and physical chemistry feed each other. Connecting principles is how top scorers think.',
    keyTopics: ['Organic chemistry', 'Inorganic', 'Physical', 'Coordination compounds', 'Equilibrium'],
    studyTips: ['Master reaction mechanisms by drawing them', 'Practice equation balancing daily', 'Use flashcards for nomenclature'],
  },
  Biology: {
    emoji: 'B',
    tone: 'success',
    tagline: 'The science of life.',
    description: 'Heavy on definitions, processes, and diagrams. Biology rewards consistent recall and clear explanations.',
    keyTopics: ['Cell biology', 'Genetics', 'Ecology', 'Human physiology', 'Plant physiology'],
    studyTips: ['Make labelled diagrams from memory', 'Connect structure to function', 'Use mnemonics for cycles'],
  },
  'Social Science': {
    emoji: 'S',
    tone: 'blue',
    tagline: 'People, places, and power.',
    description: 'History, geography, civics, and economics work together to understand societies. Strong on argument writing and source analysis.',
    keyTopics: ['History', 'Geography', 'Civics', 'Economics'],
    studyTips: ['Build timelines and maps', 'Practice short structured answers', 'Quote sources precisely'],
  },
  English: {
    emoji: 'E',
    tone: 'violet',
    tagline: 'Words that move ideas.',
    description: 'Grammar, comprehension, vocabulary, and writing. The goal is precise, persuasive expression with strong reading habits.',
    keyTopics: ['Reading comprehension', 'Grammar', 'Vocabulary', 'Writing'],
    studyTips: ['Read short non-fiction daily', 'Outline before writing', 'Vary sentence length'],
  },
  'Computer Applications': {
    emoji: 'CS',
    tone: 'cyan',
    tagline: 'Code, logic, and computational thinking.',
    description: 'Java fundamentals, OOP, arrays, and strings. Practice by writing small programs and tracing execution by hand.',
    keyTopics: ['Java basics', 'OOP', 'Arrays', 'Strings', 'Recursion'],
    studyTips: ['Dry-run code on paper', 'Refactor your own solutions', 'Build mini projects'],
  },
  Economics: {
    emoji: '\u20AC',
    tone: 'success',
    tagline: 'Choices under scarcity.',
    description: 'Microeconomics, macroeconomics, and international trade. Build intuition with graphs and apply it to current events.',
    keyTopics: ['Microeconomics', 'Macroeconomics', 'International trade', 'Development'],
    studyTips: ['Draw and re-draw key diagrams', 'Practice short-answer evaluation', 'Read business news weekly'],
  },
  Reading: {
    emoji: 'R',
    tone: 'violet',
    tagline: 'Read smarter, not slower.',
    description: 'Master inference, main idea, and vocabulary in context. Pacing is half the SAT reading battle.',
    keyTopics: ['Passages', 'Vocabulary in context', 'Author tone'],
    studyTips: ['Skim first, then question-by-question', 'Eliminate obviously wrong choices', 'Track time per passage'],
  },
  Writing: {
    emoji: 'W',
    tone: 'blue',
    tagline: 'Clear, precise, and persuasive prose.',
    description: 'Grammar rules, rhetoric, and structure. Most points are won by spotting predictable patterns.',
    keyTopics: ['Grammar', 'Rhetoric', 'Punctuation', 'Style'],
    studyTips: ['Memorise comma rules', 'Read sentences aloud', 'Watch for redundant phrases'],
  },
};
