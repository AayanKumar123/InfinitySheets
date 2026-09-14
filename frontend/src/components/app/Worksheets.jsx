import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TOPICS, QUESTION_BANK, FALLBACK_QUESTIONS, EXAM_DURATIONS } from '../../data/mock';
import { enrolledSubjects, questionsForSubject } from '../../lib/subjects';
import { Check, X, Clock, ChevronLeft, ChevronRight, Sparkles, FileText, AlertCircle, Download, Flag, Lock, Maximize2, Gauge, RotateCcw, Loader2, ClipboardCheck, Printer, Play, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import CreateWorksheetButton from './CreateWorksheetButton';
import DiagnosisPanel from './ai/DiagnosisPanel';
import WorksheetAnalysis from './WorksheetAnalysis';
import { emptyTelemetry, computeAnalytics, UNANSWERED } from '../../lib/worksheetAnalytics';
import { dueReviews, reviewToQuestion } from '../../lib/spacedRepetition';
import { markAgainstScheme, markSchemeText, isAiEnabled, generateQuestions, assessPaper } from '../../lib/ai';
import { filesToAiParts } from '../../lib/images';
import { subjectBoards } from '../../lib/subjects';
import WorkingCapture from './WorkingCapture';
import AdSlot from '../ads/AdSlot';


// Full-size photos are only needed for transcription; the stored sheet keeps
// the thumbnail + transcript so localStorage stays small.
function stripFullImages(working) {
  return (working || []).map((w) => (w ? { ...w, images: (w.images || []).map(({ thumb }) => ({ thumb })) } : w));
}

const ANSWER_TYPES = ['Multiple choice', 'Typed response', 'Exam style'];
const DIFFICULTIES = ['Easy', 'Medium', 'Exam level', 'Hard'];
const DURATION_MIN = 5;
const DURATION_MAX = 240;
const DURATION_STEP = 5;

/* ================== Normalization + grading helpers ================== */

function normalizeText(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9\s\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function gradeTyped(userAnswer, expected, aliases = []) {
  const u = normalizeText(userAnswer);
  if (!u) return false;
  const candidates = [expected, ...(aliases || [])].map(normalizeText).filter(Boolean);
  if (!candidates.length) return false;
  // Exact match after normalization, OR one contains the other (short answers).
  return candidates.some((c) => u === c || (c.length >= 3 && (u.includes(c) || c.includes(u))));
}

function gradeExamStyle(userAnswer, keywords = []) {
  const kw = (keywords || []).map(normalizeText).filter(Boolean);
  if (!kw.length) return null; // not gradable → treat as ungraded (won't count as mistake)
  const u = normalizeText(userAnswer);
  if (!u) return false;
  const hit = kw.filter((k) => u.includes(k)).length;
  // Pass threshold: at least half of the keywords must appear.
  return hit / kw.length >= 0.5;
}

/* ================== Question shaping ================== */

// Convert a raw MCQ pool item into a question of the requested answer type.
function toAnswerType(base, answerType) {
  if (answerType === 'Multiple choice') {
    return { ...base, answerType };
  }
  if (answerType === 'Typed response') {
    // Use the correct MCQ option text as the expected typed answer.
    const expected = base.options ? base.options[base.a] : '';
    return {
      ...base,
      answerType,
      typedAnswer: expected,
      typedAliases: [],
      // Keep options so we can still display correct answer on results screen.
    };
  }
  // Exam style
  const expected = base.options ? base.options[base.a] : '';
  const keywords = Array.from(new Set(
    normalizeText(expected).split(' ').filter((w) => w.length >= 3)
  )).slice(0, 4);
  return {
    ...base,
    answerType,
    examAnswer: expected,
    examKeywords: keywords,
  };
}

function buildQuestions({ topics, answerType, difficulty, length, pastPapers, aiGenerated, pastPaperPool, reviewQuestions = [], generated = [] }) {
  // Original AI-written questions, when the model delivered them. The local
  // bank is only the fallback for when the AI is off or unreachable.
  let genIdx = 0;
  const list = (topics && topics.length) ? topics : [];
  // Past-paper questions matching selected topics + answer type. Drawing
  // questions are format-agnostic (the photo is the answer) so they ride
  // along with any answer type.
  const ppMatching = (pastPaperPool || []).filter((p) => list.includes(p.topic) && (p.answerType === answerType || p.answerType === 'Drawing'));
  // Filter by difficulty if it matches; otherwise still include.
  const preferPP = pastPapers && ppMatching.length > 0;
  const preferAI = !!aiGenerated;

  const aiPool = () => {
    if (genIdx < generated.length) return generated[genIdx++];
    const t = list[Math.floor(Math.random() * Math.max(1, list.length))] || null;
    const pool = (t && QUESTION_BANK[t]) || FALLBACK_QUESTIONS;
    const base = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    return toAnswerType({ ...base, _topic: t, difficulty, source: 'ai-generated' }, answerType);
  };
  const ppPool = (i) => {
    if (!ppMatching.length) return null;
    const base = ppMatching[i % ppMatching.length];
    // Normalize shape so it matches AI-shape.
    const shaped = { ...base, _topic: base.topic, source: 'past-paper' };
    // Ensure options+a exist for MCQ, typedAnswer for typed, examKeywords for exam.
    return shaped;
  };

  // Each past-paper question is used at most once. Past-papers-only sheets
  // are therefore capped at the number of matching questions; when AI is
  // also ticked the remainder is AI-generated instead of repeats.
  // Spaced-repetition reviews go first (at most half the sheet) so they are
  // seen even if the student runs out of time.
  const out = [];
  const reviews = (reviewQuestions || []).slice(0, Math.max(1, Math.floor(length / 2)));
  reviews.forEach((r) => out.push(r));
  const ppLimit = preferPP ? Math.min(length, ppMatching.length) : 0;
  const total = Math.max(0, (preferPP && !preferAI ? ppLimit : length) - reviews.length);
  for (let i = 0; i < total; i++) {
    let picked = null;
    if (preferPP && preferAI) {
      // Alternate while past papers last, then AI fills the rest.
      const ppIndex = Math.floor(i / 2);
      picked = (i % 2 === 0 && ppIndex < ppLimit) ? ppPool(ppIndex) : aiPool();
    } else if (preferPP) {
      picked = ppPool(i);
    } else if (preferAI) {
      picked = aiPool();
    }
    if (!picked) picked = aiPool();
    out.push(picked);
  }
  return out;
}

// A printed worksheet the student is doing on paper: questions + timer,
// kept in localStorage so it survives navigation and reloads.
const PAPER_KEY = 'infinitysheets_paper_session';
function loadPaper() {
  try { return JSON.parse(window.localStorage.getItem(PAPER_KEY) || 'null'); } catch (_) { return null; }
}
function savePaper(p) {
  try { if (p) window.localStorage.setItem(PAPER_KEY, JSON.stringify(p)); else window.localStorage.removeItem(PAPER_KEY); } catch (_) { /* ignore */ }
}

function fmtDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/* ================== PDF export ================== */

// Build a printable PDF from a set of questions produced by `buildQuestions`.
// The PDF has a cover header with metadata, then each question with either
// A/B/C/D options (MCQ), a single blank line (typed response), or a lined
// answer box (exam style). An answer key page is appended at the end so
// students can self-mark once they're done.

// jsPDF's default Helvetica is single-byte (WinAnsi) — characters outside
// that range are rendered as boxes or spaced-out glyphs. Rewrite common
// math/typographic characters to ASCII so the printout stays readable.
function sanitizeForPDF(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    // Superscripts / subscripts.
    .replace(/\u00b2/g, '^2')
    .replace(/\u00b3/g, '^3')
    .replace(/\u2070/g, '^0')
    .replace(/\u00b9/g, '^1')
    .replace(/[\u2074-\u2079]/g, (c) => `^${c.charCodeAt(0) - 0x2070}`)
    .replace(/[\u2080-\u2089]/g, (c) => `_${c.charCodeAt(0) - 0x2080}`)
    // Dashes and minus.
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    // Quotes and apostrophes.
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Multiplication / division / plus-minus / degree / ellipsis / bullet.
    .replace(/\u00d7/g, 'x')
    .replace(/\u00f7/g, '/')
    .replace(/\u00b1/g, '+/-')
    .replace(/\u00b0/g, ' deg')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25cf]/g, '*')
    // Middle dot / non-breaking space.
    .replace(/\u00b7/g, '.')
    .replace(/\u00a0/g, ' ')
    // Arrows / infinity — spell them out when possible.
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u21d2/g, '=>')
    .replace(/\u221e/g, 'inf')
    // Fractions.
    .replace(/\u00bd/g, '1/2')
    .replace(/\u00bc/g, '1/4')
    .replace(/\u00be/g, '3/4')
    // Anything else non-latin1: strip.
    .replace(/[^\x20-\x7e\n\r\t]/g, '');
}

