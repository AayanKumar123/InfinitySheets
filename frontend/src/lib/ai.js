// Client for the `ai-chat` Supabase Edge Function (supabase/functions/ai-chat).
// The Gemini key never reaches the browser — the function holds it as a secret.
import { supabase, isSupabaseConfigured } from './supabase';
import { analyticsForPrompt } from './worksheetAnalytics';
import { dataUrlParts } from './images';
import { snapTopic, guessTopicFromText } from './topicSnap';

export const AI_FUNCTION = 'ai-chat';

// One switch in Settings turns every assistant off (topic pages, recommendations).
export function isAiEnabled(state) {
  return state?.settings?.aiEnabled !== false;
}

async function readErrorMessage(error) {
  // FunctionsHttpError carries the Response in `context`; surface the
  // function's own { error } message when there is one.
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch (e) { /* fall through */ }
  return error?.message || 'The AI could not answer right now.';
}

/**
 * Ask the assistant. `messages` is [{ role: 'user' | 'assistant', content }].
 * Resolves to the reply text; throws an Error with a readable message.
 */
export async function askAi({ mode = 'chat', context = {}, messages = [], force = false, images = [], files = [] }) {
  if (!isSupabaseConfigured) {
    throw new Error('AI needs the Supabase connection (set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY).');
  }
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, {
    body: { mode, context, force, files: [...(files || []), ...(images || [])].map(({ mimeType, data, label }) => ({ mimeType, data, label })), messages: messages.map((m) => ({ role: m.role, content: m.content })) },
  });
  if (error) throw new Error(await readErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data?.text || '';
}

// Topic overviews are deterministic enough to cache for the session — saves
// free-tier quota when a student flips between topics.
export async function topicOverview(context, { force = false } = {}) {
  // Two layers. sessionStorage saves a round-trip while a student clicks
  // between topics; the server-side cache (public.topic_overviews) is the one
  // that matters — it is shared by every student, so a topic costs one Gemini
  // call for all time rather than one per visit. `force` skips both.
  const key = `ai_overview:v2:${context.board}:${context.subject}:${context.topic}:${context.ibLevel || ''}`;
  if (!force) {
    try { const cached = sessionStorage.getItem(key); if (cached) return cached; } catch (e) { /* ignore */ }
  }
  const text = await askAi({ mode: 'overview', context, force });
  try { sessionStorage.setItem(key, text); } catch (e) { /* ignore */ }
  return text;
}

// Summarise a finished worksheet for the diagnosis prompt: every question,
// the accepted answer and what the student put. Wrong answers always go in;
// correct ones are trimmed on very long sheets to keep the request small.
function describeQuestion(q, given, ok, n, working) {
  const type = q.answerType || 'Multiple choice';
  let expected = '';
  let student = '';
  if (type === 'Multiple choice' && Array.isArray(q.options)) {
    expected = q.options[q.a];
    student = typeof given === 'number' && given >= 0 ? q.options[given] : '(no answer)';
  } else if (type === 'Typed response') {
    expected = q.typedAnswer || (q.options ? q.options[q.a] : '');
    student = given ? String(given) : '(blank)';
  } else if (type === 'Drawing') {
    expected = q.examAnswer || '(a drawing / diagram, marked against the scheme)';
    student = '(see working below)';
  } else {
    expected = q.examAnswer || (q.examKeywords || []).join(', ') || '(marked on key ideas)';
    student = given ? String(given) : '(blank)';
  }
  const clip = (t, n2) => (String(t).length > n2 ? `${String(t).slice(0, n2)}…` : String(t));
  const scheme = markSchemeText(q.markScheme);
  const w = working && (working.transcript || (working.images || []).length)
    ? `\n   Working (transcribed from the student's photo): ${working.transcript ? clip(working.transcript, 900) : '(photo attached, not transcribed)'}`
    : '';
  return `${n}. [${ok ? 'correct' : 'WRONG'}] ${clip(q.q, 260)}\n   Accepted: ${clip(expected, 200)}${scheme ? `\n   Mark scheme: ${clip(scheme, 400)}` : ''}\n   Student: ${clip(student, 300)}${w}`;
}

// "2 marks: correct substitution; 1 mark: final answer with units"
export function markSchemeText(scheme) {
  if (!Array.isArray(scheme) || !scheme.length) return '';
  return scheme.map((p) => `${p.marks || 1} mark${(p.marks || 1) === 1 ? '' : 's'}: ${p.point}`).join('; ');
}

