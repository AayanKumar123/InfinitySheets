// InfinitySheets AI — one Gemini-backed endpoint for every assistant in the app.
//
//   POST { mode, context, messages, files? }  →  { text, model }
//
// The Gemini key lives ONLY here, as a project secret. Never shipped to the browser.
// This file is kept in sync with the deployed edge function (project annyogfzxzznyzkzlodx).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const BOARD_NOTES: Record<string, string> = {
  IGCSE: "Cambridge IGCSE. Mark schemes award one mark per required point; use Cambridge command words precisely (state, describe, explain, calculate, compare, evaluate, suggest). Quote the exact phrasing examiners accept. Mention typical marks per question part and the assessment objectives (AO1, AO2, AO3).",
  ASA: "Cambridge International AS & A Level. Answers are marked against detailed mark schemes with specific creditworthy points; level-of-response marking for extended answers. Use command words exactly and be explicit about required working, units, significant figures, and evaluation for the top band.",
  IB: "IB Diploma Programme. Refer to the subject guide's assessment objectives and markbands, IB command terms, paper structure (Paper 1/2/3), and HL vs SL differences. Be explicit about what a 7 looks like versus a 5.",
  CBSE10: "CBSE Class 10 board examination (India), NCERT-aligned. Step marking with NCERT keywords; competency-based and case-study questions are a large share. Note the paper pattern and the exact NCERT phrasing examiners expect.",
  ISC: "ISC Class 12 (CISCE, India). Marking rewards precise definitions, complete derivations and labelled diagrams in the prescribed textbook terminology; answers are marked per scheme point with internal choice.",
  CBSE: "CBSE Class 12 board examination (India), NCERT-aligned. Step marking with specific NCERT keywords; competency-based and case-study questions are increasing. State the exact NCERT phrasing, the mark weightage, and typical question types.",
  ICSE: "CISCE (ICSE Class X / ISC Class XII). Marking rewards precise definitions, labelled diagrams, and complete steps; answers must follow the prescribed textbook terminology.",
  AP: "College Board Advanced Placement. Multiple-choice plus free-response scored with rubrics; explain what earns each rubric point and how the topic maps to the course units and skills.",
  SAT: "Digital SAT (College Board). Adaptive modules for Reading & Writing and Math; no penalty for guessing. Focus on question archetypes, time per question, the trap answers, and reliable elimination.",
  JEE: "JEE Main / JEE Advanced (NTA / IITs). MCQs with negative marking plus numerical-value questions. Focus on the concepts and formulae that recur, the traps, calculation shortcuts, and previous-year question style.",
  NEET: "NEET-UG (NTA). 180 questions, +4/-1, almost entirely NCERT-based. Emphasise the exact NCERT lines, diagrams and tables, high-yield facts, and common confusions.",
  LSAT: "LSAT (LSAC). Logical Reasoning and Reading Comprehension. Focus on question stems, identifying the conclusion and premises, common flaw patterns, and elimination logic.",
};

function boardLabel(board: string) {
  const b = (board || "").toUpperCase();
  return b === "ASA" ? "Cambridge AS & A Level" : b === "CBSE10" ? "CBSE Class 10" : b === "CBSE" ? "CBSE Class 12" : b === "ISC" ? "ISC Class 12" : b;
}

