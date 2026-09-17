// Per-board syllabi. Each file is one examining body's complete subject list
// with that qualification's own topic structure, so IGCSE Mathematics and
// CBSE Class 12 Mathematics never share a topic list. Subject names are the
// keys students' courses are saved under, so they stay stable.
import AP from './AP';
import ASA from './ASA';
import CBSE10 from './CBSE10';
import CBSE from './CBSE';
import IB from './IB';
import ICSE from './ICSE';
import IGCSE from './IGCSE';
import ISC from './ISC';
import JEE from './JEE';
import LSAT from './LSAT';
import NEET from './NEET';
import SAT from './SAT';

export const BOARD_SYLLABI = { AP, ASA, CBSE10, CBSE, IB, ICSE, IGCSE, ISC, JEE, LSAT, NEET, SAT };

// { board: [subject names] } — drives every subject picker.
export const SUBJECTS_BY_BOARD = Object.fromEntries(
  Object.entries(BOARD_SYLLABI).map(([id, b]) => [id, b.subjects.map((s) => s.name)]),
);

// { board: { subject: [topics] } }
export const BOARD_TOPICS = Object.fromEntries(
  Object.entries(BOARD_SYLLABI).map(([id, b]) => [id, Object.fromEntries(b.subjects.map((s) => [s.name, s.topics || []]))]),
);

export const boardSubject = (board, subject) => (BOARD_SYLLABI[board]?.subjects || []).find((s) => s.name === subject) || null;