export async function diagnoseWorksheet(sheet, { board, ibLevel } = {}) {
  const qs = sheet.questions || [];
  const results = sheet.results || qs.map((q, i) => (sheet.answers || [])[i] === q.a);
  const lines = [];
  let keptCorrect = 0;
  qs.forEach((q, i) => {
    const ok = !!results[i];
    if (ok && qs.length > 25 && keptCorrect >= 8) return;
    if (ok) keptCorrect += 1;
    lines.push(describeQuestion(q, (sheet.answers || [])[i], ok, i + 1, (sheet.working || [])[i]));
  });
  const mins = Math.floor((sheet.durationSec || 0) / 60);
  const secs = (sheet.durationSec || 0) % 60;
  const timing = analyticsForPrompt(sheet.analytics);
  const content = [
    `Worksheet just completed by the student.`,
    `Board: ${board || sheet.board || 'unknown'}${ibLevel ? ` (${ibLevel})` : ''}. Subject: ${sheet.subject}. Topics: ${sheet.topic}.`,
    `Difficulty: ${sheet.difficulty}. Answer type: ${sheet.answerType}. Score: ${sheet.score}% (${sheet.correct}/${sheet.total}). Time taken: ${mins}m ${secs}s.`,
    '',
    'Questions:',
    ...lines,
  ].join('\n');
  return askAi({
    mode: 'diagnose',
    context: { board, ibLevel, subject: sheet.subject, topic: sheet.topic },
    messages: [{ role: 'user', content }],
  });
}

/**
 * Transcribe photographed handwritten working. `images` are data URLs.
 * Resolves to plain text; unreadable bits are marked [unclear].
 */
export async function transcribeWorking({ images, question, subject, board }) {
  const parts = images.map(dataUrlParts).filter(Boolean);
  if (!parts.length) throw new Error('No photo to transcribe');
  return askAi({
    mode: 'transcribe',
    context: { subject, board },
    files: parts,
    messages: [{ role: 'user', content: `Question the student was answering: ${question || '(not given)'}` }],
  });
}

/**
 * Mark one answer against its marking scheme. Resolves to
 * { marks, max, feedback } — parsed from the model's JSON reply.
 */
export async function markAgainstScheme({ q, given, working, board, subject }) {
  const scheme = markSchemeText(q.markScheme);
  const max = (q.markScheme || []).reduce((s, p) => s + (Number(p.marks) || 1), 0) || q.marks || 1;
  const student = q.answerType === 'Multiple choice' && Array.isArray(q.options)
    ? (typeof given === 'number' && given >= 0 ? q.options[given] : '(no answer)')
    : (given ? String(given) : '(no typed answer)');
  const content = [
    `Question: ${q.q}`,
    q.examAnswer ? `Model answer: ${q.examAnswer}` : '',
    `Marking scheme (total ${max}): ${scheme || '(none — use the model answer)'}`,
    `Student's typed answer: ${student}`,
    working?.transcript ? `Student's working (transcribed from photo): ${working.transcript}` : '',
    '',
    `Reply with JSON only: {"marks": <number 0-${max}>, "max": ${max}, "feedback": "<2-4 sentences: which scheme points were earned, which were missed and why>"}`,
  ].filter(Boolean).join('\n');
  const text = await askAi({ mode: 'mark', context: { board, subject, topic: q._topic || q.topic }, messages: [{ role: 'user', content }] });
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) throw new Error('The marker did not return a result');
  const parsed = JSON.parse(m[0]);
  const marks = Math.max(0, Math.min(max, Number(parsed.marks) || 0));
  return { marks, max, feedback: String(parsed.feedback || '').trim() };
}

// Pull the JSON object out of a model reply (tolerates ```json fences).
function parseJsonReply(text) {
  const m = /\{[\s\S]*\}/.exec(text || '');
  if (!m) throw new Error('The AI did not return a usable result');
  try { return JSON.parse(m[0]); } catch (_) { /* repair below */ }
  // Common slips: unquoted keys, trailing commas.
  const repaired = m[0]
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(repaired);
}