function systemPrompt(mode: string, ctx: Record<string, unknown>) {
  const board = String(ctx.board || "");
  const notes = BOARD_NOTES[board.toUpperCase()] || `The ${board} curriculum.`;
  const level = ctx.ibLevel ? ` (${ctx.ibLevel})` : "";
  const base = `You are the InfinitySheets study assistant for a student preparing for ${boardLabel(board)}${level}. You answer like a top tutor who has read the syllabus and mark schemes: specific, exam-focused, never generic. Use plain language, short paragraphs and bullet points. Use Markdown headings (##) and bold sparingly. Write every formula, symbol and unit in plain Unicode text — never LaTeX, no $ delimiters or backslash commands. Never invent past-paper question numbers or statistics.\n\nExam context: ${notes}`;

  if (mode === "recommend") {
    return `${base}\n\nYou are on the Smart Learning page. The student's performance data is in the first message. Give practical, prioritised advice about what to practise next and why, tied to their weakest topics and their exam date. Keep answers under 250 words unless asked for a plan.`;
  }
  if (mode === "transcribe") {
    return `You transcribe photographs of a student's handwritten working for ${boardLabel(board)} ${ctx.subject || ""}. Write out EXACTLY what is on the page as plain text, line by line: every equation, number, unit, diagram label and crossed-out attempt (mark crossed-out work with [crossed out]). Use plain Unicode for maths, never LaTeX. Do not solve, correct or improve the work. If something is unreadable write [unclear]. If the photo has a diagram, describe it briefly in square brackets. Output only the transcription.`;
  }
  if (mode === "generate") {
    return `${base}\n\nYou write ORIGINAL practice questions for this exam. Every question must be new (never copied from a past paper), squarely inside the current syllabus for the topic, at the requested difficulty, and in the exact style and command words this board uses. Numbers, contexts and wording must be your own. Reply with a single JSON object and nothing else.`;
  }
  if (mode === "extract") {
    return `You extract EVERY question from a past-paper PDF for ${boardLabel(board)}${level} ${ctx.subject || ""}. Work through the paper page by page, in order, and do not stop early — a typical paper has 20-40 numbered questions or sub-parts, so returning only a few means you missed most of them. Transcribe each question faithfully (plain Unicode maths, no LaTeX). Split every numbered question into its lettered sub-parts (a), (b), (c) as separate items, repeating the shared stem so each stands alone. When a MARK SCHEME document is also supplied, match its accepted answer and mark points to each question by question number.\n\nA question that asks the student to DRAW, SKETCH, PLOT, LABEL or COMPLETE a diagram/graph/figure cannot be typed — set its "answerType" to "Drawing". If a question includes or refers to a diagram/figure/graph the student must read to answer it, set "hasDiagram": true and put a short "diagramNote" describing what the figure shows (the student will look at the original paper). Do NOT skip diagram questions — include them all. Reply with a single JSON object and nothing else.`;
  }
  if (mode === "assess") {
    return `You are an examiner for ${boardLabel(board)}${level} ${ctx.subject || ""}. The student sat a printed worksheet on paper and uploaded photos or a PDF of their handwritten answers. Read the answers, match them to the numbered questions supplied, transcribe the working briefly, and mark each strictly against the accepted answer / marking scheme given. Never award marks for answers that are not on the page. Reply with a single JSON object and nothing else.`;
  }
  if (mode === "mark") {
    return `You are an examiner marking one answer for ${boardLabel(board)}${level} strictly against the marking scheme supplied. Award marks only for points actually present in the student's answer; follow-through marks only where the scheme allows. Reply with a single JSON object and nothing else.`;
  }
  if (mode === "solution") {
    return `${base}\n\nYou write a fully worked model solution for ONE question the student got wrong. Structure: **Step 1**, **Step 2**, ... then **Answer**, then a one-line **Where you slipped**. Show every mark-earning step the scheme rewards. Under 220 words.`;
  }
  if (mode === "plan") {
    return `${base}\n\nYou build a study plan from the student's performance data and exam date. Reply with a single JSON object and nothing else: {"summary": "one sentence", "days": [{"day": "Mon", "date": "YYYY-MM-DD", "tasks": [{"subject": string, "topic": string, "minutes": integer, "what": "one specific action"}]}]}. Weakest topics first, spaced repetition later in the week, never more than 3 tasks per day.`;
  }
  if (mode === "flashcards") {
    return `${base}\n\nYou write revision flashcards for this exam: the definitions, formulas, laws, facts and traps a student must know for a topic, phrased exactly as the mark scheme rewards. Never write practice questions. Reply with a single JSON object and nothing else.`;
  }
  if (mode === "syllabus") {
    return `You read an official syllabus / specification PDF for ${boardLabel(board)}${level} ${ctx.subject || ""} and list its teachable topics. Reply with a single JSON object and nothing else: {"topics": [{"name": "short topic title", "summary": "one line of what is assessed"}]}. Merge sub-points into 15-40 topics, in syllabus order. Skip assessment objectives, administration and appendices.`;
  }
  if (mode === "diagnose") {
    return `${base}\n\nYou are running a post-worksheet diagnosis. The message contains the worksheet the student just finished. Write a diagnosis with exactly these Markdown sections:\n\n## Where you went wrong\nGo through the incorrect questions (reference them by number). Name the actual misconception and give the one-line correct reasoning. If everything was correct, say so and identify where answers were fragile.\n\n## What you could have done better\n3-5 bullets on technique, each tied to a real question from this worksheet.\n\n## Next steps\nExactly 3 bullets: the most valuable things to practise next, in priority order, each with why.\n\nBe direct and encouraging, never padded. Under 350 words.`;
  }
  if (mode === "course-search") {
    return `You help a student identify the exact official course / specification / syllabus they are studying, so InfinitySheets can pull the right material. Use Google Search to find real, official courses that match what they describe (exam boards, universities, national curricula, professional bodies). Ask at most a FEW short clarifying questions ONE at a time (e.g. the official course or exam name, the exam board or institution, the level/year, the country) — but only when you genuinely need them to search well. As soon as you can, search and return real candidate courses.\n\nReply with ONE JSON object and nothing else, no markdown fences:\n{"question": "a single short clarifying question, or null when you are ready to show matches", "candidates": [{"name": "official course name", "org": "board / institution", "level": "level or year if any", "url": "official page URL you actually found", "why": "one line on why it matches"}], "note": "one short line of context"}\nOnly include candidates you actually found via search with real official URLs — never invent a course or URL. Return an empty candidates array while you are still asking questions.`;
  }
  const subj = ctx.subject ? `Subject: ${ctx.subject}. ` : "";
  const topic = ctx.topic ? `Topic: ${ctx.topic}. ` : "";
  return `${base}\n\n${subj}${topic}Stay on this topic unless the student moves on. When explaining, always connect to how the exam tests it and what the mark scheme rewards.`;
}

