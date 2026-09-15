// Exam simulation presets: a full paper's structure (sections, question
// counts, mark weights, time) per board so the worksheet builder can
// assemble a paper that feels like the real sitting. Sections are generated
// by the AI one at a time and joined; grade boundaries turn the raw mark
// into the grade the student would get.
import { formatGrade } from './predictedGrade';

// Each section: { name, type (answer type), count, marksEach }.
const MCQ = 'Multiple choice';
const TYPED = 'Typed response';
const EXAM = 'Exam style';

export const EXAM_PRESETS = {
  CBSE: { name: 'CBSE board paper (Class 10/12 pattern)', minutes: 180, sections: [
    { name: 'Section A · objective', type: MCQ, count: 12, marksEach: 1 },
    { name: 'Section B · very short answer', type: TYPED, count: 5, marksEach: 2 },
    { name: 'Section C · short answer', type: EXAM, count: 4, marksEach: 3 },
    { name: 'Section D · long answer', type: EXAM, count: 2, marksEach: 5 },
  ] },
  ICSE: { name: 'ICSE paper', minutes: 150, sections: [
    { name: 'Section A · compulsory', type: MCQ, count: 10, marksEach: 1 },
    { name: 'Section A · short answer', type: TYPED, count: 5, marksEach: 2 },
    { name: 'Section B · structured', type: EXAM, count: 4, marksEach: 4 },
  ] },
  SSLC: { name: 'SSLC paper', minutes: 150, sections: [
    { name: 'Part I · objective', type: MCQ, count: 10, marksEach: 1 },
    { name: 'Part II · short answer', type: TYPED, count: 6, marksEach: 2 },
    { name: 'Part III · long answer', type: EXAM, count: 3, marksEach: 5 },
  ] },
  IGCSE: { name: 'IGCSE · Paper 2 + Paper 4 style', minutes: 120, sections: [
    { name: 'Paper 2 · multiple choice', type: MCQ, count: 12, marksEach: 1 },
    { name: 'Paper 4 · structured', type: EXAM, count: 5, marksEach: 4 },
  ] },
  ASA: { name: 'AS & A Level structured paper', minutes: 90, sections: [
    { name: 'Section A · short structured', type: TYPED, count: 6, marksEach: 2 },
    { name: 'Section B · extended', type: EXAM, count: 4, marksEach: 5 },
  ] },
  IB: { name: 'IB · Paper 1 + Paper 2 style', minutes: 90, sections: [
    { name: 'Paper 1 · short response', type: TYPED, count: 8, marksEach: 2 },
    { name: 'Paper 2 · extended response', type: EXAM, count: 3, marksEach: 6 },
  ] },
  AP: { name: 'AP exam', minutes: 120, sections: [
    { name: 'Section I · multiple choice', type: MCQ, count: 20, marksEach: 1 },
    { name: 'Section II · free response', type: EXAM, count: 3, marksEach: 6 },
  ] },
  SAT: { name: 'SAT module', minutes: 64, sections: [
    { name: 'Module 1', type: MCQ, count: 15, marksEach: 1 },
    { name: 'Module 2', type: MCQ, count: 15, marksEach: 1 },
  ] },
  JEE: { name: 'JEE Main pattern', minutes: 90, sections: [
    { name: 'Section A · MCQ (+4/−1)', type: MCQ, count: 15, marksEach: 4, negative: 1 },
    { name: 'Section B · numerical', type: TYPED, count: 5, marksEach: 4 },
  ] },
  NEET: { name: 'NEET pattern', minutes: 60, sections: [
    { name: 'Section A · MCQ (+4/−1)', type: MCQ, count: 25, marksEach: 4, negative: 1 },
  ] },
  LSAT: { name: 'LSAT section', minutes: 35, sections: [
    { name: 'Logical reasoning', type: MCQ, count: 20, marksEach: 1 },
  ] },
};

export function presetFor(board) {
  return EXAM_PRESETS[(board || '').toUpperCase()] || EXAM_PRESETS.CBSE;
}

/** Total marks on a preset. */
export function presetMarks(preset) {
  return preset.sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
}

/**
 * Raw score for a simulation sheet: sum of marks (AI marks when the student
 * asked for them, otherwise full marks for correct / zero for wrong, minus
 * negative marking where the section uses it).
 */
export function simulationScore(sheet) {
  const sim = sheet.simulation;
  if (!sim) return null;
  let got = 0;
  let max = 0;
  (sheet.questions || []).forEach((q, i) => {
    const sec = sim.sections[q._section ?? 0] || sim.sections[0];
    const m = sec.marksEach;
    max += m;
    const marked = sheet.marking?.[i];
    if (marked && typeof marked.marks === 'number') { got += Math.min(m, marked.marks / (marked.max || m) * m); return; }
    const ok = Array.isArray(sheet.results) ? sheet.results[i] : false;
    const answered = sheet.answers?.[i] !== -1 && sheet.answers?.[i] !== '' && sheet.answers?.[i] != null;
    if (ok) got += m;
    else if (answered && sec.negative) got -= sec.negative;
  });
  got = Math.max(0, Math.round(got * 10) / 10);
  const pct = max ? Math.round((got / max) * 100) : 0;
  return { got, max, pct, grade: formatGrade(pct, sim.board) };
}