const QUESTION_SHAPE = 'Write all maths and science in textbook Unicode notation: 3², x⁻¹, 10⁻³, √2, ×, ÷, ≤, ≥, ±, π, θ, H₂O, m/s² — never ^, sqrt(), *, or LaTeX. Each question object: {"q": string, "topic": one of the given topics, "answerType": "Multiple choice" | "Typed response" | "Exam style", "marks": integer, "options": [4 strings, MCQ only], "a": index of the correct option (MCQ only), "typedAnswer": string (typed only), "typedAliases": [strings] (typed only), "examAnswer": model answer (exam style), "examKeywords": [3-6 key ideas] (exam style), "markScheme": [{"point": string, "marks": integer}]}';

// Normalise whatever the model returns into the shape the worksheet uses.
const DIFFICULTIES = ['Easy', 'Medium', 'Exam level', 'Hard'];

export function shapeQuestion(raw, { answerType, difficulty, topics = [], subject, strict = false } = {}) {
  if (!raw || !raw.q) return null;
  const type = ['Multiple choice', 'Typed response', 'Exam style', 'Drawing'].includes(raw.answerType) ? raw.answerType : answerType;
  // Snap the label onto a canonical topic (exact → keyword → fuzzy); when the
  // model gave none, try to read one off the question text.
  const proposed = raw.topic || guessTopicFromText(subject, raw.q, topics);
  const topic = snapTopic(subject, proposed, { allowed: topics, fallback: topics[0] });
  const q = {
    q: String(raw.q).trim(),
    _topic: topic,
    topic,
    answerType: type,
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : difficulty,
    marks: Number(raw.marks) || undefined,
    markScheme: Array.isArray(raw.markScheme) ? raw.markScheme.filter((p) => p && p.point).map((p) => ({ point: String(p.point), marks: Math.max(1, parseInt(p.marks, 10) || 1) })) : undefined,
  };
  if (type === 'Multiple choice') {
    const opts = Array.isArray(raw.options) ? raw.options.map((o) => String(o)).filter(Boolean) : [];
    if (opts.length < 2) return null;
    q.options = opts;
    const hasAnswer = Number.isInteger(raw.a) && raw.a >= 0 && raw.a < opts.length;
    // Imported papers: an MCQ whose correct option is not known is dropped
    // rather than silently marked "A" — the grader would mark at random.
    if (!hasAnswer && strict) return null;
    q.a = hasAnswer ? raw.a : 0;
  } else if (type === 'Typed response') {
    q.typedAnswer = String(raw.typedAnswer || raw.answer || '').trim();
    q.typedAliases = Array.isArray(raw.typedAliases) ? raw.typedAliases.map(String) : [];
    if (!q.typedAnswer) return null;
  } else {
    q.examAnswer = String(raw.examAnswer || raw.answer || '').trim();
    q.examKeywords = Array.isArray(raw.examKeywords) ? raw.examKeywords.map(String).filter(Boolean) : [];
  }
  return q;
}

/**
 * Original, in-syllabus questions written by the AI. Resolves to an array of
 * shaped questions (source: 'ai-generated').
 */