function overviewPrompt(ctx: Record<string, unknown>) {
  const syl = ctx.syllabusUrl ? `[1] ${ctx.syllabusTitle || "Official syllabus"} — ${ctx.syllabusUrl}` : "";
  const sections = [
    "## Overview\n3-5 sentences on what the topic is and why it matters in this exam.",
    "## What the exam wants\nBullet points: the specific things the mark scheme rewards for this topic.",
    "## Common mistakes\n3-5 bullets of errors that lose marks, each with the fix.",
    "## FAQs\n3-4 questions students actually ask, each with a 1-2 sentence answer.",
    "## Sources\nA numbered list of every source you drew on.",
  ].join("\n\n");
  const rules = "CITATION RULES — every factual claim MUST end with a citation tag like [1] that points at an entry in Sources. Sources must be real, official, named documents. Only include a URL when you are certain of it. The following source is confirmed and must be [1]:";
  const first = syl || "[1] The board's official syllabus for this subject (name it precisely).";
  return `Write an exam-focused overview of the topic "${ctx.topic}" in ${ctx.subject} for ${boardLabel(String(ctx.board || ""))}${ctx.ibLevel ? ` ${ctx.ibLevel}` : ""}. Use exactly these Markdown sections:\n\n${sections}\n\n${rules}\n${first}\n\nKeep the whole thing under 450 words.`;
}

function envLike(canonical: string): string | undefined {
  const direct = Deno.env.get(canonical);
  if (direct && direct.trim()) return direct.trim();
  const norm = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
  const want = norm(canonical);
  for (const [name, value] of Object.entries(Deno.env.toObject())) {
    if (norm(name) === want && value && value.trim()) return value.trim();
  }
  return undefined;
}

