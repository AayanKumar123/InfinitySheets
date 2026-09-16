// Course material source directory: past papers, syllabi, and practice
// resources for every supported curriculum. Official sources are listed first.
// We link out rather than re-host copyrighted material.

export const RESOURCE_TRACKS = [
  {
    id: 'IGCSE',
    name: 'Cambridge IGCSE',
    short: 'IGCSE',
    groups: [
      {
        label: 'Official',
        links: [
          { title: 'Cambridge International — subject pages', desc: 'Syllabus, past papers, specimen papers, and examiner reports for every subject.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/' },
          { title: 'Cambridge help — where to find past papers', desc: 'Official guide to where Cambridge publishes papers and mark schemes.', url: 'https://help.cambridgeinternational.org/hc/en-gb/articles/115004448905-Where-can-I-find-past-papers-mark-schemes-and-resources-for-our-exams' },
        ],
      },
      {
        label: 'Past paper archives',
        links: [
          { title: 'PapaCambridge — IGCSE', desc: 'Full free archive of past papers, 2002 to present.', url: 'https://pastpapers.papacambridge.com/papers/caie/igcse' },
          { title: 'PastPapers.Co — IGCSE', desc: 'Alternative free archive.', url: 'https://pastpapers.co/caie/igcse' },
          { title: 'PapersDaddy — IGCSE', desc: 'Archive covering 151 subjects.', url: 'https://www.papersdaddy.com/cambridge/igcse' },
        ],
      },
      {
        label: 'Worksheets & topic questions',
        links: [
          { title: 'Save My Exams — IGCSE', desc: 'Topic questions and revision notes.', url: 'https://www.savemyexams.com/igcse/' },
          { title: 'Physics & Maths Tutor — CIE IGCSE', desc: 'Topic-wise questions and revision material.', url: 'https://www.physicsandmathstutor.com/physics-revision/igcse-cie/' },
        ],
      },
    ],
  },
  {
    id: 'ASA',
    name: 'Cambridge AS & A Levels',
    short: 'AS & A Level',
    groups: [
      {
        label: 'Official past papers by subject',
        links: [
          { title: 'Mathematics 9709', desc: 'Official Cambridge past papers.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/' },
          { title: 'Chemistry 9701', desc: 'Official Cambridge past papers.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/past-papers/' },
          { title: 'English Literature 9695', desc: 'Official Cambridge past papers.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-english-literature-9695/past-papers/' },
          { title: 'History 9489', desc: 'Official Cambridge past papers.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-history-9489/past-papers/' },
          { title: 'Geography 9696', desc: 'Official Cambridge past papers.', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-geography-9696/past-papers/' },
        ],
      },
      {
        label: 'Past paper archives',
        links: [
          { title: 'PapaCambridge — AS & A Level', desc: 'Full free archive of past papers.', url: 'https://pastpapers.papacambridge.com/papers/caie/as-and-a-level' },
          { title: 'BestExamHelp — A Level', desc: 'Alternative free archive.', url: 'https://bestexamhelp.com/exam/cambridge-international-a-level/pp-a.php' },
        ],
      },
      {
        label: 'Worksheets & syllabus guides',
        links: [
          { title: 'Physics & Maths Tutor', desc: 'Topic questions and revision notes for A Level.', url: 'https://www.physicsandmathstutor.com/' },
          { title: 'Save My Exams', desc: 'Topic questions and model answers.', url: 'https://www.savemyexams.com/' },
          { title: 'SchoolMyKids — CAIE syllabus index', desc: 'Index of syllabi and learner guides.', url: 'https://www.schoolmykids.com/education/cambridge-cie-past-papers-syllabuses-guides' },
        ],
      },
    ],
  },
  {
    id: 'IB',
    name: 'IB Diploma Programme',
    short: 'IB',
    note: 'IB enforces copyright strictly — always use official or licensed sources for papers.',
    groups: [
      {
        label: 'Official',
        links: [
          { title: 'ibo.org — DP sample exam papers', desc: 'Free official sample papers for the Diploma Programme.', url: 'https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/' },
          { title: 'Follett IB Store', desc: 'Official past papers (paid, legal source).', url: 'https://www.follettibstore.com/main/dp' },
        ],
      },
      {
        label: 'Practice questions',
        links: [
          { title: 'Revision Village', desc: 'Practice and prediction papers for IB subjects.', url: 'https://www.revisionvillage.com/ib-past-papers/' },
          { title: 'Save My Exams — IB DP', desc: 'Topic questions and revision material.', url: 'https://www.savemyexams.com/dp/past-papers/' },
        ],
      },
    ],
  },
  {
    id: 'ICSE',
    name: 'ICSE / ISC (CISCE)',
    short: 'ICSE',
    groups: [
      {
        label: 'Official',
        links: [
          { title: 'CISCE — ICSE Class X specimen papers', desc: 'Official specimen question papers.', url: 'https://cisceboard.org/icse_X_Specimen_Question_Papers.html' },
          { title: 'CISCE — ISC Class XII specimen papers', desc: 'Official specimen question papers.', url: 'https://cisceboard.org/isc_XII_Specimen_Question_Papers.html' },
          { title: 'cisce.org', desc: 'Official portal — syllabus, circulars, and papers.', url: 'https://cisce.org/' },
        ],
      },
      {
        label: 'Solved previous-year papers',
        links: [
          { title: 'SelfStudys — CISCE PYQs', desc: 'Solved previous-year question papers.', url: 'https://www.selfstudys.com/books/cisce-previous-year-question-paper' },
          { title: 'AglaSem — CISCE papers', desc: 'Question paper collection.', url: 'https://schools.aglasem.com/cisce-question-papers/' },
          { title: 'ICSEonline', desc: 'ICSE resources and papers.', url: 'https://www.icseonline.com/' },
          { title: 'Physics Wallah — ISC Class 12 PYQs', desc: 'Subject-wise previous-year papers.', url: 'https://www.pw.live/school-prep/exams/isc-class-12-previous-year-question-papers' },
        ],
      },
    ],
  },
  {
    id: 'CBSE',
    name: 'CBSE',
    short: 'CBSE',
    groups: [
      {
        label: 'Official',
        links: [
          { title: 'CBSE Academic — sample paper archive', desc: 'Official sample question papers with marking schemes.', url: 'https://cbseacademic.nic.in/sqp_archive.html' },
          { title: 'cbse.gov.in — question papers', desc: 'Official previous-year question papers.', url: 'https://www.cbse.gov.in/cbsenew/question-paper.html' },
          { title: 'cbse.gov.in — sample papers', desc: 'Official sample papers.', url: 'https://www.cbse.gov.in/cbsenew/samplepaper.html' },
          { title: 'CBSE Academic — curriculum & syllabus', desc: 'Official curriculum, syllabus, and portions.', url: 'https://cbseacademic.nic.in/' },
          { title: 'NCERT — textbooks', desc: 'Free official NCERT textbook PDFs.', url: 'https://ncert.nic.in/textbook.php' },
        ],
      },
      {
        label: 'Aggregated papers',
        links: [
          { title: 'Shiksha — CBSE question papers', desc: 'Compiled previous-year question papers.', url: 'https://www.shiksha.com/boards/cbse-board-question-papers' },
        ],
      },
    ],
  },
  {
    id: 'SSLC',
    name: 'SSLC (state boards)',
    short: 'SSLC',
    groups: [
      {
        label: 'Karnataka (KSEAB)',
        links: [
          { title: 'KSEAB — SSLC question papers', desc: 'Official question paper archive.', url: 'https://kseab.karnataka.gov.in/new-page/SSLC%20QUESTION%20PAPERS/en' },
          { title: 'KSEEB — model papers 2025-26', desc: 'Official model question papers with keys.', url: 'https://kseeb.karnataka.gov.in/QP2026/SSLC2025-26MODEL_QP' },
          { title: 'KSEEB — 2025 Exam-1 papers', desc: 'Official exam papers.', url: 'https://kseeb.karnataka.gov.in/QP/SSLC2025_EXAM1_QP' },
          { title: 'Physics Wallah — Karnataka SSLC', desc: 'Solved previous-year papers.', url: 'https://www.pw.live/state-prep/exams/karnataka-sslc-previous-year-question-paper' },
        ],
      },
      {
        label: 'Kerala (Pareeksha Bhavan)',
        links: [
          { title: 'pareekshabhavan.kerala.gov.in', desc: 'Official portal.', url: 'https://pareekshabhavan.kerala.gov.in/' },
          { title: 'Careers360 — Kerala SSLC papers', desc: 'Compiled previous-year papers.', url: 'https://school.careers360.com/boards/kerala-pareeksha-bhavan/kerala-sslc-question-papers' },
          { title: 'Physics Wallah — Kerala SSLC', desc: 'Solved previous-year papers.', url: 'https://www.pw.live/school-prep/exams/kerala-sslc-previous-year-question-papers' },
        ],
      },
      {
        label: 'Tamil Nadu (DGE)',
        links: [
          { title: 'dge.tn.gov.in — SSLC', desc: 'Official SSLC page.', url: 'https://www.dge.tn.gov.in/sslc.html' },
          { title: 'TNDGE — question bank', desc: 'Official question bank.', url: 'https://apply1.tndge.org/dge-notification/questbank' },
          { title: 'TNDGE — sample papers', desc: 'Official sample papers.', url: 'https://apply1.tndge.org/dge-notification/samques' },
          { title: 'Shiksha — TN 10th papers', desc: 'Compiled previous-year papers.', url: 'https://www.shiksha.com/boards/tamilnadu-10th-board-question-papers' },
        ],
      },
    ],
  },
  {
    id: 'SAT',
    name: 'SAT',
    short: 'SAT',
    groups: [
      {
        label: 'Official (College Board)',
        links: [
          { title: 'College Board — practice tests', desc: 'Full-length official practice tests.', url: 'https://satsuite.collegeboard.org/practice/practice-tests' },
          { title: 'Bluebook — digital practice', desc: 'Official digital adaptive practice tests.', url: 'https://bluebook.collegeboard.org/students/practice' },
          { title: 'Bluebook — test list', desc: 'All Bluebook practice tests.', url: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook' },
          { title: 'College Board — paper practice tests', desc: 'Downloadable official paper test PDFs.', url: 'https://satsuite.collegeboard.org/practice/practice-tests/paper' },
        ],
      },
      {
        label: 'Free prep & indexes',
        links: [
          { title: 'Khan Academy — Digital SAT prep', desc: 'Free prep from the official College Board partner.', url: 'https://www.khanacademy.org/digital-sat' },
          { title: 'LearnQ — released Digital SAT index', desc: 'Index of all released digital SAT tests.', url: 'https://blogs.learnq.ai/released-sat/' },
        ],
      },
    ],
  },
  {
    id: 'JEE',
    name: 'JEE (Main + Advanced)',
    short: 'JEE',
    groups: [
      {
        label: 'Official (NTA / IIT)',
        links: [
          { title: 'jeemain.nta.nic.in', desc: 'Official JEE Main portal.', url: 'https://jeemain.nta.nic.in/' },
          { title: 'JEE Main syllabus 2026', desc: 'Official syllabus PDF.', url: 'https://jeemain.nta.nic.in/document/syllabus-2026/' },
          { title: 'JEE Main paper archive', desc: 'Official question paper archive.', url: 'https://jeemain.nta.nic.in/document-category/archive/' },
          { title: 'jeeadv.ac.in', desc: 'Official JEE Advanced site — past papers in the Archive section.', url: 'https://jeeadv.ac.in/' },
        ],
      },
      {
        label: 'Solved previous-year papers',
        links: [
          { title: 'Vedantu — JEE Main PYQs', desc: 'Solved papers, 2014 to present.', url: 'https://www.vedantu.com/jee-main/previous-year-question-paper' },
          { title: 'Aakash — JEE Advanced PYQs', desc: 'Solved JEE Advanced papers.', url: 'https://www.aakash.ac.in/jee-advanced-previous-year-question-papers' },
          { title: 'eSaral — JEE Main 2026 papers', desc: 'Recent JEE Main papers.', url: 'https://www.esaral.com/jee/jee-main-2026-question-paper/' },
        ],
      },
    ],
  },
  {
    id: 'NEET',
    name: 'NEET',
    short: 'NEET',
    groups: [
      {
        label: 'Official (NTA)',
        links: [
          { title: 'neet.nta.nic.in — archive', desc: 'Official portal and question paper archive.', url: 'https://neet.nta.nic.in/document-category/archive/' },
        ],
      },
      {
        label: 'Solved previous-year papers',
        links: [
          { title: 'Careers360 — NEET papers', desc: 'Code-wise official papers, 2015 to present.', url: 'https://medicine.careers360.com/articles/neet-question-paper' },
          { title: 'Vedantu — NEET PYQs', desc: 'Solved previous-year papers.', url: 'https://www.vedantu.com/neet/neet-previous-year-question-paper' },
          { title: 'Aakash — NEET PYQs', desc: 'Solved previous-year papers.', url: 'https://www.aakash.ac.in/neet-previous-year-question-papers' },
          { title: 'SelfStudys — NEET 2005 onwards', desc: 'Two decades of solved papers.', url: 'https://www.selfstudys.com/books/neet-previous-year-paper' },
        ],
      },
    ],
  },
  {
    id: 'LSAT',
    name: 'LSAT',
    short: 'LSAT',
    note: 'LSAC enforces copyright — always use official sources for real PrepTests.',
    groups: [
      {
        label: 'Official (LSAC)',
        links: [
          { title: 'LSAC — official practice tests', desc: 'Information on official LSAT practice tests.', url: 'https://www.lsac.org/lsat/prepare/official-lsat-practice-tests' },
          { title: 'LawHub — PrepTest library', desc: 'Four full free PrepTests with an account.', url: 'https://app.lawhub.org/library/fulltests' },
          { title: 'LawHub Advantage', desc: 'Full PrepTest library (paid).', url: 'https://www.lawhub.org/LawHubAdvantage' },
          { title: 'LSAC — free prep', desc: 'Free official prep, including Khan Academy.', url: 'https://www.lsac.org/lsat/prep' },
        ],
      },
    ],
  },
];