export async function generateQuestions({ board, ibLevel, subject, topics, answerType, difficulty, count }) {
  const n = Math.max(1, Math.min(30, count || 5));
  const content = [
    `Write ${n} original ${answerType} questions for ${subject} (${board}${ibLevel ? ` ${ibLevel}` : ''}) at ${difficulty} difficulty.`,
    `Topics to cover (spread the questions across them, each tagged with exactly one): ${topics.join('; ')}.`,
    'They must be brand-new questions in the exact style this exam uses. Never reproduce a past-paper question; vary the contexts and numbers. Every question needs a correct answer and a marking scheme.',
    `Reply as {"questions": [...]}. ${QUESTION_SHAPE}. Use "answerType": "${answerType}" for every question.`,
  ].join('\n');
  const text = await askAi({ mode: 'generate', context: { board, ibLevel, subject, topic: topics.join(', ') }, messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  const list = (parsed.questions || []).map((r) => shapeQuestion(r, { answerType, difficulty, topics, subject })).filter(Boolean);
  if (!list.length) throw new Error('The AI returned no usable questions');
  return list.map((q) => ({ ...q, source: 'ai-generated' }));
}

/**
 * Admin bulk import: a question-paper PDF (plus an optional mark-scheme PDF)
 * → drafts with answers and marking schemes filled in.
 */
export async function extractFromPdf({ paper, scheme, board, subject, topics = [] }) {
  const files = [{ ...paper, label: 'QUESTION PAPER' }];
  if (scheme) files.push({ ...scheme, label: 'MARK SCHEME' });
  const content = [
    `Extract every question from the QUESTION PAPER for ${subject} (${board}).`,
    scheme
      ? 'A MARK SCHEME is attached: take the accepted answer and the mark points for each question from it, matched by question number.'
      : 'No mark scheme is attached: give the correct answer and write a sensible examiner-style marking scheme for each question.',
    `Tag each question with the closest topic from: ${topics.join('; ') || '(free choice)'}.`,
    'Choose "Multiple choice" only when the paper prints options; short numeric / one-line answers are "Typed response"; anything needing explanation or working is "Exam style". Keep sub-parts (a), (b) as separate questions with the stem repeated.',
    'Put the question stem in "q" without the question number and without repeating the options (options go in "options" only). For MCQs set "a" only when the correct option is printed, given in the mark scheme, or unambiguous — otherwise set "a" to null; never guess. Only include questions that are clearly complete: skip cover pages, instructions, diagram-only questions and answer-key commentary. Never invent options or answers you cannot see.',
    `Reply as {"questions": [...]}. ${QUESTION_SHAPE}. Include "year" if it is printed on the paper.`,
  ].join('\n');
  const text = await askAi({ mode: 'extract', context: { board, subject }, files, messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  return (parsed.questions || []).map((r) => {
    const q = shapeQuestion(r, { answerType: 'Exam style', difficulty: 'Medium', topics, subject, strict: true });
    return q ? { ...q, year: Number(r.year) || undefined } : null;
  }).filter(Boolean);
}

/**
 * Paper worksheet: the student answered a printed sheet and uploaded photos /
 * a PDF. Resolves to per-question results:
 *   [{ i, answer, working, correct, marks, max, feedback }]
 */
export async function assessPaper({ questions, files, board, subject }) {
  const maxOf = (q) => (q.markScheme || []).reduce((s, p) => s + (Number(p.marks) || 1), 0) || q.marks || 1;
  const lines = questions.map((q, i) => {
    let accepted = '';
    if (q.answerType === 'Multiple choice') accepted = `options ${q.options.map((o, k) => `${String.fromCharCode(65 + k)}. ${o}`).join(' | ')}; correct: ${String.fromCharCode(65 + q.a)}`;
    else if (q.answerType === 'Typed response') accepted = `accepted: ${q.typedAnswer}${(q.typedAliases || []).length ? ` (also ${q.typedAliases.join(', ')})` : ''}`;
    else accepted = `model answer: ${q.examAnswer || '(use the scheme)'}${(q.examKeywords || []).length ? `; key ideas: ${q.examKeywords.join(', ')}` : ''}`;
    const scheme = markSchemeText(q.markScheme);
    const max = maxOf(q);
    return `Q${i + 1} [${max} mark${max === 1 ? '' : 's'}]: ${q.q}\n   ${accepted}${scheme ? `\n   mark scheme: ${scheme}` : ''}`;
  });
  const content = [
    `The printed worksheet had these ${questions.length} questions:`,
    ...lines,
    '',
    'Read the uploaded answers. For every question return: the answer the student gave (or "" if not attempted), a one-line transcription of their working, whether it is correct, marks awarded out of the maximum, and 1-2 sentences of feedback.',
    'Reply as {"results": [{"i": question number starting at 1, "answer": string, "working": string, "correct": boolean, "marks": number, "max": number, "feedback": string}]}.',
  ].join('\n');
  const text = await askAi({ mode: 'assess', context: { board, subject }, files, messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  const byIndex = new Map((parsed.results || []).map((r) => [Number(r.i) - 1, r]));
  return questions.map((q, i) => {
    const r = byIndex.get(i) || {};
    const max = maxOf(q);
    return {
      i,
      answer: r.answer == null ? '' : String(r.answer),
      working: r.working ? String(r.working) : '',
      correct: !!r.correct,
      marks: Math.max(0, Math.min(max, Number(r.marks) || 0)),
      max,
      feedback: r.feedback ? String(r.feedback) : '',
    };
  });
}

/**
 * Worked model solution for one question the student got wrong. Resolves to
 * Markdown text (Step 1 … Answer … Where you slipped).
 */
export async function workedSolution({ q, given, board, ibLevel, subject }) {
  const type = q.answerType || 'Multiple choice';
  let accepted = '';
  let student = '';
  if (type === 'Multiple choice' && Array.isArray(q.options)) {
    accepted = q.options[q.a];
    student = typeof given === 'number' && given >= 0 ? q.options[given] : '(no answer)';
  } else if (type === 'Typed response') {
    accepted = q.typedAnswer || '';
    student = given ? String(given) : '(blank)';
  } else {
    accepted = q.examAnswer || (q.examKeywords || []).join(', ');
    student = given ? String(given) : '(blank)';
  }
  const content = [
    `Question: ${q.q}`,
    accepted ? `Correct answer: ${accepted}` : '',
    markSchemeText(q.markScheme) ? `Mark scheme: ${markSchemeText(q.markScheme)}` : '',
    `Student's answer: ${student}`,
  ].filter(Boolean).join('\n');
  return askAi({ mode: 'solution', context: { board, ibLevel, subject, topic: q._topic || q.topic }, messages: [{ role: 'user', content }] });
}

/**
 * A week-long study plan from the student's data. Resolves to
 * { summary, days: [{ day, date, tasks: [{ subject, topic, minutes, what }] }] }.
 */
export async function buildStudyPlan({ board, boards = {}, examDate, frequency, weeklyGoal, weakTopics, subjects, startDate }) {
  const content = [
    Object.keys(boards).length ? `Board per subject: ${Object.entries(boards).map(([s, b]) => `${s} (${b.board}${b.ibLevel ? ' ' + b.ibLevel : ''})`).join(', ')}.` : '',
    `Today is ${startDate}. Exam date: ${examDate || 'not set'}. Study frequency the student chose: ${frequency || '3-4 per week'}. Weekly question goal: ${weeklyGoal || 50}.`,
    `Subjects: ${(subjects || []).join(', ') || '(none yet)'}.`,
    `Weakest topics (subject · topic · accuracy%): ${(weakTopics || []).map((t) => `${t.subject} · ${t.topic} · ${t.accuracy}%`).join('; ') || '(no data yet — spread evenly)'}.`,
    'Plan the next 7 days starting today.',
  ].filter(Boolean).join('\n');
  const text = await askAi({ mode: 'plan', context: { board }, messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  const days = (parsed.days || []).slice(0, 7).map((d) => ({
    day: String(d.day || ''),
    date: String(d.date || ''),
    tasks: (d.tasks || []).slice(0, 3).map((t) => ({ subject: String(t.subject || ''), topic: String(t.topic || ''), minutes: Math.max(5, Math.min(180, Number(t.minutes) || 20)), what: String(t.what || '') })),
  })).filter((d) => d.tasks.length);
  if (!days.length) throw new Error('The AI returned an empty plan');
  return { summary: String(parsed.summary || ''), days };
}

/**
 * Admin: read a syllabus PDF and list its topics. Resolves to
 * [{ name, summary }].
 */
export async function extractSyllabusTopics({ file, board, subject }) {
  const content = `List the topics in this ${subject} syllabus for ${board}.`;
  const text = await askAi({ mode: 'syllabus', context: { board, subject }, files: [{ ...file, label: 'SYLLABUS' }], messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  const seen = new Set();
  return (parsed.topics || []).map((t) => ({ name: String(t.name || '').trim().slice(0, 80), summary: String(t.summary || '').trim().slice(0, 240) }))
    .filter((t) => t.name && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase()));
}

/**
 * Concept flashcards for one topic, SaveMyExams-style: a term / question on
 * the front, a short exact answer on the back. Resolves to [{ front, back }].
 */
export async function generateFlashcards({ board, subject, topic, count = 12 }) {
  const content = `Write ${count} revision flashcards for the topic "${topic}" in ${subject} (${board}). Cover the definitions, formulas, laws, key facts and common exam traps a student must know for this topic — not practice questions. Front: one term, question or prompt (under 20 words). Back: the exact answer or definition in the words the mark scheme rewards (under 40 words, textbook Unicode notation). Reply as {"cards": [{"front": string, "back": string}]}.`;
  const text = await askAi({ mode: 'flashcards', context: { board, subject, topic }, messages: [{ role: 'user', content }] });
  const parsed = parseJsonReply(text);
  const cards = (parsed.cards || []).map((c) => ({ front: String(c.front || '').trim(), back: String(c.back || '').trim() })).filter((c) => c.front && c.back).slice(0, 30);
  if (!cards.length) throw new Error('The AI returned no cards');
  return cards;
}
