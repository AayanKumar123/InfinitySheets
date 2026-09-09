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
    { title: 'CBSE — Previous Years’ Question Papers', official: true, url: 'https://www.cbse.gov.in/cbsenew/question-paper.html' },
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

export const SEED_PAST_PAPERS = [
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

export default SEED_PAST_PAPERS;