function downloadWorksheetPDF({ questions, subject, topics, difficulty, answerType, duration, studentName }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 60;
  const contentWidth = pageWidth - marginX * 2;
  let y = marginTop;

  const ensureRoom = (needed) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const writeWrapped = (text, opts = {}) => {
    const {
      size = 11,
      style = 'normal',
      lineHeight = 1.35,
      indent = 0,
      color = [15, 23, 42],
      after = 6,
    } = opts;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const clean = sanitizeForPDF(text);
    const lines = doc.splitTextToSize(clean, contentWidth - indent);
    const lh = size * lineHeight;
    lines.forEach((line) => {
      ensureRoom(lh);
      doc.text(line, marginX + indent, y);
      y += lh;
    });
    y += after;
  };

  // ----- Cover header -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('InfinitySheets Worksheet', marginX, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const topicStr = (topics || []).join(', ') || '-';
  const metaLines = [
    `${subject}  -  ${topicStr}`,
    `Difficulty: ${difficulty}  -  Answer type: ${answerType}  -  Duration: ${duration} min  -  Questions: ${questions.length}`,
    `Generated: ${dateStr}`,
  ].map(sanitizeForPDF);
  metaLines.forEach((m) => {
    doc.text(m, marginX, y);
    y += 15;
  });
  y += 4;

  // Name / date fields for handwritten worksheets.
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.7);
  const nameLabel = studentName ? `Name: ${sanitizeForPDF(studentName)}` : 'Name:';
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(nameLabel, marginX, y);
  doc.line(marginX + 46, y + 2, marginX + 260, y + 2);
  doc.text('Score:', marginX + 300, y);
  doc.line(marginX + 336, y + 2, pageWidth - marginX, y + 2);
  y += 22;

  // Separator.
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.9);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // ----- Questions -----
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  questions.forEach((q, idx) => {
    ensureRoom(80);
    writeWrapped(`${idx + 1}. ${q.q}`, { size: 12, style: 'bold', after: 4 });

    if (q.answerType === 'Multiple choice' && Array.isArray(q.options)) {
      q.options.forEach((opt, oi) => {
        writeWrapped(`${optionLabels[oi] || String(oi + 1)}) ${opt}`, {
          size: 11,
          indent: 20,
          color: [51, 65, 85],
          after: 2,
        });
      });
      y += 6;
    } else if (q.answerType === 'Typed response') {
      // A single answer line.
      ensureRoom(28);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Answer:', marginX + 4, y + 10);
      doc.line(marginX + 52, y + 12, pageWidth - marginX, y + 12);
      y += 26;
    } else {
      // Exam style — lined answer box (~6 lines).
      ensureRoom(120);
      const rows = 6;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      for (let r = 0; r < rows; r++) {
        const ly = y + (r + 1) * 16;
        doc.line(marginX + 4, ly, pageWidth - marginX, ly);
      }
      y += rows * 16 + 10;
    }
    y += 4;
  });

  // ----- Answer key -----
  doc.addPage();
  y = marginTop;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Answer key', marginX, y);
  y += 22;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.9);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  const numColX = marginX;
  const ansColX = marginX + 32;
  const ansWidth = contentWidth - 32;
  doc.setFontSize(11);
  questions.forEach((q, idx) => {
    let answer;
    if (q.answerType === 'Multiple choice' && Array.isArray(q.options)) {
      const label = optionLabels[q.a] || String((q.a ?? 0) + 1);
      answer = `${label}) ${q.options[q.a] ?? ''}`;
    } else if (q.answerType === 'Typed response') {
      const aliases = (q.typedAliases || []).filter(Boolean);
      answer = q.typedAnswer + (aliases.length ? `  -  also accepts: ${aliases.join(', ')}` : '');
    } else {
      const kws = (q.examKeywords || []).filter(Boolean);
      answer = kws.length ? `Key ideas: ${kws.join(', ')}` : 'Open response - mark on quality of reasoning.';
    }
    const cleanAnswer = sanitizeForPDF(answer);
    const answerLines = doc.splitTextToSize(cleanAnswer, ansWidth);
    const lh = 11 * 1.35;
    const blockH = answerLines.length * lh;
    ensureRoom(blockH + 4);
    // Number label — bold, on the first answer line.
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}.`, numColX, y);
    // Answer text.
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    answerLines.forEach((line, li) => {
      doc.text(line, ansColX, y + li * lh);
    });
    y += blockH + 4;
  });

  const safeName = (subject || 'worksheet').replace(/\W+/g, '_').slice(0, 40).toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`infinitysheets_${safeName}_${stamp}.pdf`);
}

/* ================== Main component ================== */

export default function Worksheets({ go }) {
  const { state, recordWorksheet, updateWorksheet, saveDraftWorksheet, clearDraftWorksheet } = useApp();
  const track = state.user?.examTrack || 'SSLC';
  const examMinutes = EXAM_DURATIONS[track] || 60;

  const customSubjectTopics = useMemo(() => {
    // Map<subject, topics[]> for custom courses.
    const m = {};
    (state.courses || []).forEach((c) => {
      const subs = Array.isArray(c.subjects) ? c.subjects : [];
      subs.forEach((s) => {
        if (s && s.subject && Array.isArray(s.topics) && s.topics.length && !m[s.subject]) {
          m[s.subject] = s.topics;
        }
      });
    });
    return m;
  }, [state.courses]);

  // Topics observed in the past-paper library per subject — used as a fallback
  // so any subject the student takes (even non-track ones like IB "Mathematics
  // AA") still has topics to practise, sourced from real past-paper content.
  const pastPaperTopicsBySubject = useMemo(() => {
    const m = {};
    (state.pastPapers || []).forEach((p) => {
      if (!p.subject || !p.topic) return;
      (m[p.subject] = m[p.subject] || new Set()).add(p.topic);
    });
    const out = {};
    Object.entries(m).forEach(([k, v]) => { out[k] = Array.from(v); });
    return out;
  }, [state.pastPapers]);

  // The subject list MUST match "My subjects" exactly (Dashboard / Start
  // Studying), so it comes from the same shared derivation — the subjects the
  // student actually added, not a single-track filtered guess.
  const chosenSubjects = useMemo(
    () => enrolledSubjects(state.courses, state.user?.subjects, track),
    [state.courses, state.user?.subjects, track],
  );
  const hasCourses = (state.courses || []).length > 0;

  const topicsForSubject = (s) => (customSubjectTopics[s] || TOPICS[s] || pastPaperTopicsBySubject[s] || []);

  const preselect = typeof window !== 'undefined' ? window.sessionStorage.getItem('preselect_subject') : null;
  const preselectTopic = typeof window !== 'undefined' ? window.sessionStorage.getItem('preselect_topic') : null;

  const [subject, setSubject] = useState(() => {
    if (preselect && chosenSubjects.includes(preselect)) return preselect;
    return chosenSubjects[0] || '';
  });
  const topicsList = topicsForSubject(subject);
  const [topics, setTopics] = useState(() => {
    if (preselectTopic && topicsList.includes(preselectTopic)) return [preselectTopic];
    return topicsList.length ? [topicsList[0]] : [];
  });

  const [answerType, setAnswerType] = useState('Multiple choice');

  // The same questions the Question Bank lists for this subject — one shared
  // selector, so the two can never disagree. Topic / answer-type narrowing is
  // layered on top in buildQuestions and ppAvailable.
  const pastPaperPool = useMemo(
    () => questionsForSubject(state.pastPapers, subject, state.courses, track),
    [state.pastPapers, subject, state.courses, track],
  );
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState(examMinutes);
  const [pastPapers, setPastPapers] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(true);

  const [stage, setStage] = useState('build');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // holds number (MCQ index) or string (typed/exam)
  const [working, setWorking] = useState([]); // per-question { images, transcript } (photo of working)
  const [flags, setFlags] = useState([]);     // per-question "come back to this"
  const [current, setCurrent] = useState(0);
  // Sheet-level modes chosen on the build screen.
  const [examMode, setExamMode] = useState(false);     // fullscreen, locked
  const [paceCoach, setPaceCoach] = useState(false);   // per-question time budget
  const [includeReviews, setIncludeReviews] = useState(true);
  const [examExits, setExamExits] = useState(0);       // times fullscreen was left
  const [examLocked, setExamLocked] = useState(false); // lock screen showing
  const [reviewOpen, setReviewOpen] = useState(false); // pre-submit check
  const aiOn = isAiEnabled(state);
  const [generating, setGenerating] = useState(false);   // AI is writing questions
  const [paper, setPaper] = useState(() => loadPaper()); // printed worksheet session
  const [paperNow, setPaperNow] = useState(Date.now());
  const [assessing, setAssessing] = useState(false);
  const [paperFiles, setPaperFiles] = useState([]);
  useEffect(() => { savePaper(paper); }, [paper]);
  useEffect(() => {
    if (!paper?.startedAt || paper.submittedAt) return;
    const id = setInterval(() => setPaperNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paper?.startedAt, paper?.submittedAt]);
  const ibLevelForSubject = useMemo(() => subjectBoards(state.courses, track)[subject]?.ibLevel, [state.courses, track, subject]);
  const boardForSubject = useMemo(() => subjectBoards(state.courses, track)[subject]?.board || track, [state.courses, track, subject]);
  const reviewsDue = useMemo(() => dueReviews(state.worksheets || [], { subject }), [state.worksheets, subject]);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);

  // --- In-progress draft plumbing ------------------------------------------
  const draftIdRef = useRef(null);
  const skipTopicResetRef = useRef(false);
  // Always-fresh snapshot of the take-stage state for saving on navigate-away.
  const liveRef = useRef({});
  liveRef.current = { stage, subject, topics, answerType, difficulty, duration, questions, answers, current, timeLeft, pastPapers, aiGenerated, startTime, working, flags, examMode, paceCoach, examExits };

  // Per-question telemetry for the worksheet analysis: how long each question
  // had the student's attention (tab visible), how many times it was visited,
  // and the first answer given so we can tell right→wrong changes later. Kept
  // in a ref so recording never re-renders the sheet.
  const telemetryRef = useRef({ data: emptyTelemetry(0), enteredAt: null, hiddenAt: null });
  const telemetryOpen = (idx, now = Date.now()) => {
    const t = telemetryRef.current;
    if (!t.data.timeMs || idx == null || idx < 0 || idx >= t.data.timeMs.length) { t.enteredAt = null; return; }
    t.data.visits[idx] = (t.data.visits[idx] || 0) + 1;
    t.data.order.push(idx);
    t.enteredAt = t.hiddenAt ? null : now;
  };
  const telemetryClose = (idx, now = Date.now()) => {
    const t = telemetryRef.current;
    if (t.enteredAt != null && idx != null && t.data.timeMs && idx < t.data.timeMs.length) {
      t.data.timeMs[idx] = (t.data.timeMs[idx] || 0) + Math.max(0, now - t.enteredAt);
    }
    t.enteredAt = null;
    // Commit a typed answer as the "first answer" the first time it is left.
    const v = (liveRef.current.answers || [])[idx];
    if (typeof v === 'string' && v.trim() && t.data.firstAnswer && idx < t.data.firstAnswer.length && t.data.firstAnswer[idx] == null) {
      t.data.firstAnswer[idx] = v;
      t.data.firstAnswerMs[idx] = now - (liveRef.current.startTime || now);
    }
  };
  const countAnswered = (arr) => (arr || []).filter((a) => a !== -1 && a !== '' && a !== undefined && a !== null).length;
  const makeDraft = (d) => ({
    id: draftIdRef.current || `draft_${Date.now()}`,
    subject: d.subject,
    topics: d.topics,
    answerType: d.answerType,
    difficulty: d.difficulty,
    duration: d.duration,
    pastPapers: d.pastPapers,
    aiGenerated: d.aiGenerated,
    questions: d.questions,
    answers: d.answers,
    current: d.current,
    timeLeft: d.timeLeft,
    total: (d.questions || []).length,
    answered: countAnswered(d.answers),
    telemetry: telemetryRef.current.data,
    working: stripFullImages(d.working),
    flags: d.flags,
    examMode: d.examMode,
    paceCoach: d.paceCoach,
    examExits: d.examExits,
    savedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (skipTopicResetRef.current) { skipTopicResetRef.current = false; return; }
    const t = topicsForSubject(subject);
    setTopics(t.length ? [t[0]] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  useEffect(() => {
    if (preselect) window.sessionStorage.removeItem('preselect_subject');
    if (preselectTopic) window.sessionStorage.removeItem('preselect_topic');
  }, [preselect, preselectTopic]);

  // Resume a saved draft when arriving from a "Continue worksheet" action.
  useEffect(() => {
    let wantResume = null;
    try { wantResume = window.sessionStorage.getItem('resume_ws_draft'); } catch (_) { /* ignore */ }
    if (wantResume && state.draftWorksheet) {
      const d = state.draftWorksheet;
      skipTopicResetRef.current = true;
      draftIdRef.current = d.id;
      setSubject(d.subject);
      setTopics(d.topics || []);
      setAnswerType(d.answerType || 'Multiple choice');
      setDifficulty(d.difficulty || 'Medium');
      setDuration(d.duration || examMinutes);
      setPastPapers(!!d.pastPapers);
      setAiGenerated(d.aiGenerated !== false);
      setQuestions(d.questions || []);
      setAnswers(d.answers || []);
      setWorking(d.working || []);
      setFlags(d.flags || []);
      setExamMode(!!d.examMode);
      setPaceCoach(!!d.paceCoach);
      setExamExits(d.examExits || 0);
      setCurrent(d.current || 0);
      const n = (d.questions || []).length;
      const base = emptyTelemetry(n);
      const saved = d.telemetry || {};
      telemetryRef.current = { data: { ...base, ...saved, timeMs: (saved.timeMs || base.timeMs).slice(0, n), visits: (saved.visits || base.visits).slice(0, n), changes: (saved.changes || base.changes).slice(0, n), firstAnswer: (saved.firstAnswer || base.firstAnswer).slice(0, n), firstAnswerMs: (saved.firstAnswerMs || base.firstAnswerMs).slice(0, n), order: saved.order || [] }, enteredAt: null, hiddenAt: null };
      const secs = typeof d.timeLeft === 'number' ? d.timeLeft : (d.duration || examMinutes) * 60;
      setTimeLeft(secs);
      setStartTime(Date.now() - Math.max(0, ((d.duration || examMinutes) * 60 - secs)) * 1000);
      setStage('take');
    }
    try { window.sessionStorage.removeItem('resume_ws_draft'); } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft as the student answers / navigates while taking it.
  useEffect(() => {
    if (stage === 'take' && questions.length) {
      saveDraftWorksheet(makeDraft(liveRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, answers, current]);

  // Save the latest progress if the component unmounts mid-worksheet
  // (e.g. the student navigates away without submitting).
  useEffect(() => () => {
    const d = liveRef.current;
    if (d.stage === 'take' && (d.questions || []).length) {
      saveDraftWorksheet(makeDraft(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== 'take') return;
    if (timeLeft <= 0) { finalize(); return; }
    const id = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  // Time-on-question: open a segment when a question is shown, close it when
  // the student moves on (or the sheet ends).
  useEffect(() => {
    if (stage !== 'take') return;
    telemetryOpen(current);
    return () => telemetryClose(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current]);

  // Don't count time while the tab is hidden (switched app, locked screen).
  useEffect(() => {
    if (stage !== 'take') return;
    const onVis = () => {
      const t = telemetryRef.current;
      const now = Date.now();
      const idx = liveRef.current.current;
      if (document.visibilityState === 'hidden') {
        telemetryClose(idx, now);
        t.hiddenAt = now;
      } else if (t.hiddenAt) {
        t.data.hiddenMs += now - t.hiddenAt;
        t.hiddenAt = null;
        t.enteredAt = now;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stage]);

  const toggleTopic = (t) => {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  // Count of admin-uploaded past-paper questions matching current filters.
  const ppAvailable = useMemo(() => {
    return (pastPaperPool || []).filter((p) => topics.includes(p.topic) && (p.answerType === answerType || p.answerType === 'Drawing')).length;
  }, [pastPaperPool, topics, answerType]);

  // Validate the builder, ask the AI for original questions when that source
  // is ticked, and assemble the sheet. Resolves to null when validation fails.
  const assembleQuestions = async ({ withReviews }) => {
    if (!subject) { toast.error(chosenSubjects.length ? 'Select a subject' : 'Add a course first — its subjects appear here'); return null; }
    if (!topics.length) { toast.error('Select at least one topic'); return null; }
    if (!pastPapers && !aiGenerated) { toast.error('Pick past papers, AI generated, or both'); return null; }
    if (pastPapers && !aiGenerated && ppAvailable === 0) {
      toast.error('No past-paper questions match this selection. Ask an admin to upload some, or also tick AI generated.');
      return null;
    }
    const length = Math.max(3, Math.min(30, Math.round(duration / 3)));
    const reviewQuestions = withReviews && includeReviews ? reviewsDue.filter((r) => topics.includes(r.topic) || !r.topic).map(reviewToQuestion) : [];
    let generated = [];
    if (aiGenerated && aiOn) {
      // How many the AI has to write: the sheet minus reviews minus the
      // past-paper share (alternating fill when both sources are ticked).
      const reviewsN = Math.min(reviewQuestions.length, Math.max(1, Math.floor(length / 2)));
      const ppN = pastPapers ? Math.min(Math.ceil((length - reviewsN) / 2), ppAvailable) : 0;
      const need = Math.max(0, length - reviewsN - ppN);
      if (need > 0) {
        setGenerating(true);
        try {
          generated = await generateQuestions({ board: boardForSubject, ibLevel: ibLevelForSubject, subject, topics, answerType, difficulty, count: need });
        } catch (e) {
          toast.error(`${e.message || 'The AI could not write questions'} — using the built-in bank instead.`);
        } finally {
          setGenerating(false);
        }
      }
    }
    const qs = buildQuestions({ topics, answerType, difficulty, length, pastPapers, aiGenerated, pastPaperPool, reviewQuestions, generated });
    if (qs.length < length) toast(`Only ${qs.length} past-paper question${qs.length === 1 ? '' : 's'} match this selection, so this sheet has ${qs.length}. Tick AI generated for more.`);
    return qs;
  };

  const start = async () => {
    if (generating) return;
    const qs = await assembleQuestions({ withReviews: true });
    if (!qs) return;
    draftIdRef.current = `draft_${Date.now()}`;
    setQuestions(qs);
    // For MCQ, -1 means unanswered. For typed/exam, empty string.
    setAnswers(qs.map((q) => (q.answerType === 'Multiple choice' ? -1 : '')));
    setWorking(new Array(qs.length).fill(undefined));
    setFlags(new Array(qs.length).fill(false));
    setExamExits(0);
    setExamLocked(false);
    paceWarnedRef.current = new Set();
    setCurrent(0);
    telemetryRef.current = { data: emptyTelemetry(qs.length), enteredAt: null, hiddenAt: null };
    if (examMode) enterFullscreen();
    setStartTime(Date.now());
    setTimeLeft(duration * 60);
    setStage('take');
  };

  // Same validation + question build as `start`, but instead of entering
  // the interactive stage, this hands the questions to jsPDF and downloads
  // the printable worksheet + answer key. No progress is recorded.
  const downloadPDF = async () => {
    if (generating) return;
    const qs = await assembleQuestions({ withReviews: false });
    if (!qs) return;
    try {
      downloadWorksheetPDF({
        questions: qs,
        subject,
        topics,
        difficulty,
        answerType,
        duration,
        studentName: state.user?.name || '',
      });
      toast.success('PDF ready \u2014 check your downloads folder.');
      // Open a paper session so the student can time it and hand in the answers.
      setPaper({ id: `paper_${Date.now()}`, subject, topics, answerType, difficulty, duration, questions: qs, createdAt: new Date().toISOString(), startedAt: null, submittedAt: null });
      setPaperFiles([]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PDF export failed', err);
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  // ---- Printed worksheet: timer + hand-in ----------------------------------
  const paperElapsedSec = paper?.startedAt ? Math.max(0, Math.floor(((paper.submittedAt ? new Date(paper.submittedAt).getTime() : paperNow) - new Date(paper.startedAt).getTime()) / 1000)) : 0;
  const paperLeftSec = paper ? Math.max(0, paper.duration * 60 - paperElapsedSec) : 0;
  const startPaperTimer = () => setPaper((p) => (p ? { ...p, startedAt: new Date().toISOString() } : p));
  const discardPaper = () => { setPaper(null); setPaperFiles([]); };
  const addPaperFiles = (list) => {
    const files = Array.from(list || []).filter((f) => /^image\//.test(f.type) || f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!files.length) { toast.error('Add photos or a PDF of your answers'); return; }
    setPaperFiles((prev) => [...prev, ...files].slice(0, 12));
  };
  const submitPaper = async () => {
    if (!paper || assessing) return;
    if (!paperFiles.length) { toast.error('Scan or upload your answers first'); return; }
    if (!aiOn) { toast.error('Turn AI on in Settings to have the answers assessed'); return; }
    setAssessing(true);
    try {
      const parts = await filesToAiParts(paperFiles, { label: 'STUDENT ANSWERS' });
      const results = await assessPaper({ questions: paper.questions, files: parts, board: boardForSubject, subject: paper.subject });
      const submittedAt = new Date().toISOString();
      const durationSec = paper.startedAt ? Math.floor((new Date(submittedAt).getTime() - new Date(paper.startedAt).getTime()) / 1000) : 0;
      const qs = paper.questions;
      // MCQ answers come back as letters or option text; map them to indexes.
      const answers = qs.map((q, i) => {
        const r = results[i];
        if (q.answerType !== 'Multiple choice') return r.answer;
        const letter = /^[A-Za-z]\b/.exec((r.answer || '').trim());
        const li = letter ? letter[0].toUpperCase().charCodeAt(0) - 65 : -1;
        if (li >= 0 && li < (q.options || []).length) return li;
        const ti = (q.options || []).findIndex((o) => o.toLowerCase() === (r.answer || '').trim().toLowerCase());
        return ti >= 0 ? ti : (r.answer ? -2 : -1);
      });
      const res = results.map((r) => r.correct);
      const correct = res.filter(Boolean).length;
      const thumbs = parts.filter((p) => p.thumb).map((p) => ({ thumb: p.thumb }));
      const sheet = {
        id: `ws_${Date.now()}`,
        subject: paper.subject,
        topic: paper.topics.join(', '),
        topics: paper.topics,
        difficulty: paper.difficulty,
        length: qs.length,
        answerType: paper.answerType,
        duration: paper.duration,
        pastPapers,
        aiGenerated,
        paper: true,
        board: boardForSubject,
        ibLevel: ibLevelForSubject,
        questions: qs,
        answers,
        working: results.map((r, i) => (r.working || (i === 0 && thumbs.length) ? { images: i === 0 ? thumbs : [], transcript: r.working || null } : undefined)),
        marking: Object.fromEntries(results.map((r) => [r.i, { marks: r.marks, max: r.max, feedback: r.feedback, at: submittedAt }])),
        results: res,
        total: qs.length,
        correct,
        score: Math.round((correct / Math.max(1, qs.length)) * 100),
        durationSec,
        analytics: null,
        date: submittedAt,
      };
      recordWorksheet(sheet);
      setResult(sheet);
      setPaper(null);
      setPaperFiles([]);
      setStage('result');
      toast.success(`Marked: ${correct}/${qs.length} correct`);
    } catch (e) {
      toast.error(e.message || 'Could not assess the answers');
    } finally {
      setAssessing(false);
    }
  };

  const gradeOne = (q, given) => {
    // A drawing is "answered" when a photo is attached; marks come from the
    // AI marker against the scheme, not from auto-grading.
    if (q.answerType === 'Drawing') return !!given;
    if (q.answerType === 'Multiple choice') {
      return given === q.a;
    }
    if (q.answerType === 'Typed response') {
      return gradeTyped(given, q.typedAnswer, q.typedAliases || []);
    }
    // Exam style
    const graded = gradeExamStyle(given, q.examKeywords || []);
    // If not gradable (no keywords), give credit for any non-empty response.
    if (graded === null) return !!(given && given.toString().trim());
    return graded;
  };

  const finalize = () => {
    telemetryClose(current);
    const results = questions.map((q, i) => gradeOne(q, answers[i]));
    const correct = results.filter(Boolean).length;
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    const analytics = computeAnalytics({ questions, answers, results, telemetry: telemetryRef.current.data, gradeOne, durationMin: duration });
    analytics.examMode = examMode ? { exits: examExits } : null;
    analytics.paceCoach = paceCoach;
    analytics.flagged = flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
    if (examMode) exitFullscreen();
    setReviewOpen(false);
    const sheet = {
      id: `ws_${Date.now()}`,
      subject,
      topic: topics.join(', '),
      topics,
      difficulty,
      length: questions.length,
      answerType,
      duration,
      pastPapers,
      aiGenerated,
      questions,
      answers,
      working: stripFullImages(working),
      flags,
      examMode,
      // Remembered on the sheet so history / diagnosis still know the board
      // after the subject is removed from the student's courses.
      board: boardForSubject,
      ibLevel: ibLevelForSubject,
      results,
      total: questions.length,
      correct,
      score: Math.round((correct / questions.length) * 100),
      durationSec,
      analytics,
      date: new Date().toISOString(),
    };
    recordWorksheet(sheet);
    setResult(sheet);
    setStage('result');
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const setAnswerAt = (idx, value) => {
    // MCQ: the first pick is the "first instinct"; later picks are changes.
    // Typed answers are committed when the student leaves the question
    // (see telemetryClose) so keystrokes don't count as changes.
    const t = telemetryRef.current.data;
    const prevVal = answers[idx];
    if (typeof value === 'number' && t.firstAnswer && idx < t.firstAnswer.length) {
      if (!UNANSWERED(value) && t.firstAnswer[idx] == null) {
        t.firstAnswer[idx] = value;
        t.firstAnswerMs[idx] = Date.now() - startTime;
      } else if (!UNANSWERED(prevVal) && !UNANSWERED(value) && prevVal !== value) {
        t.changes[idx] = (t.changes[idx] || 0) + 1;
      }
    }
    setAnswers((prev) => {
      const c = [...prev];
      c[idx] = value;
      return c;
    });
  };

  const setWorkingAt = (idx, value) => {
    setWorking((prev) => { const c = [...prev]; c[idx] = value; return c; });
    // For drawing questions the photo is the answer.
    const q = questions[idx];
    if (q && q.answerType === 'Drawing') setAnswerAt(idx, (value?.images || []).length ? '[photo]' : '');
  };
  const toggleFlag = (idx) => setFlags((prev) => { const c = [...prev]; c[idx] = !c[idx]; return c; });

  // ---- Exam mode: fullscreen + lock ---------------------------------------
  const enterFullscreen = () => {
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    const denied = () => toast('Your browser blocked fullscreen. Exam mode still locks the sheet until you submit.', { icon: '🔒' });
    if (!fn) { denied(); return; }
    try { const r = fn.call(el); if (r && r.catch) r.catch(denied); } catch (_) { denied(); }
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    if (stage !== 'take' || !examMode) return;
    const onFs = () => {
      if (!document.fullscreenElement) { setExamLocked(true); setExamExits((n) => n + 1); }
      else setExamLocked(false);
    };
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    // Route changes are refused by the Router (App.js) while this lock is set;
    // each attempt counts as a violation.
    window.__examLock = { hash: '#worksheets', onBlocked: () => { setExamExits((n) => n + 1); toast.error('Exam mode: finish and submit the sheet first.'); } };
    const onKey = (e) => {
      // Block the shortcuts that would leave the sheet. Esc itself cannot be
      // intercepted in fullscreen; the lock screen handles that case.
      if ((e.ctrlKey || e.metaKey) && ['w', 't', 'n', 'r', 'l', 'p'].includes((e.key || '').toLowerCase())) e.preventDefault();
      if (e.key === 'F5' || e.key === 'F11') e.preventDefault();
    };
    const onCtx = (e) => e.preventDefault();
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('contextmenu', onCtx);
    return () => {
      window.__examLock = null;
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('contextmenu', onCtx);
    };
  }, [stage, examMode]);

  // ---- Pace coach: per-question time budget ------------------------------
  const totalMarks = useMemo(() => questions.reduce((s, q) => s + (Number(q.marks) || 0), 0), [questions]);
  const budgetMsFor = (idx) => {
    const q = questions[idx];
    const allotted = duration * 60 * 1000;
    if (!q || !questions.length) return 0;
    // Marks-weighted when the sheet has marks, otherwise an equal split.
    if (totalMarks > 0 && Number(q.marks) > 0) return allotted * (Number(q.marks) / totalMarks);
    return allotted / questions.length;
  };
  const [paceTick, setPaceTick] = useState(0);
  useEffect(() => {
    if (stage !== 'take' || !paceCoach) return;
    const id = setInterval(() => setPaceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [stage, paceCoach]);
  const paceWarnedRef = useRef(new Set());
  const spentOnCurrentMs = () => {
    const t = telemetryRef.current;
    const stored = t.data.timeMs?.[current] || 0;
    const live = t.enteredAt ? Date.now() - t.enteredAt : 0;
    return stored + live;
  };
  useEffect(() => {
    if (stage !== 'take' || !paceCoach) return;
    const budget = budgetMsFor(current);
    if (budget > 0 && spentOnCurrentMs() > budget && !paceWarnedRef.current.has(current)) {
      paceWarnedRef.current.add(current);
      toast(`Over pace on Q${current + 1} — flag it and move on, come back if there is time.`, { icon: '⏱️' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paceTick, current, stage, paceCoach]);

  const unansweredIdx = questions.map((q, i) => (UNANSWERED(answers[i]) ? i : -1)).filter((i) => i >= 0);
  const flaggedIdx = flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const requestSubmit = () => {
    if (unansweredIdx.length || flaggedIdx.length) setReviewOpen(true);
    else finalize();
  };

  // Keyboard shortcuts while taking a worksheet:
  //   A / B / C / D → pick that MCQ option
  //   1 / 2 / 3 / 4 → same, using numbers
  //   → / Enter / Space → next question (or submit on last)
  //   ← / Backspace → previous question
  // Ignored while typing in an input/textarea (Typed / Exam-style).
  // Disabled entirely when the user turns off shortcuts in Settings.
  const shortcutsEnabled = state.settings?.keyboardShortcuts !== false;
  useEffect(() => {
    if (stage !== 'take') return;
    if (!shortcutsEnabled) return;
    const handler = (e) => {
      const target = e.target;
      const tag = (target && target.tagName) || '';
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable);
      if (isEditable) return;
      const q = questions[current];
      if (!q) return;
      if (q.answerType === 'Multiple choice') {
        const key = (e.key || '').toLowerCase();
        // Letter A-Z or digit 1-9.
        let idx = -1;
        if (/^[a-z]$/.test(key)) idx = key.charCodeAt(0) - 97;
        else if (/^[1-9]$/.test(key)) idx = parseInt(key, 10) - 1;
        const opts = q.options || [];
        if (idx >= 0 && idx < opts.length) {
          e.preventDefault();
          setAnswerAt(current, idx);
          return;
        }
      }
      if ((e.key || '').toLowerCase() === 'f') { e.preventDefault(); toggleFlag(current); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (current < questions.length - 1) setCurrent((c) => c + 1);
        else requestSubmit();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (current > 0) { e.preventDefault(); setCurrent((c) => c - 1); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current, questions, shortcutsEnabled]);

  /* ================== Take stage ================== */
  if (stage === 'take') {
    const q = questions[current];
    const isMCQ = q.answerType === 'Multiple choice';
    const isTyped = q.answerType === 'Typed response';
    const isExam = q.answerType === 'Exam style';
    const isDrawing = q.answerType === 'Drawing';
    const budget = paceCoach ? budgetMsFor(current) : 0;
    const spent = paceCoach ? spentOnCurrentMs() : 0;
    const overPace = budget > 0 && spent > budget;
    const paceLeft = Math.max(0, Math.round((budget - spent) / 1000));
    const jumpTo = (i) => { setReviewOpen(false); setCurrent(i); };
    const body = (
      <div className={examMode ? 'max-w-[900px] mx-auto w-full px-4 sm:px-8 py-6' : 'max-w-[820px]'}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="text-[13px] text-zinc-500 inline-flex items-center gap-2">
            {examMode && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-semibold"><Lock className="w-3.5 h-3.5" /> Exam mode</span>}
            {subject} · {topics.join(' · ')}
          </div>
          <div className="flex items-center gap-2">
            {paceCoach && budget > 0 && (
              <div className={`inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-md ${overPace ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`} title="Time budget for this question" data-testid="ws-pace">
                <Gauge className="w-4 h-4" /> {overPace ? `${fmtTime(Math.round((spent - budget) / 1000))} over` : `${fmtTime(paceLeft)} for Q${current + 1}`}
              </div>
            )}
            <div className="inline-flex items-center gap-2 text-[13px] text-zinc-700 bg-blue-50 px-3 py-1.5 rounded-md">
              <Clock className="w-4 h-4" /> {fmtTime(timeLeft)}
            </div>
            <button
              onClick={() => toggleFlag(current)}
              data-testid="ws-flag"
              title="Flag to review before submitting (F)"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${flags[current] ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-zinc-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Flag className={`w-4 h-4 ${flags[current] ? 'fill-amber-400' : ''}`} /> {flags[current] ? 'Flagged' : 'Flag'}
            </button>
            {!examMode && (
              <button
                onClick={() => { saveDraftWorksheet(makeDraft(liveRef.current)); toast.success('Progress saved — resume it anytime'); go('dashboard'); }}
                data-testid="ws-save-exit"
                className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium"
              >
                <X className="w-4 h-4" /> Save &amp; exit
              </button>
            )}
          </div>
        </div>

        {/* Question strip: answered / flagged / current at a glance */}
        <div className="flex flex-wrap gap-1.5 mb-4" data-testid="ws-strip">
          {questions.map((_, i) => {
            const done = !UNANSWERED(answers[i]);
            const fl = flags[i];
            const cur = i === current;
            return (
              <button
                key={i}
                type="button"
                onClick={() => jumpTo(i)}
                title={`Q${i + 1}${fl ? ' · flagged' : ''}${done ? '' : ' · unanswered'}`}
                className={`w-8 h-8 rounded-md text-[12px] font-semibold border transition-colors relative ${cur ? 'border-blue-600 bg-blue-600 text-white' : done ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {i + 1}
                {fl && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-zinc-200 p-6 bg-white">
          <div className="text-[12px] text-zinc-500 mb-2 flex items-center gap-2">
            <span>Question {current + 1} of {questions.length}{q._topic ? ` · ${q._topic}` : ''}</span>
            {q.source === 'past-paper' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                <FileText className="w-4 h-4" /> Past paper{q.year ? ` · ${q.year}` : ''}
              </span>
            )}
            {q.source === 'ai-generated' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-semibold">
                <Sparkles className="w-4 h-4" /> AI generated
              </span>
            )}
            {q.source === 'review' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-semibold" title="You missed this before — spaced review">
                <RotateCcw className="w-3.5 h-3.5" /> Review
              </span>
            )}
            {q.marks ? <span className="ml-auto text-[11px] font-semibold text-slate-500">[{q.marks} mark{q.marks === 1 ? '' : 's'}]</span> : null}
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden mb-5">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
          <h3 className="text-[18px] font-semibold mb-5 leading-snug">{q.q}</h3>

          {isMCQ && (
            <>
              <div className="flex flex-col gap-2.5">
                {(q.options || []).map((opt, i) => (
                  <button key={`${q.q}-${i}`}
                    onClick={() => setAnswerAt(current, i)}
                    className={`text-left px-4 py-3 rounded-lg border text-[14px] transition-colors ${answers[current] === i ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}>
                    <span className="inline-block w-6 text-zinc-500 font-medium">{String.fromCharCode(65 + i)}.</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
              {shortcutsEnabled && (
                <div className="text-[11.5px] text-slate-500 mt-3">
                  Tip: press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-mono">A</kbd>–<kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-mono">{String.fromCharCode(64 + Math.max(2, (q.options || []).length))}</kbd> on your keyboard to pick an answer, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-mono">→</kbd> to advance.
                </div>
              )}
            </>
          )}

          {isTyped && (
            <div>
              <input
                type="text"
                autoFocus
                value={answers[current] || ''}
                onChange={(e) => setAnswerAt(current, e.target.value)}
                placeholder="Type your answer"
                className="input-base w-full text-[14px]"
                data-testid={`typed-input-${current}`}
              />
              <div className="text-[11.5px] text-slate-500 mt-2">Answers are checked with lenient matching (case, punctuation, extra words are ignored).</div>
            </div>
          )}

          {isExam && (
            <div>
              <textarea
                autoFocus
                rows={6}
                value={answers[current] || ''}
                onChange={(e) => setAnswerAt(current, e.target.value)}
                placeholder="Write a full exam-style response. Include the key ideas the examiner is looking for."
                className="input-base w-full text-[14px]"
                data-testid={`exam-input-${current}`}
              />
              {(q.examKeywords || []).length > 0 && (
                <div className="text-[11.5px] text-slate-500 mt-2">Graded on presence of key ideas from the mark scheme.</div>
              )}
            </div>
          )}

          {/* Photo of working — the answer itself for drawing questions,
              optional supporting evidence for everything else. */}
          <div className="mt-4">
            <WorkingCapture
              value={working[current]}
              onChange={(v) => setWorkingAt(current, v)}
              question={q}
              subject={subject}
              board={boardForSubject}
              required={isDrawing}
              testid={`working-${current}`}
            />
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="btn-outline-dark inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] disabled:opacity-40">
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>
            <div className="flex items-center gap-2">
              {current < questions.length - 1 && (
                <button onClick={requestSubmit} className="btn-outline-dark inline-flex items-center px-4 py-2 rounded-lg text-[13.5px] font-medium" data-testid="ws-submit-early">Submit</button>
              )}
              {current < questions.length - 1 ? (
                <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium">
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={requestSubmit} className="btn-violet inline-flex items-center px-5 py-2 rounded-lg text-[13.5px] font-medium" data-testid="ws-submit">Submit worksheet</button>
              )}
            </div>
          </div>
        </div>

        {/* Pre-submit review: flagged + unanswered */}
        {reviewOpen && (
          <div className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4" onClick={() => setReviewOpen(false)}>
            <div className="w-full max-w-[520px] rounded-2xl bg-white border border-[color:var(--color-border)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="ws-review-modal">
              <div className="text-[17px] font-semibold text-slate-900 mb-1">Before you submit</div>
              <div className="text-[13px] text-slate-600 mb-4">You have {unansweredIdx.length} unanswered and {flaggedIdx.length} flagged question{flaggedIdx.length === 1 ? '' : 's'}. Jump to any of them or submit as is.</div>
              {unansweredIdx.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Unanswered</div>
                  <div className="flex flex-wrap gap-1.5">{unansweredIdx.map((i) => <button key={i} onClick={() => jumpTo(i)} className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-[12.5px] font-semibold">Q{i + 1}</button>)}</div>
                </div>
              )}
              {flaggedIdx.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Flagged</div>
                  <div className="flex flex-wrap gap-1.5">{flaggedIdx.map((i) => <button key={i} onClick={() => jumpTo(i)} className="px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[12.5px] font-semibold inline-flex items-center gap-1"><Flag className="w-3 h-3" /> Q{i + 1}</button>)}</div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setReviewOpen(false)} className="btn-outline-dark px-4 py-2 rounded-lg text-[13.5px] font-medium">Keep working</button>
                <button onClick={finalize} className="btn-violet px-4 py-2 rounded-lg text-[13.5px] font-medium" data-testid="ws-submit-anyway">Submit anyway</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (!examMode) return body;
    // Exam mode: the sheet owns the whole screen; nothing else is reachable.
    return (
      <div className="fixed inset-0 z-[120] overflow-auto section-bg" data-testid="ws-exam-shell">
        {body}
        {examLocked && (
          <div className="fixed inset-0 z-[160] bg-slate-950/95 text-white flex items-center justify-center p-6" data-testid="ws-exam-lock">
            <div className="max-w-[440px] text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-600/20 text-rose-300 flex items-center justify-center mb-4"><Lock className="w-7 h-7" /></div>
              <div className="text-[22px] font-semibold mb-2">Exam paused</div>
              <div className="text-[14px] text-slate-300 mb-1">You left fullscreen. The timer is still running and this counts as an exam-room violation ({examExits} so far).</div>
              <div className="text-[13px] text-slate-400 mb-6">Return to fullscreen to continue. The sheet cannot be left until it is submitted.</div>
              <button onClick={enterFullscreen} className="btn-violet inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold" data-testid="ws-exam-resume"><Maximize2 className="w-5 h-5" /> Return to exam</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================== Result stage ================== */
  if (stage === 'result' && result) {
    return (
      <div className="max-w-[820px]">
        <div className="rounded-2xl border border-zinc-200 p-6 mb-5">
          <div className="eyebrow-muted mb-1">Worksheet complete</div>
          <div className="flex items-end justify-between">
            <h2 className="text-[26px] font-semibold tracking-tight">{result.score}% · {result.correct}/{result.total} correct</h2>
            <div className="text-[13px] text-zinc-500">{result.subject} · {result.topic}</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${result.score}%` }} />
          </div>
        </div>
        <div className="mb-5">
          <DiagnosisPanel sheet={result} autoRun testid="worksheet-diagnosis" />
        </div>
        <div className="mb-5">
          <WorksheetAnalysis sheet={result} testid="worksheet-analysis" />
        </div>
        {result.paper && (
          <div className="mb-5 rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-[13px] text-slate-700 inline-flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" /> Done on paper and marked by the AI from your scans{result.durationSec ? ` · ${fmtTime(result.durationSec)} on the timer` : ''}
          </div>
        )}
        {result.analytics?.examMode && (
          <div className="mb-5 rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-[13px] text-slate-700 inline-flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" /> Taken in exam mode · {result.analytics.examMode.exits === 0 ? 'no violations' : `${result.analytics.examMode.exits} fullscreen exit${result.analytics.examMode.exits === 1 ? '' : 's'}`}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {result.questions.map((q, i) => {
            const ok = result.results ? result.results[i] : (result.answers[i] === q.a);
            const isMCQ = q.answerType === 'Multiple choice';
            const isTyped = q.answerType === 'Typed response';
            const isExam = q.answerType === 'Exam style';
            const isDrawing = q.answerType === 'Drawing';
            const given = result.answers[i];
            const w = (result.working || [])[i];
            return (
              <div key={`${q.q}-${i}`} className={`rounded-xl border p-4 ${ok ? 'border-zinc-200' : 'border-rose-200 bg-rose-50/40'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {ok ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-zinc-900">{i + 1}. {q.q}</div>
                    {isMCQ && (
                      <>
                        <div className="text-[13px] text-zinc-600 mt-1">Correct: <span className="font-medium text-zinc-800">{q.options[q.a]}</span></div>
                        {!ok && given !== -1 && (
                          <div className="text-[13px] text-rose-600 mt-0.5">Your answer: {given >= 0 ? q.options[given] : <span className="italic">(could not be read from the page)</span>}</div>
                        )}
                      </>
                    )}
                    {isTyped && (
                      <>
                        <div className="text-[13px] text-zinc-600 mt-1">Expected: <span className="font-medium text-emerald-700">{q.typedAnswer || (q.options ? q.options[q.a] : '')}</span></div>
                        <div className={`text-[13px] mt-0.5 ${ok ? 'text-slate-600' : 'text-rose-600'}`}>Your answer: {given || <span className="italic text-slate-400">(blank)</span>}</div>
                      </>
                    )}
                    {isExam && (
                      <>
                        {(q.examKeywords || []).length > 0 && (
                          <div className="text-[13px] text-zinc-600 mt-1">Key ideas: <span className="font-medium text-slate-800">{(q.examKeywords || []).join(', ')}</span></div>
                        )}
                        {q.examAnswer && (
                          <div className="text-[13px] text-zinc-600 mt-0.5">Model answer: <span className="font-medium text-slate-800">{q.examAnswer}</span></div>
                        )}
                        <div className={`text-[13px] mt-0.5 whitespace-pre-wrap ${ok ? 'text-slate-600' : 'text-rose-600'}`}>Your answer: {given || <span className="italic text-slate-400">(blank)</span>}</div>
                      </>
                    )}
                    {isDrawing && (
                      <div className="text-[13px] text-zinc-600 mt-1">{q.examAnswer ? <>Expected: <span className="font-medium text-slate-800">{q.examAnswer}</span></> : 'Drawn answer — marked against the scheme.'}</div>
                    )}
                    {Array.isArray(q.markScheme) && q.markScheme.length > 0 && (
                      <div className="text-[12.5px] text-slate-600 mt-1.5 rounded-lg bg-slate-50 border border-[color:var(--color-border)] px-3 py-2">
                        <div className="text-[10.5px] uppercase tracking-wide text-slate-500 mb-1 inline-flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Marking scheme</div>
                        <ul className="list-disc pl-4 space-y-0.5">{q.markScheme.map((pt, k) => <li key={k}><span className="font-semibold">{pt.marks || 1}</span> — {pt.point}</li>)}</ul>
                      </div>
                    )}
                    {(w?.images?.length || w?.transcript) && (
                      <div className="mt-2">
                        <WorkingCapture value={w} onChange={() => {}} question={q} readOnly required={isDrawing} testid={`result-working-${i}`} />
                      </div>
                    )}
                    {(result.marking?.[i] || (!isMCQ && Array.isArray(q.markScheme) && q.markScheme.length > 0)) && (
                      <AiMarkRow sheet={result} idx={i} q={q} given={given} working={w} board={boardForSubject} subject={subject} enabled={aiOn} onMarked={(m) => { const live = (state.worksheets || []).find((x) => x.id === result.id) || result; updateWorksheet(result.id, { marking: { ...(live.marking || {}), [i]: m } }); }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <AdSlot slot="worksheet-result" className="mt-6" />

        <div className="flex gap-3 mt-6">
          <CreateWorksheetButton onClick={() => { setStage('build'); setResult(null); }} />
          <button onClick={() => go('dashboard')} className="btn-outline-dark px-4 py-2 rounded-lg text-[14px] font-medium">Back to dashboard</button>
        </div>
      </div>
    );
  }

  /* ================== Build stage ================== */
  const isDurationDefault = duration === examMinutes;

  return (
    <div className="max-w-[820px]">
      <p className="text-[14px] text-zinc-500 mb-6">Create targeted practice. Choose a subject you&apos;re studying, pick one or more topics, and dial in the format.</p>
      <div className="rounded-2xl border border-zinc-200 p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Subject">
            <select className="input-base" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="ws-subject">
              {chosenSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasCourses && (
              <div className="text-[11px] text-slate-500 mt-1">Showing the subjects from your courses.</div>
            )}
            {chosenSubjects.length === 0 && (
              <button type="button" onClick={() => go('courses')} className="text-[12px] text-blue-700 hover:text-blue-900 mt-1 text-left" data-testid="ws-add-course-hint">
                No subjects yet — add a course to choose from its subjects &rarr;
              </button>
            )}
          </Field>
          <Field label="Answer type">
            <Segmented value={answerType} onChange={setAnswerType} options={ANSWER_TYPES} />
          </Field>
        </div>

        <Field label={`Topics (${topics.length} selected)`}>
          {topicsList.length === 0 ? (
            <div className="text-[13px] text-slate-500 italic">No topics available for this subject yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="ws-topics">
              {topicsList.map((t) => {
                const sel = topics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium border transition-colors ${sel ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                  >
                    {sel && <Check className="w-4 h-4" />}
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Difficulty">
          <Segmented value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
        </Field>

        <Field label={`Duration · ${fmtDuration(duration)}${isDurationDefault ? ' (real exam length)' : ''}`}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={DURATION_MIN}
              max={DURATION_MAX}
              step={DURATION_STEP}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-600"
              data-testid="ws-duration"
            />
            <button
              type="button"
              onClick={() => setDuration(examMinutes)}
              className="text-[11.5px] font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap"
              title="Reset to real exam length"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{fmtDuration(DURATION_MIN)}</span>
            <span>{fmtDuration(DURATION_MAX)}</span>
          </div>
        </Field>

        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-zinc-500 mb-2">Question source</div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <CheckboxCard
              label={<span>Past paper questions <span className="text-slate-500 font-normal">({ppAvailable} available)</span></span>}
              icon={<FileText className="w-5 h-5 text-slate-600" />}
              checked={pastPapers}
              onChange={setPastPapers}
              testid="ws-past-papers"
            />
            <CheckboxCard
              label={<>&#x2728; AI generated questions</>}
              icon={<Sparkles className="w-5 h-5 text-blue-700" />}
              checked={aiGenerated}
              onChange={setAiGenerated}
              testid="ws-ai-generated"
            />
          </div>
          {pastPapers && ppAvailable === 0 && (
            <div className="text-[11.5px] text-amber-700 mt-2 inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> No past-paper questions match this subject / topic / answer type. Uploads live on the Admin page.</div>
          )}
          {!pastPapers && !aiGenerated && (
            <div className="text-[11.5px] text-rose-600 mt-2">Pick at least one question source.</div>
          )}
          {reviewsDue.length > 0 && (
            <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5 cursor-pointer" data-testid="ws-include-reviews">
              <input type="checkbox" className="mt-0.5" checked={includeReviews} onChange={(e) => setIncludeReviews(e.target.checked)} />
              <span className="text-[12.5px] text-slate-700">
                <span className="font-semibold text-violet-800 inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> {reviewsDue.length} question{reviewsDue.length === 1 ? '' : 's'} due for review</span>
                <span className="block text-slate-500">Questions you missed before come back after 1, 3, 7 and 14 days until you get them right each time. They take up to half the sheet.</span>
              </span>
            </label>
          )}
        </div>

        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-zinc-500 mb-2">Mode</div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <CheckboxCard
              label={<span>Exam mode <span className="text-slate-500 font-normal">— fullscreen, locked until submitted</span></span>}
              icon={<Lock className="w-5 h-5 text-rose-600" />}
              checked={examMode}
              onChange={setExamMode}
              testid="ws-exam-mode"
            />
            <CheckboxCard
              label={<span>Pace coach <span className="text-slate-500 font-normal">— a time budget per question</span></span>}
              icon={<Gauge className="w-5 h-5 text-amber-600" />}
              checked={paceCoach}
              onChange={setPaceCoach}
              testid="ws-pace-coach"
            />
          </div>
          {examMode && <div className="text-[11.5px] text-slate-500 mt-2">The sheet takes over the whole screen, Save &amp; exit is disabled and leaving fullscreen is logged as a violation. Just like the real thing.</div>}
        </div>
      </div>

      <AdSlot slot="worksheet-builder" size="compact" className="mt-5" />

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={start} disabled={generating} data-testid="ws-start" className="btn-violet inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium disabled:opacity-70">
          {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Writing original questions…</> : 'Create interactive worksheet'}
        </button>
        <button
          onClick={downloadPDF}
          disabled={generating}
          data-testid="ws-download-pdf"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium bg-white text-slate-800 border border-slate-300 hover:border-blue-500 hover:text-blue-700 transition-colors disabled:opacity-70"
        >
          <Download className="w-5 h-5" /> Download as PDF
        </button>
      </div>
      {aiGenerated && aiOn && (
        <div className="text-[11.5px] text-slate-500 mt-2 inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI questions are written fresh for this sheet — original, in-syllabus, in {boardForSubject} style — not picked from a bank.</div>
      )}

      {paper && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5" data-testid="paper-session">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0"><Printer className="w-5 h-5" /></span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900">Printed worksheet · {paper.subject}</div>
                <div className="text-[12.5px] text-slate-600 mt-0.5">{paper.questions.length} questions · {paper.topics.join(', ')} · {fmtDuration(paper.duration)}. Do it on paper, then scan or upload your answers and the AI marks them.</div>
              </div>
            </div>
            <button onClick={discardPaper} className="text-slate-400 hover:text-rose-600" title="Discard this paper session" data-testid="paper-discard"><Trash2 className="w-4 h-4" /></button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!paper.startedAt ? (
              <button onClick={startPaperTimer} className="btn-violet inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-semibold" data-testid="paper-start">
                <Play className="w-4 h-4" /> Start timer ({fmtDuration(paper.duration)})
              </button>
            ) : (
              <div className={`inline-flex items-center gap-2 text-[15px] font-semibold tabular-nums px-3.5 py-2 rounded-lg ${paperLeftSec === 0 ? 'bg-rose-100 text-rose-800' : 'bg-white border border-[color:var(--color-border)] text-slate-900'}`} data-testid="paper-timer">
                <Clock className="w-4 h-4" /> {paperLeftSec === 0 ? `Time's up · took ${fmtTime(paperElapsedSec)}` : `${fmtTime(paperLeftSec)} left`}
              </div>
            )}
            <label className="btn-outline-dark inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-medium cursor-pointer">
              <Upload className="w-4 h-4" /> Scan / upload answers
              <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { addPaperFiles(e.target.files); e.target.value = ''; }} data-testid="paper-files" />
            </label>
            <button onClick={submitPaper} disabled={assessing || !paperFiles.length} className="btn-violet inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-semibold disabled:opacity-50" data-testid="paper-submit">
              {assessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : <><ClipboardCheck className="w-4 h-4" /> Submit for marking</>}
            </button>
          </div>
          {paperFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" data-testid="paper-file-list">
              {paperFiles.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[color:var(--color-border)] text-[12px] text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> {f.name}
                  <button onClick={() => setPaperFiles((prev) => prev.filter((_, k) => k !== i))} className="text-slate-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
          )}
          {!paper.startedAt && <div className="text-[11.5px] text-slate-500 mt-2">Start the timer when you begin writing; the time taken is recorded with the result. You can still submit without it.</div>}
          <AdSlot slot="worksheet-download" size="compact" className="mt-4" />
        </div>
      )}
    </div>
  );
}

// "Mark against scheme" — asks the AI examiner for marks + feedback on one
// answer and saves it onto the worksheet.
function AiMarkRow({ sheet, idx, q, given, working, board, subject, enabled, onMarked }) {
  const { state } = useApp();
  const live = (state.worksheets || []).find((w) => w.id === sheet.id) || sheet;
  const saved = live.marking?.[idx];
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const m = await markAgainstScheme({ q, given, working, board, subject });
      onMarked({ ...m, at: new Date().toISOString() });
    } catch (e) {
      toast.error(e.message || 'Could not mark this answer');
    } finally { setBusy(false); }
  };
  if (!enabled && !saved) return null;
  return (
    <div className="mt-2">
      {saved ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12.5px] text-slate-700">
          <div className="font-semibold text-emerald-800">{saved.marks} / {saved.max} marks <span className="font-normal text-slate-500">· AI examiner</span></div>
          <div className="mt-0.5">{saved.feedback}</div>
          <button onClick={run} disabled={busy} className="mt-1 text-[11.5px] text-slate-500 hover:text-slate-800">Re-mark</button>
        </div>
      ) : (
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-60" data-testid={`mark-${idx}`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />} Mark against the scheme{markSchemeText(q.markScheme) ? '' : ' (model answer)'}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, onChange, options, format }) {
  return (
    <div className="inline-flex flex-wrap gap-1 p-1 bg-zinc-100 rounded-lg">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${value === o ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>{format ? format(o) : o}</button>
      ))}
    </div>
  );
}

function CheckboxCard({ label, icon, checked, onChange, testid }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid={testid}
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-[13px] font-medium transition-colors flex-1 min-w-0 ${checked ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
        {checked && <Check className="w-4 h-4" />}
      </span>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