const MODEL_CHAIN = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"];

const DB_URL = Deno.env.get("SUPABASE_URL");
const DB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CACHE_TIMEOUT_MS = 1500;

function cacheKey(ctx: Record<string, unknown>) {
  return ["v2", ctx.board, ctx.subject, ctx.topic, ctx.ibLevel || ""]
    .map((v) => String(v ?? "").trim().toLowerCase()).join("|");
}

async function cacheGet(id: string): Promise<{ body: string; model: string } | null> {
  if (!DB_URL || !DB_KEY) return null;
  try {
    const r = await fetch(`${DB_URL}/rest/v1/topic_overviews?id=eq.${encodeURIComponent(id)}&select=body,model`, {
      headers: { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` },
      signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.body ? { body: row.body, model: row.model || "cache" } : null;
  } catch (_) { return null; }
}

async function cachePut(id: string, ctx: Record<string, unknown>, body: string, model: string) {
  if (!DB_URL || !DB_KEY) return;
  try {
    await fetch(`${DB_URL}/rest/v1/topic_overviews?on_conflict=id`, {
      method: "POST",
      headers: { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, board: String(ctx.board ?? ""), subject: String(ctx.subject ?? ""), topic: String(ctx.topic ?? ""), ib_level: ctx.ibLevel ? String(ctx.ibLevel) : null, body, model, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
    });
  } catch (_) { /* best effort */ }
}

async function cacheBumpHit(id: string) {
  if (!DB_URL || !DB_KEY) return;
  try {
    await fetch(`${DB_URL}/rest/v1/rpc/bump_topic_overview_hit`, {
      method: "POST",
      headers: { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
      signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
    });
  } catch (_) { /* stats only */ }
}

type Msg = { role: "user" | "assistant"; content: string };
const MODES = new Set(["overview", "chat", "recommend", "diagnose", "transcribe", "mark", "generate", "extract", "assess", "solution", "plan", "syllabus", "flashcards", "course-search"]);
const JSON_MODES = new Set(["mark", "generate", "extract", "assess", "plan", "syllabus", "flashcards"]);
const FILE_MODES = new Set(["transcribe", "extract", "assess", "syllabus"]);
type FileIn = { mimeType: string; data: string; label?: string };
function cleanFiles(list: unknown, max = 6): FileIn[] {
  return (Array.isArray(list) ? list : []).slice(0, max)
    .filter((f) => f && (/^image\//.test(String(f.mimeType)) || f.mimeType === "application/pdf") && typeof f.data === "string" && f.data.length < 12_000_000)
    .map((f) => ({ mimeType: String(f.mimeType), data: String(f.data), label: f.label ? String(f.label) : undefined }));
}

async function requireUser(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || !DB_URL || !DB_KEY) return null;
  try {
    const r = await fetch(`${DB_URL}/auth/v1/user`, { headers: { apikey: DB_KEY, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && typeof u.id === "string" && u.role === "authenticated" ? u.id : null;
  } catch { return null; }
}

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 40;
const rate = new Map<string, number[]>();
function rateLimited(who: string): boolean {
  const now = Date.now();
  const hits = (rate.get(who) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) { rate.set(who, hits); return true; }
  hits.push(now); rate.set(who, hits);
  if (rate.size > 5000) rate.clear();
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const userId = await requireUser(req);
  if (!userId) return json({ error: "Please sign in to use the AI." }, 401);

  const key = envLike("GEMINI_API_KEY");
  if (!key) return json({ error: "AI is not configured yet — add the GEMINI_API_KEY secret to the Supabase project." }, 503);
  const preferred = envLike("GEMINI_MODEL");
  const models = preferred ? [preferred, ...MODEL_CHAIN.filter((m) => m !== preferred)] : [...MODEL_CHAIN];

  let body: { mode?: string; context?: Record<string, unknown>; messages?: Msg[]; force?: boolean; images?: FileIn[]; files?: FileIn[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const mode = MODES.has(String(body.mode)) ? String(body.mode) : "chat";
  const ctx = body.context || {};
  const cachedOverview = mode === "overview" && !body.force ? await cacheGet(cacheKey(ctx)) : null;
  if (cachedOverview) { cacheBumpHit(cacheKey(ctx)); return json({ text: cachedOverview.body, model: cachedOverview.model, cached: true }); }
  if (rateLimited(userId)) return json({ error: "Too many AI requests. Please wait a few minutes." }, 429);

  const overviewId = mode === "overview" ? cacheKey(ctx) : "";

  type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
  let contents: Array<{ role: string; parts: Part[] }>;
  if (mode === "overview") {
    contents = [{ role: "user", parts: [{ text: overviewPrompt(ctx) }] }];
  } else if (FILE_MODES.has(mode)) {
    const files = cleanFiles(Array.isArray(body.files) && body.files.length ? body.files : body.images);
    if (!files.length) return json({ error: "No file was attached" }, 400);
    const note = (Array.isArray(body.messages) ? body.messages : []).map((m) => m?.content || "").join("\n").slice(0, 60000);
    const parts: Part[] = [];
    files.forEach((f) => {
      if (f.label) parts.push({ text: `--- ${f.label} ---` });
      parts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
    });
    parts.push({ text: mode === "transcribe" ? `${note}\n\nTranscribe the handwritten working in the photo(s).` : note });
    contents = [{ role: "user", parts }];
  } else {
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-14);
    contents = msgs.filter((m) => m && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 12000) }] }));
    if (contents.length === 0) return json({ error: "No message" }, 400);
  }

  // Grounded course search may run the web-search tool; JSON responseMimeType is
  // incompatible with tools, so it parses JSON out of the text reply instead.
  const grounded = mode === "course-search";
  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt(mode, ctx) }] },
    contents,
    ...(grounded ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: {
      temperature: mode === "generate" ? 0.9 : grounded ? 0.2 : mode === "transcribe" || JSON_MODES.has(mode) ? 0.1 : 0.4,
      maxOutputTokens: mode === "extract" ? 16000 : grounded ? 2000 : JSON_MODES.has(mode) ? 8000 : mode === "transcribe" ? 2500 : 1500,
      ...(JSON_MODES.has(mode) && !grounded ? { responseMimeType: "application/json" } : {}),
    },
  });

  let res: Response | null = null;
  let used = "";
  let lastStatus = 0;
  let lastDetail = "";
  let everQuotaExhausted = false;

  outer:
  for (const candidate of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: payload,
      });
      if (r.ok) { res = r; used = candidate; break outer; }
      lastStatus = r.status;
      lastDetail = await r.text().catch(() => "");
      console.error("gemini", candidate, r.status, lastDetail.slice(0, 300));
      if (r.status === 429) { everQuotaExhausted = true; continue outer; }
      if (r.status === 503 && attempt < 2) { await new Promise((x) => setTimeout(x, 700 * (attempt + 1))); continue; }
      break;
    }
  }

  if (!res) {
    const friendly = everQuotaExhausted
      ? "The daily free AI limit has been reached. It resets at midnight Pacific time — or add billing to the Google AI key to lift it."
      : lastStatus === 503 ? "The AI is busy right now. Give it a moment and try again."
      : lastStatus === 404 ? "No usable AI model was found for this key. Set the GEMINI_MODEL secret to a current model."
      : lastStatus === 400 || lastStatus === 403 ? "The AI key was rejected. Check the GEMINI_API_KEY secret on the Supabase project."
      : `AI request failed (${lastStatus || "no response"}).`;
    return json({ error: friendly }, 502);
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) return json({ error: "The AI returned an empty answer. Try rephrasing." }, 502);

  if (mode === "overview") cachePut(overviewId, ctx, text, used);
  return json({ text, model: used, cached: false });
});
