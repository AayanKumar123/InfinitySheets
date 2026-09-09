/**
 * Past-paper seed data.
 *
 * Two things live here:
 *
 * 1. PAST_PAPER_SOURCES — where the real papers are. Every URL below was
 *    checked and resolves; official board pages are listed first, free
 *    archives after. We link out rather than re-host, because exam papers
 *    are the copyright of the awarding bodies.
 *
 * 2. SEED_PAST_PAPERS — exam-style practice questions written in the format
 *    each board actually uses, tagged with board/subject/topic so the
 *    worksheet builder's "past papers" toggle has content out of the box,
 *    with no database rows required. These are original questions modelled
 *    on the papers, not reproductions of them.
 */

export const PAST_PAPER_SOURCES = {
  CBSE: [
    { title: 'CBSE — Previous Years’ Question Papers', official: true, url: 'https://www.cbse.gov.in/cbsenew/question-paper.html' },
  ],
  ICSE: [
    { title: 'CISCE — Publications & specimen papers', official: true, url: 'https://www.cisce.org/publications.aspx' },
  ],
  IGCSE: [
    { title: 'Cambridge International — IGCSE subject pages', official: true, url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/' },
    { title: 'PapaCambridge — IGCSE archive', official: false, url: 'https://pastpapers.papacambridge.com/papers/caie/igcse' },
    { title: 'Save My Exams — IGCSE topic questions', official: false, url: 'https://www.savemyexams.com/igcse/' },
  ],
  ASA: [
    { title: 'Cambridge International — AS & A Level subjects', official: true, url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/' },
    { title: 'Physics & Maths Tutor — past papers by board', official: false, url: 'https://www.physicsandmathstutor.com/' },
  ],
  IB: [
    { title: 'IB — Diploma Programme assessment & exams', official: true, url: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/' },
  ],
  AP: [
    { title: 'AP Central — past exam questions', official: true, url: 'https://apcentral.collegeboard.org/courses/ap-calculus-ab/exam/past-exam-questions' },
  ],
  SAT: [
    { title: 'College Board — full-length paper practice tests', official: true, url: 'https://satsuite.collegeboard.org/practice/practice-tests/paper' },
    { title: 'College Board — practice & preparation hub', official: true, url: 'https://satsuite.collegeboard.org/practice' },
  ],
  LSAT: [
    { title: 'LSAC — official LSAT practice tests', official: true, url: 'https://www.lsac.org/lsat/prepare/official-lsat-practice-tests' },
    { title: 'LSAC — free official prep (LawHub & Khan Academy)', official: true, url: 'https://www.lsac.org/lsat/prep' },
  ],
  JEE: [
    { title: 'NTA — JEE (Main) official site', official: true, url: 'https://jeemain.nta.nic.in/' },
  ],
  NEET: [
    { title: 'NTA — NEET (UG) official site', official: true, url: 'https://neet.nta.nic.in/' },
  ],
  SSLC: [
    { title: 'KSEAB — Karnataka SSLC question papers', official: true, url: 'https://kseab.karnataka.gov.in/new-page/SSLC%20QUESTION%20PAPERS/en' },
    { title: 'KSEEB — 2025-26 model question papers', official: true, url: 'https://kseeb.karnataka.gov.in/QP2026/SSLC2025-26MODEL_QP' },
    { title: 'Pareeksha Bhavan — Kerala SSLC', official: true, url: 'https://pareekshabhavan.kerala.gov.in/' },
    { title: 'TNDGE — Tamil Nadu SSLC question bank', official: true, url: 'https://apply1.tndge.org/dge-notification/questbank' },
  ],
};

const pp = (board, subject, topic, q, options, a, difficulty = 'Medium') => ({
  id: `seed_${board}_${subject}_${topic}_${q.slice(0, 18)}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64),
  board,
  subject,
  topic,
  q,
  options,
  a,
  difficulty,
  answerType: 'Multiple choice',
  source: 'past-paper',
  addedBy: 'seed',
  seeded: true,
});

const SEED_QUESTIONS_V1 = [
  // ---- CBSE ----
  pp('CBSE', 'Physics', 'Electrostatics', 'Two point charges are moved to twice their separation. The force between them becomes:', ['Half', 'One quarter', 'Double', 'Four times'], 1),
  pp('CBSE', 'Physics', 'Modern Physics', 'The photoelectric effect demonstrates the:', ['Wave nature of light', 'Particle nature of light', 'Diffraction of light', 'Polarisation of light'], 1),
  pp('CBSE', 'Chemistry', 'Equilibrium', 'For an exothermic reaction at equilibrium, raising the temperature shifts the position:', ['Forward', 'Backward', 'No change', 'To completion'], 1),
  pp('CBSE', 'Mathematics', 'Calculus', 'The integral of 1/x with respect to x is:', ['ln|x| + C', 'x⁻² + C', '1/(2x²) + C', 'eˣ + C'], 0),
  pp('CBSE', 'Biology', 'Genetics', 'A cross between two heterozygous tall plants gives a phenotypic ratio of:', ['1:1', '3:1', '9:3:3:1', '2:1'], 1),

  // ---- ICSE ----
  pp('ICSE', 'Physics', 'Optics', 'A ray passing through the optical centre of a thin lens:', ['Bends towards the axis', 'Bends away from the axis', 'Goes through undeviated', 'Is totally reflected'], 2),
  pp('ICSE', 'Chemistry', 'Inorganic', 'The gas released when dilute hydrochloric acid reacts with zinc is:', ['Oxygen', 'Hydrogen', 'Chlorine', 'Carbon dioxide'], 1),
  pp('ICSE', 'Mathematics', 'Trigonometry', 'The value of sin²θ + cos²θ is:', ['0', '1', '2', 'tan²θ'], 1),

  // ---- IGCSE ----
  pp('IGCSE', 'Physics', 'Mechanics', 'A car travels 150 m in 10 s at constant speed. Its speed is:', ['10 m/s', '15 m/s', '20 m/s', '25 m/s'], 1),
  pp('IGCSE', 'Chemistry', 'Physical', 'Which change of state is endothermic?', ['Condensation', 'Freezing', 'Melting', 'Deposition'], 2),
  pp('IGCSE', 'Biology', 'Cell Biology', 'Which structure is present in a plant cell but not an animal cell?', ['Nucleus', 'Cell wall', 'Mitochondrion', 'Cytoplasm'], 1),
  pp('IGCSE', 'Economics', 'Microeconomics', 'If demand rises while supply is unchanged, equilibrium price will:', ['Fall', 'Rise', 'Stay the same', 'Become zero'], 1),

  // ---- AS & A Level ----
  pp('ASA', 'Mathematics', 'Calculus', 'The derivative of e^(2x) is:', ['e^(2x)', '2e^(2x)', 'e^(2x)/2', '2x e^(2x−1)'], 1),
  pp('ASA', 'Physics', 'Thermodynamics', 'The first law of thermodynamics is a statement of the conservation of:', ['Momentum', 'Charge', 'Energy', 'Mass'], 2),

  // ---- IB ----
  pp('IB', 'Physics', 'Mechanics', 'A body in equilibrium has a resultant force of:', ['Its weight', 'Zero', 'Mass times velocity', 'Its momentum'], 1),
  pp('IB', 'Chemistry', 'Organic', 'The functional group –COOH is characteristic of:', ['Alcohols', 'Aldehydes', 'Carboxylic acids', 'Ketones'], 2),
  pp('IB', 'Economics', 'Macroeconomics', 'Real GDP differs from nominal GDP because it is adjusted for:', ['Population', 'Inflation', 'Trade balance', 'Unemployment'], 1),

  // ---- AP ----
  pp('AP', 'Calculus AB', 'Applications of Derivatives', 'At a local maximum of a differentiable function, the first derivative is:', ['Positive', 'Negative', 'Zero', 'Undefined'], 2),
  pp('AP', 'Statistics', 'Sampling & Experiments', 'Random assignment in an experiment is used primarily to:', ['Increase sample size', 'Balance confounding variables', 'Reduce measurement error', 'Guarantee normality'], 1),

  // ---- SAT (one combined subject) ----
  pp('SAT', 'SAT', 'Heart of Algebra', 'If 4x + 8 = 32, what is the value of x?', ['4', '6', '8', '10'], 1),
  pp('SAT', 'SAT', 'Passages', 'A question asking what a passage mainly argues is testing:', ['Detail retrieval', 'Central idea', 'Vocabulary in context', 'Author tone'], 1),
  pp('SAT', 'SAT', 'Grammar', 'Choose the correct form: “Neither of the answers ___ correct.”', ['are', 'is', 'were', 'be'], 1),

  // ---- JEE ----
  pp('JEE', 'Physics', 'Mechanics', 'A particle moves with constant speed in a circle. Its acceleration is:', ['Zero', 'Directed along the velocity', 'Directed towards the centre', 'Directed outwards'], 2, 'Exam level'),
  pp('JEE', 'Chemistry', 'Physical', 'The pH of a 0.01 M strong acid solution is:', ['1', '2', '10', '12'], 1, 'Exam level'),
  pp('JEE', 'Mathematics', 'Algebra', 'The number of real roots of x² + 4 = 0 is:', ['0', '1', '2', 'Infinite'], 0, 'Exam level'),

  // ---- NEET (one combined subject) ----
  pp('NEET', 'NEET', 'Human Physiology', 'Exchange of gases in the lungs happens across the:', ['Bronchi', 'Trachea', 'Alveoli', 'Pleura'], 2),
  pp('NEET', 'NEET', 'Plant Physiology', 'The pigment that primarily absorbs light for photosynthesis is:', ['Carotene', 'Chlorophyll a', 'Xanthophyll', 'Phycocyanin'], 1),
  pp('NEET', 'NEET', 'Organic', 'Which compound shows optical isomerism?', ['CH₄', 'CHClBrF', 'CO₂', 'C₂H₆'], 1),

  // ---- LSAT ----
  pp('LSAT', 'Logical Reasoning', 'Assumptions', 'An argument’s necessary assumption is a claim that:', ['Restates the conclusion', 'Must be true for the conclusion to hold', 'Weakens the evidence', 'Introduces new evidence'], 1),
  pp('LSAT', 'Reading Comprehension', 'Main Point', 'The main point of a passage is best found by identifying:', ['The longest paragraph', 'The author’s overall claim', 'The first sentence', 'Any statistic quoted'], 1),
];


// Second batch — one or more questions for every subject the wizard can
// enrol a learner in, so "Past paper questions" is never empty for a track.
const SEED_QUESTIONS_V2 = [
  // ---- SSLC ----
  pp('SSLC', 'Mathematics', 'Algebra', 'The sum of the first 20 terms of the arithmetic progression 3, 7, 11, … is:', ['800', '820', '840', '860'], 1),
  pp('SSLC', 'Physics', 'Optics', 'A concave mirror forms a real, inverted image the same size as the object when the object is placed at:', ['The focus', 'The centre of curvature', 'Infinity', 'Between pole and focus'], 1),
  pp('SSLC', 'Chemistry', 'Inorganic', 'Which gas is evolved when dilute hydrochloric acid reacts with zinc granules?', ['Oxygen', 'Chlorine', 'Hydrogen', 'Carbon dioxide'], 2, 'Easy'),
  pp('SSLC', 'Biology', 'Human Physiology', 'The part of the nephron where most reabsorption of glucose takes place is the:', ['Glomerulus', 'Proximal convoluted tubule', 'Loop of Henle', 'Collecting duct'], 1),
  pp('SSLC', 'Social Science', 'Civics', 'The Fundamental Rights of Indian citizens are listed in which Part of the Constitution?', ['Part II', 'Part III', 'Part IV', 'Part V'], 1, 'Easy'),
  pp('SSLC', 'English', 'Grammar', 'Choose the correctly punctuated sentence:', ['She said, "I will come tomorrow."', 'She said "I will come tomorrow".', 'She said, I will come tomorrow.', 'She said: "I will come tomorrow"'], 0, 'Easy'),
  // ---- CBSE ----
  pp('CBSE', 'Mathematics', 'Probability', 'Two dice are rolled. The probability that the sum is 9 is:', ['1/6', '1/9', '1/12', '5/36'], 1),
  pp('CBSE', 'Chemistry', 'Organic', 'Which of the following undergoes SN1 substitution fastest?', ['CH₃Cl', 'CH₃CH₂Cl', '(CH₃)₂CHCl', '(CH₃)₃CCl'], 3),
  pp('CBSE', 'Economics', 'Macroeconomics', 'If the marginal propensity to consume is 0.8, the value of the investment multiplier is:', ['0.8', '1.25', '4', '5'], 3),
  pp('CBSE', 'English', 'Reading Comprehension', 'A passage that mainly presents the author’s reasoned judgement on an issue is best described as:', ['Narrative', 'Descriptive', 'Argumentative', 'Expository'], 2, 'Easy'),
  pp('CBSE', 'Computer Science', 'Data Structures', 'Which data structure follows the Last In, First Out principle?', ['Queue', 'Stack', 'Linked list', 'Tree'], 1, 'Easy'),
  pp('CBSE', 'Accountancy', 'Partnership Accounts', 'In the absence of a partnership deed, profits are shared:', ['In the capital ratio', 'Equally', 'In the ratio of drawings', 'As decided by the senior partner'], 1),
  pp('CBSE', 'Business Studies', 'Marketing', 'The set of marketing tools a firm uses to pursue its objectives in the target market is called the:', ['Marketing mix', 'Product line', 'Market segment', 'Sales funnel'], 0, 'Easy'),
  pp('CBSE', 'Social Science', 'History', 'The Non-Cooperation Movement was called off by Gandhi after the incident at:', ['Jallianwala Bagh', 'Chauri Chaura', 'Dandi', 'Champaran'], 1),
  // ---- ICSE ----
  pp('ICSE', 'Biology', 'Genetics', 'The number of chromosomes in a normal human gamete is:', ['23', '46', '22', '44'], 0, 'Easy'),
  pp('ICSE', 'Computer Applications', 'Java Basics', 'Which of these is a valid Java identifier?', ['2ndValue', 'my-value', '_value2', 'class'], 2),
  pp('ICSE', 'History', 'Independence Movements', 'The Indian National Congress was founded in 1885 by:', ['Dadabhai Naoroji', 'A. O. Hume', 'W. C. Bonnerjee', 'Surendranath Banerjee'], 1),
  pp('ICSE', 'Geography', 'Map Skills', 'On a 1:50,000 toposheet, 2 cm on the map represents a ground distance of:', ['500 m', '1 km', '2 km', '5 km'], 1),
  pp('ICSE', 'Economics', 'Microeconomics', 'When the price of a good rises by 10% and quantity demanded falls by 20%, demand is:', ['Perfectly inelastic', 'Inelastic', 'Unit elastic', 'Elastic'], 3),
  pp('ICSE', 'English', 'Vocabulary', 'Choose the word closest in meaning to “benevolent”:', ['Hostile', 'Kind', 'Timid', 'Wealthy'], 1, 'Easy'),
  // ---- IGCSE ----
  pp('IGCSE', 'Mathematics', 'Geometry', 'The interior angle of a regular polygon is 156°. How many sides does it have?', ['12', '15', '18', '20'], 1),
  pp('IGCSE', 'English', 'Writing', 'In a piece of persuasive writing, which device most directly appeals to the reader’s emotions?', ['Statistics', 'Rhetorical question', 'Technical jargon', 'Chronological order'], 1, 'Easy'),
  pp('IGCSE', 'Business Studies', 'Finance & Accounts', 'A business with current assets of $60,000 and current liabilities of $40,000 has a current ratio of:', ['0.67', '1.5', '2.0', '20,000'], 1),
  pp('IGCSE', 'Computer Science', 'Networks', 'Which protocol is used to securely transfer web pages between a browser and a server?', ['FTP', 'HTTP', 'HTTPS', 'SMTP'], 2, 'Easy'),
  pp('IGCSE', 'English Literature', 'Poetry', 'A pair of consecutive rhyming lines of the same metre is called a:', ['Quatrain', 'Couplet', 'Stanza', 'Sonnet'], 1, 'Easy'),
  pp('IGCSE', 'History', 'Cold War', 'The Berlin Blockade of 1948–49 was ended by:', ['The Marshall Plan', 'The Berlin Airlift', 'The Warsaw Pact', 'The Truman Doctrine'], 1),
  pp('IGCSE', 'Geography', 'Population & Settlement', 'A country with a high birth rate and a rapidly falling death rate is most likely in which stage of the demographic transition model?', ['Stage 1', 'Stage 2', 'Stage 4', 'Stage 5'], 1),
  // ---- AS & A Level ----
  pp('ASA', 'Chemistry', 'Physical', 'For a first-order reaction, the half-life is:', ['Proportional to the initial concentration', 'Inversely proportional to the initial concentration', 'Independent of the initial concentration', 'Proportional to the square of the concentration'], 2),
  pp('ASA', 'Economics', 'Macroeconomics', 'A fall in the exchange rate of a country’s currency will, ceteris paribus, tend to:', ['Reduce exports and increase imports', 'Increase exports and reduce imports', 'Increase both exports and imports', 'Reduce both exports and imports'], 1),
  pp('ASA', 'Biology', 'Cell Biology', 'Which organelle is the site of the light-dependent reactions of photosynthesis?', ['Stroma', 'Thylakoid membrane', 'Mitochondrial matrix', 'Cytosol'], 1),
  pp('ASA', 'Further Maths', 'Complex Numbers', 'The modulus of the complex number 3 + 4i is:', ['1', '5', '7', '25'], 1, 'Easy'),
  pp('ASA', 'Psychology', 'Research Methods', 'A study in which participants do not know which condition they are in, but the researcher does, is:', ['Single-blind', 'Double-blind', 'Naturalistic', 'Correlational'], 0),
  // ---- IB ----
  pp('IB', 'Mathematics AA', 'Functions', 'If f(x) = 2x + 3 and g(x) = x², then (f ∘ g)(2) equals:', ['7', '11', '49', '14'], 1),
  pp('IB', 'Mathematics AI', 'Statistics', 'A data set has a mean of 50 and a standard deviation of 5. A value of 62 has a z-score of:', ['1.2', '2.4', '12', '0.24'], 1),
  pp('IB', 'Biology', 'Ecology', 'In a food chain, roughly what percentage of energy is passed from one trophic level to the next?', ['1%', '10%', '50%', '90%'], 1, 'Easy'),
  pp('IB', 'Business Management', 'Human Resources', 'Herzberg classified salary as a:', ['Motivator', 'Hygiene factor', 'Self-actualisation need', 'Physiological need'], 1),
  pp('IB', 'Psychology', 'Cognitive Approach', 'The multi-store model of memory was proposed by:', ['Baddeley and Hitch', 'Atkinson and Shiffrin', 'Loftus and Palmer', 'Bartlett'], 1),
  pp('IB', 'English', 'Writing', 'A comparative essay on two texts is strongest when its thesis:', ['Summarises each text in turn', 'Identifies a shared question and states how the texts answer it differently', 'Lists every literary device found', 'Avoids taking a position'], 1),
  // ---- AP ----
  pp('AP', 'Calculus BC', 'Series', 'The series Σ (1/n^p) from n = 1 to ∞ converges when:', ['p > 0', 'p ≥ 1', 'p > 1', 'p < 1'], 2),
  pp('AP', 'Physics', 'Mechanics', 'A 2 kg block on a frictionless surface is pushed by a 6 N force. Its acceleration is:', ['12 m/s²', '3 m/s²', '4 m/s²', '0.33 m/s²'], 1, 'Easy'),
  pp('AP', 'Chemistry', 'Equilibrium', 'For the reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g), increasing the pressure shifts the equilibrium:', ['Toward the reactants', 'Toward the products', 'Not at all', 'Depends on the catalyst'], 1),
  pp('AP', 'Biology', 'Cell Biology', 'Which process directly produces the most ATP per glucose molecule?', ['Glycolysis', 'Krebs cycle', 'Oxidative phosphorylation', 'Fermentation'], 2),
  pp('AP', 'Economics', 'Microeconomics', 'A price ceiling set below the equilibrium price causes:', ['A surplus', 'A shortage', 'No change in quantity', 'An increase in supply'], 1, 'Easy'),
  // ---- SAT (one combined subject) ----
  pp('SAT', 'SAT', 'Advanced Math', 'If x² − 5x + 6 = 0, the sum of the solutions is:', ['−5', '5', '6', '−6'], 1),
  pp('SAT', 'SAT', 'Problem Solving', 'A shirt is discounted 20% and then a further 10% off the sale price. The total discount is:', ['30%', '28%', '25%', '32%'], 1),
  pp('SAT', 'SAT', 'Vocabulary in Context', 'As used in “the committee reached a tentative agreement,” “tentative” most nearly means:', ['Final', 'Provisional', 'Reluctant', 'Enthusiastic'], 1, 'Easy'),
  pp('SAT', 'SAT', 'Rhetoric', 'Which choice most effectively combines the sentences: “The bridge was built in 1932. It still carries traffic today.”', ['Built in 1932, the bridge still carries traffic today.', 'The bridge was built in 1932, it still carries traffic today.', 'The bridge, built in 1932 and it still carries traffic today.', 'Being built in 1932, and the bridge still carries traffic.'], 0),
  // ---- JEE ----
  pp('JEE', 'Physics', 'Electrostatics', 'The electric field inside a uniformly charged hollow conducting sphere is:', ['Maximum at the centre', 'Zero', 'Proportional to distance from centre', 'Inversely proportional to distance'], 1),
  pp('JEE', 'Chemistry', 'Coordination Compounds', 'The oxidation state of cobalt in [Co(NH₃)₆]Cl₃ is:', ['+1', '+2', '+3', '+6'], 2),
  pp('JEE', 'Mathematics', 'Calculus', 'The value of lim (x→0) (sin 3x)/x is:', ['0', '1', '3', '1/3'], 2, 'Easy'),
  pp('JEE', 'Physics', 'Waves', 'Two tuning forks of frequencies 256 Hz and 260 Hz are sounded together. The beat frequency is:', ['2 Hz', '4 Hz', '258 Hz', '516 Hz'], 1, 'Easy'),
  // ---- NEET (one combined subject) ----
  pp('NEET', 'NEET', 'Modern Physics', 'The de Broglie wavelength of a moving particle is inversely proportional to its:', ['Mass only', 'Velocity only', 'Momentum', 'Kinetic energy'], 2),
  pp('NEET', 'NEET', 'Mechanics', 'A body is thrown vertically upward with velocity 20 m/s (g = 10 m/s²). Its maximum height is:', ['10 m', '20 m', '40 m', '80 m'], 1, 'Easy'),
  pp('NEET', 'NEET', 'Inorganic', 'Which of the following has the highest first ionisation enthalpy?', ['Na', 'Mg', 'Al', 'Si'], 3),
  pp('NEET', 'NEET', 'Genetics', 'In humans, haemophilia is inherited as a:', ['Autosomal dominant trait', 'Autosomal recessive trait', 'X-linked recessive trait', 'Y-linked trait'], 2),
  pp('NEET', 'NEET', 'Cell Biology', 'The enzyme that unwinds the DNA double helix during replication is:', ['DNA ligase', 'Helicase', 'Primase', 'Topoisomerase'], 1),
  // ---- LSAT ----
  pp('LSAT', 'Logical Reasoning', 'Assumptions', 'Everyone who studied for the exam passed. Rahul passed. Therefore Rahul studied. The reasoning is flawed because it:', ['Confuses a sufficient condition with a necessary one', 'Relies on an unrepresentative sample', 'Attacks the person rather than the argument', 'Assumes correlation implies causation'], 0),
  pp('LSAT', 'Logical Reasoning', 'Assumptions', 'The town council argues that a new library will raise literacy because towns with libraries have higher literacy rates. The argument is most vulnerable to the criticism that it:', ['Fails to define literacy', 'Overlooks that higher literacy may cause towns to build libraries', 'Ignores the cost of the library', 'Relies on an appeal to authority'], 1),
  pp('LSAT', 'Reading Comprehension', 'Main Point', 'A passage argues that early city planners underestimated pedestrian needs, then notes that modern planners are reversing course. The primary purpose of the passage is to:', ['Criticise modern planners', 'Trace a change in planning priorities', 'Advocate abolishing cars', 'Describe a single city’s history'], 1),
];

// Full past papers — the real thing, hosted by the awarding body. These rows
// carry a link rather than a question, so they appear in the admin library
// and on each subject page but never get pulled into a generated worksheet
// (the builder only matches the three question answer types).
export const FULL_PAPER_TYPE = 'Full paper';

const paper = (board, subject, title, year, link) => ({
  id: `paper_${board}_${subject}_${year}_${title.slice(0, 16)}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64),
  board,
  subject,
  topic: '',
  q: title,
  year,
  link,
  answerType: FULL_PAPER_TYPE,
  difficulty: 'Exam level',
  source: 'past-paper',
  addedBy: 'seed',
  seeded: true,
});

export const SEED_PAPER_LINKS = [
  paper('CBSE', 'Mathematics', 'CBSE Class XII Mathematics — previous year question papers', 2025, 'https://www.cbse.gov.in/cbsenew/question-paper.html'),
  paper('CBSE', 'Physics', 'CBSE Class XII Physics — previous year question papers', 2025, 'https://www.cbse.gov.in/cbsenew/question-paper.html'),
  paper('CBSE', 'Chemistry', 'CBSE Class XII Chemistry — sample question paper with marking scheme', 2025, 'https://cbseacademic.nic.in/sqp_archive.html'),
  paper('CBSE', 'Biology', 'CBSE Class XII Biology — sample question paper with marking scheme', 2025, 'https://cbseacademic.nic.in/sqp_archive.html'),
  paper('CBSE', 'English', 'CBSE Class XII English Core — sample question paper', 2025, 'https://www.cbse.gov.in/cbsenew/samplepaper.html'),
  paper('ICSE', 'Mathematics', 'ICSE Class X Mathematics — specimen question paper', 2025, 'https://cisceboard.org/icse_X_Specimen_Question_Papers.html'),
  paper('ICSE', 'Physics', 'ICSE Class X Physics — specimen question paper', 2025, 'https://cisceboard.org/icse_X_Specimen_Question_Papers.html'),
  paper('ICSE', 'Chemistry', 'ISC Class XII Chemistry — specimen question paper', 2025, 'https://cisceboard.org/isc_XII_Specimen_Question_Papers.html'),
  paper('ICSE', 'Biology', 'ISC Class XII Biology — specimen question paper', 2025, 'https://cisceboard.org/isc_XII_Specimen_Question_Papers.html'),
  paper('IGCSE', 'Mathematics', 'Cambridge IGCSE Mathematics 0580 — past papers & mark schemes', 2024, 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/'),
  paper('IGCSE', 'Physics', 'Cambridge IGCSE Physics 0625 — past papers archive', 2024, 'https://pastpapers.papacambridge.com/papers/caie/igcse'),
  paper('IGCSE', 'Chemistry', 'Cambridge IGCSE Chemistry 0620 — past papers archive', 2024, 'https://pastpapers.papacambridge.com/papers/caie/igcse'),
  paper('IGCSE', 'Biology', 'Cambridge IGCSE Biology 0610 — past papers archive', 2024, 'https://pastpapers.papacambridge.com/papers/caie/igcse'),
  paper('ASA', 'Mathematics', 'Cambridge International AS & A Level Mathematics 9709 — past papers', 2024, 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/'),
  paper('ASA', 'Chemistry', 'Cambridge International AS & A Level Chemistry 9701 — past papers', 2024, 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/past-papers/'),
  paper('ASA', 'Physics', 'Cambridge International AS & A Level — full past paper archive', 2024, 'https://pastpapers.papacambridge.com/papers/caie/as-and-a-level'),
  paper('ASA', 'Economics', 'Cambridge International AS & A Level — full past paper archive', 2024, 'https://pastpapers.papacambridge.com/papers/caie/as-and-a-level'),
  paper('IB', 'Mathematics AA', 'IB Diploma Programme — official sample exam papers', 2024, 'https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/'),
  paper('IB', 'Physics', 'IB Diploma Programme — official sample exam papers', 2024, 'https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/'),
  paper('IB', 'Chemistry', 'IB Diploma Programme — official sample exam papers', 2024, 'https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/'),
  paper('IB', 'Biology', 'IB Diploma Programme — official sample exam papers', 2024, 'https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/'),
  paper('AP', 'Calculus AB', 'AP Calculus AB — past free-response questions', 2025, 'https://apcentral.collegeboard.org/courses/ap-calculus-ab/exam/past-exam-questions'),
  paper('SAT', 'SAT', 'Digital SAT — official full-length paper practice tests', 2025, 'https://satsuite.collegeboard.org/practice/practice-tests/paper'),
  paper('SAT', 'SAT', 'Bluebook — official digital adaptive practice tests', 2025, 'https://bluebook.collegeboard.org/students/practice'),
  paper('JEE', 'Physics', 'JEE Main — official question paper archive (NTA)', 2025, 'https://jeemain.nta.nic.in/document-category/archive/'),
  paper('JEE', 'Chemistry', 'JEE Main — official question paper archive (NTA)', 2025, 'https://jeemain.nta.nic.in/document-category/archive/'),
  paper('JEE', 'Mathematics', 'JEE Advanced — past papers (Archive section)', 2025, 'https://jeeadv.ac.in/'),
  paper('NEET', 'NEET', 'NEET (UG) — official question paper archive (NTA)', 2025, 'https://neet.nta.nic.in/document-category/archive/'),
  paper('NEET', 'NEET', 'NEET — code-wise official papers 2015 onwards', 2025, 'https://medicine.careers360.com/articles/neet-question-paper'),
  paper('LSAT', 'Logical Reasoning', 'LawHub — free official LSAT PrepTests', 2025, 'https://app.lawhub.org/library/fulltests'),
  paper('LSAT', 'Reading Comprehension', 'LSAC — official LSAT practice tests', 2025, 'https://www.lsac.org/lsat/prepare/official-lsat-practice-tests'),
  paper('SSLC', 'Mathematics', 'Karnataka SSLC — official question papers (KSEAB)', 2025, 'https://kseab.karnataka.gov.in/new-page/SSLC%20QUESTION%20PAPERS/en'),
  paper('SSLC', 'Physics', 'Karnataka SSLC — 2025-26 model question papers with keys', 2025, 'https://kseeb.karnataka.gov.in/QP2026/SSLC2025-26MODEL_QP'),
  paper('SSLC', 'Social Science', 'Tamil Nadu SSLC — official question bank (TNDGE)', 2025, 'https://apply1.tndge.org/dge-notification/questbank'),
  paper('SSLC', 'English', 'Kerala SSLC — Pareeksha Bhavan official portal', 2025, 'https://pareekshabhavan.kerala.gov.in/'),
];

export const SEED_QUESTIONS = [...SEED_QUESTIONS_V1, ...SEED_QUESTIONS_V2];
export const SEED_PAST_PAPERS = [...SEED_QUESTIONS, ...SEED_PAPER_LINKS];

export default SEED_PAST_PAPERS;
