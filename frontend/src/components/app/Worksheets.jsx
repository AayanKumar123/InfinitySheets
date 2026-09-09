import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TOPICS, QUESTION_BANK, FALLBACK_QUESTIONS, EXAM_DURATIONS } from '../../data/mock';
import { enrolledSubjects } from '../../lib/subjects';
import { Check, X, Clock, ChevronLeft, ChevronRight, Sparkles, FileText, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import CreateWorksheetButton from './CreateWorksheetButton';
import DiagnosisPanel from './ai/DiagnosisPanel';

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

function buildQuestions({ topics, answerType, difficulty, length, pastPapers, aiGenerated, pastPaperPool }) {
  const list = (topics && topics.length) ? topics : [];
  // Past-paper questions matching selected topics + answer type.
  const ppMatching = (pastPaperPool || []).filter((p) => list.includes(p.topic) && p.answerType === answerType);
  // Filter by difficulty if it matches; otherwise still include.
  const preferPP = pastPapers && ppMatching.length > 0;
  const preferAI = !!aiGenerated;

  const aiPool = () => {
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

  const out = [];
  for (let i = 0; i < length; i++) {
    let picked = null;
    if (preferPP && preferAI) {
      picked = (i % 2 === 0) ? ppPool(Math.floor(i / 2)) : aiPool();
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
  const { state, recordWorksheet, saveDraftWorksheet, clearDraftWorksheet } = useApp();
  const track = state.user?.examTrack || 'SSLC';
  const examMinutes = EXAM_DURATIONS[track] || 60;

  // Only past-paper questions from the learner's own exam-track. Uploads
  // without a board attached remain visible to everyone.
  const pastPaperPool = useMemo(() => {
    return (state.pastPapers || []).filter((p) => !p.board || p.board === track);
  }, [state.pastPapers, track]);

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
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState(examMinutes);
  const [pastPapers, setPastPapers] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(true);

  const [stage, setStage] = useState('build');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // holds number (MCQ index) or string (typed/exam)
  const [current, setCurrent] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);

  // --- In-progress draft plumbing ------------------------------------------
  const draftIdRef = useRef(null);
  const skipTopicResetRef = useRef(false);
  // Always-fresh snapshot of the take-stage state for saving on navigate-away.
  const liveRef = useRef({});
  liveRef.current = { stage, subject, topics, answerType, difficulty, duration, questions, answers, current, timeLeft, pastPapers, aiGenerated };
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
      setCurrent(d.current || 0);
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

  const toggleTopic = (t) => {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  // Count of admin-uploaded past-paper questions matching current filters.
  const ppAvailable = useMemo(() => {
    return (pastPaperPool || []).filter((p) => topics.includes(p.topic) && p.answerType === answerType).length;
  }, [pastPaperPool, topics, answerType]);

  const start = () => {
    if (!subject) { toast.error('Select a subject'); return; }
    if (!topics.length) { toast.error('Select at least one topic'); return; }
    if (!pastPapers && !aiGenerated) { toast.error('Pick past papers, AI generated, or both'); return; }
    if (pastPapers && !aiGenerated && ppAvailable === 0) {
      toast.error('No past-paper questions match this selection. Ask an admin to upload some, or also tick AI generated.');
      return;
    }
    const length = Math.max(3, Math.min(30, Math.round(duration / 3)));
    const qs = buildQuestions({ topics, answerType, difficulty, length, pastPapers, aiGenerated, pastPaperPool });
    draftIdRef.current = `draft_${Date.now()}`;
    setQuestions(qs);
    // For MCQ, -1 means unanswered. For typed/exam, empty string.
    setAnswers(new Array(qs.length).fill(answerType === 'Multiple choice' ? -1 : ''));
    setCurrent(0);
    setStartTime(Date.now());
    setTimeLeft(duration * 60);
    setStage('take');
  };

  // Same validation + question build as `start`, but instead of entering
  // the interactive stage, this hands the questions to jsPDF and downloads
  // the printable worksheet + answer key. No progress is recorded.
  const downloadPDF = () => {
    if (!subject) { toast.error('Select a subject'); return; }
    if (!topics.length) { toast.error('Select at least one topic'); return; }
    if (!pastPapers && !aiGenerated) { toast.error('Pick past papers, AI generated, or both'); return; }
    if (pastPapers && !aiGenerated && ppAvailable === 0) {
      toast.error('No past-paper questions match this selection. Ask an admin to upload some, or also tick AI generated.');
      return;
    }
    const length = Math.max(3, Math.min(30, Math.round(duration / 3)));
    const qs = buildQuestions({ topics, answerType, difficulty, length, pastPapers, aiGenerated, pastPaperPool });
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PDF export failed', err);
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  const gradeOne = (q, given) => {
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
    const results = questions.map((q, i) => gradeOne(q, answers[i]));
    const correct = results.filter(Boolean).length;
    const durationSec = Math.round((Date.now() - startTime) / 1000);
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
      results,
      total: questions.length,
      correct,
      score: Math.round((correct / questions.length) * 100),
      durationSec,
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
    setAnswers((prev) => {
      const c = [...prev];
      c[idx] = value;
      return c;
    });
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
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (current < questions.length - 1) setCurrent((c) => c + 1);
        else finalize();
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
    return (
      <div className="max-w-[820px]">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[13px] text-zinc-500">{subject} · {topics.join(' · ')}</div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 text-[13px] text-zinc-700 bg-blue-50 px-3 py-1.5 rounded-md">
              <Clock className="w-4 h-4" /> {fmtTime(timeLeft)}
            </div>
            <button
              onClick={() => { saveDraftWorksheet(makeDraft(liveRef.current)); toast.success('Progress saved — resume it anytime'); go('dashboard'); }}
              data-testid="ws-save-exit"
              className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium"
            >
              <X className="w-4 h-4" /> Save &amp; exit
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-6">
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

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="btn-outline-dark inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] disabled:opacity-40">
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium">
                Next <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={finalize} className="btn-violet inline-flex items-center px-5 py-2 rounded-lg text-[13.5px] font-medium">Submit worksheet</button>
            )}
          </div>
        </div>
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
        <div className="flex flex-col gap-3">
          {result.questions.map((q, i) => {
            const ok = result.results ? result.results[i] : (result.answers[i] === q.a);
            const isMCQ = q.answerType === 'Multiple choice';
            const isTyped = q.answerType === 'Typed response';
            const isExam = q.answerType === 'Exam style';
            const given = result.answers[i];
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
                          <div className="text-[13px] text-rose-600 mt-0.5">Your answer: {q.options[given]}</div>
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={start} data-testid="ws-start" className="btn-violet px-5 py-3 rounded-lg text-[14px] font-medium">Create interactive worksheet</button>
        <button
          onClick={downloadPDF}
          data-testid="ws-download-pdf"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium bg-white text-slate-800 border border-slate-300 hover:border-blue-500 hover:text-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" /> Download as PDF
        </button>
      </div>
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
