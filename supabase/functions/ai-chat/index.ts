// InfinitySheets AI — one Gemini-backed endpoint for every assistant in the app.
//
//   POST { mode: 'overview' | 'chat' | 'recommend' | 'diagnose', context, messages }
//   → { text, model }
//
// The Gemini key lives ONLY here, as a project secret (Dashboard → Edge
// Functions → Secrets, or `supabase secrets set`). It is never shipped to the
// browser. The canonical name is GEMINI_API_KEY, but the lookup below also
// accepts spaced/cased variants like "Gemini API Key" — the dashboard lets you
// type any name, and a near-miss otherwise looks exactly like a missing key.
// Optional: GEMINI_MODEL puts a specific model at the head of MODEL_CHAIN.
//
// Two model gotchas, both of which look like a broken key but are not:
//   * Google retires ids for new keys — gemini-2.5-flash returns 404 "no longer
//     available to new users". If every call 404s, check the model id.
//   * The free tier allows only 20 requests per day PER MODEL. When one runs
//     out it returns 429 RESOURCE_EXHAUSTED, so MODEL_CHAIN below falls through
//     to the next model rather than failing. GEMINI_MODEL overrides the first.
//
// Topic overviews are cached in public.topic_overviews and shared by every
// student, so a given (board, subject, topic, level) costs one Gemini call for
// all time instead of one per visit. The cache is strictly best-effort: if the
// database is unreachable the request still gets answered from Gemini.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// What each board's examiners actually reward. Injected into the system prompt
// so the assistant answers in the language of that exam's mark scheme.
const BOARD_NOTES: Record<string, string> = {
  IGCSE: "Cambridge IGCSE. Mark schemes award one mark per required point; use Cambridge command words precisely (state, describe, explain, calculate, compare, evaluate, suggest). Quote the exact phrasing examiners accept (e.g. 'rate of reaction increases because particles collide more frequently with more energy'). Mention typical marks per question part and the assessment objectives (AO1 knowledge, AO2 handling information, AO3 experimental skills).",
  ASA: "Cambridge International AS & A Level. Answers are marked against detailed mark schemes with specific creditworthy points; level-of-response marking for extended answers. Use command words exactly and be explicit about required working, units, significant figures, and evaluation for the top band.",
  IB: "IB Diploma Programme. Refer to the subject guide's assessment objectives and markbands, IB command terms (define, outline, describe, explain, discuss, evaluate, to what extent), paper structure (Paper 1/2/3), and HL vs SL differences. For essays, describe what each markband criterion requires. Be explicit about what a 7 looks like versus a 5.",
  CBSE: "CBSE (India), NCERT-aligned. Marking follows step marking with specific keywords from the NCERT textbook; competency-based and case-study questions are increasing. State the exact NCERT phrasing examiners look for, the mark weightage of the topic, and typical question types (1-mark MCQ/assertion-reason, 2/3-mark short answers, 5-mark long answers).",
  ICSE: "CISCE (ICSE Class X / ISC Class XII). Marking rewards precise definitions, labelled diagrams, and complete steps; answers must follow the prescribed textbook terminology. Note the section structure (Section A compulsory, Section B choice) and mark weightage.",
  SSLC: "Indian state board SSLC (Class 10; Karnataka KSEAB, Kerala, Tamil Nadu). Marking is by scheme with fixed points per answer; textbook definitions and diagrams score. Note 1-mark, 2-mark, 3-mark and 4/5-mark question patterns and what a full-mark answer contains.",
  AP: "College Board Advanced Placement. Multiple-choice plus free-response questions scored with rubrics; explain what earns each rubric point (justification, correct units, referencing the stimulus), and how the topic maps to the course units and skills.",
  SAT: "Digital SAT (College Board). Adaptive modules for Reading & Writing and Math; no penalty for guessing. Focus on question archetypes, time per question, the trap answers used, and reliable elimination strategies. Be concrete about how the skill is tested.",
  JEE: "JEE Main / JEE Advanced (NTA / IITs). MCQs with negative marking (+4/-1) plus numerical-value questions; Advanced adds multi-correct and matching. Focus on the concepts and formulae that recur, the traps, calculation shortcuts, and what previous-year questions on this topic look like.",
  NEET: "NEET-UG (NTA). 180 questions, +4/-1, almost entirely NCERT-based. Emphasise the exact NCERT lines, diagrams and tables the questions are lifted from, high-yield facts, and common confusions between similar terms.",
  LSAT: "LSAT (LSAC). Logical Reasoning and Reading Comprehension, no penalty for guessing. Focus on question stems, how to identify the argument's conclusion and premises, common flaw patterns, and the elimination logic that produces the credited response.",
};

function boardLabel(board: string) {
  const b = (board || "").toUpperCase();
  return b === "ASA" ? "Cambridge AS & A Level" : b;
}

function systemPrompt(mode: string, ctx: Record<string, unknown>) {
  const board = String(ctx.board || "");
  const notes = BOARD_NOTES[board.toUpperCase()] || `The ${board} curriculum.`;
  const level = ctx.ibLevel ? ` (${ctx.ibLevel})` : "";
  const base = `You are the InfinitySheets study assistant for a student preparing for ${boardLabel(board)}${level}. You know exactly what this exam's examiners require and you answer like a top tutor who has read the syllabus and mark schemes: specific, exam-focused, never generic. Use plain language, short paragraphs and bullet points. Use Markdown headings (##) and bold sparingly. Write every formula, symbol and unit in plain Unicode text — F = Δp / t, 2 kg, 5 m/s, x², λ, °C, ½. NEVER use LaTeX: no $ delimiters, no \frac, \text, \times or any backslash command. The app renders plain text, so LaTeX shows up as raw symbols to the student. Never invent past-paper question numbers or statistics. If a question is outside the syllabus, say so and answer briefly.\n\nExam context: ${notes}`;

  if (mode === "recommend") {
    return `${base}\n\nYou are on the Smart Learning page. The student's performance data is in the first message. Give practical, prioritised advice about what to practise next and why, tied to their weakest topics and their exam date. Keep answers under 250 words unless asked for a plan.`;
  }
  if (mode === "diagnose") {
    return `${base}\n\nYou are running a post-worksheet diagnosis. The message contains the worksheet the student just finished: every question, the correct answer, and what the student put. Write a diagnosis with exactly these Markdown sections:\n\n## Where you went wrong\nGo through the incorrect questions (reference them by number). For each, name the actual misconception or slip — not just 'you got it wrong' — and give the one-line correct reasoning. If everything was correct, say so and instead identify where the answers were fragile or where the exam would push harder.\n\n## What you could have done better\n3-5 bullets on technique: reading the command word, showing working, units, eliminating options, time management, or the specific phrasing this board's mark scheme wants. Tie each to a real question from this worksheet.\n\n## Next steps\nExactly 3 bullets: the most valuable things to practise next, in priority order, each with why.\n\nBe direct and encouraging, never padded. Under 350 words.`;
  }
  const subj = ctx.subject ? `Subject: ${ctx.subject}. ` : "";
  const topic = ctx.topic ? `Topic: ${ctx.topic}. ` : "";
  return `${base}\n\n${subj}${topic}Stay on this topic unless the student moves on. When explaining, always connect to how the exam tests it and what the mark scheme rewards.`;
}

function overviewPrompt(ctx: Record<string, unknown>) {
  return `Write an exam-focused overview of the topic "${ctx.topic}" in ${ctx.subject} for ${boardLabel(String(ctx.board || ""))}${ctx.ibLevel ? ` ${ctx.ibLevel}` : ""}. Use exactly these Markdown sections:\n\n## Overview\n3-5 sentences on what the topic is and why it matters in this exam.\n\n## What the exam wants\nBullet points: the specific things the mark scheme rewards for this topic — required definitions or phrasing, command words to watch, steps or working that earn marks, typical question formats and their mark allocations.\n\n## Common mistakes\n3-5 bullets of errors that lose marks, each with the fix.\n\n## FAQs\n3-4 questions students actually ask about this topic, each with a 1-2 sentence answer.\n\nKeep the whole thing under 380 words.`;
}

// Read a secret by name, tolerating the spacing/casing people actually type in
// the dashboard: "GEMINI_API_KEY", "Gemini API Key", "gemini-api-key" all match.
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

// Tried in order. The free tier's 20/day is counted per model, so a chain
// multiplies the daily allowance and degrades instead of dying.
//
// Order is by speed, not by headline capability: gemini-3.5-flash is a
// "thinking" model that reasons before every reply and cannot have that
// switched off (thinkingBudget: 0 is ignored) — 9-14s for a one-word answer,
// where flash-lite takes ~1s. Measured quality on exam questions is
// equivalent, so the lite models go first and 3.5-flash is the last resort.
const MODEL_CHAIN = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"];

// ---------------------------------------------------------------------------
// Shared overview cache (service-role, best-effort)
// ---------------------------------------------------------------------------
const DB_URL = Deno.env.get("SUPABASE_URL");
const DB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CACHE_TIMEOUT_MS = 1500;   // never let a slow database delay an answer

function cacheKey(ctx: Record<string, unknown>) {
  return [ctx.board, ctx.subject, ctx.topic, ctx.ibLevel || ""]
    .map((v) => String(v ?? "").trim().toLowerCase())
    .join("|");
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
  } catch (_) {
    return null;   // cache is an optimisation, never a dependency
  }
}

async function cachePut(id: string, ctx: Record<string, unknown>, body: string, model: string) {
  if (!DB_URL || !DB_KEY) return;
  try {
    await fetch(`${DB_URL}/rest/v1/topic_overviews?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: DB_KEY,
        Authorization: `Bearer ${DB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id,
        board: String(ctx.board ?? ""),
        subject: String(ctx.subject ?? ""),
        topic: String(ctx.topic ?? ""),
        ib_level: ctx.ibLevel ? String(ctx.ibLevel) : null,
        body,
        model,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
    });
  } catch (_) { /* a failed write just means the next visit regenerates */ }
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
const MODES = new Set(["overview", "chat", "recommend", "diagnose"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = envLike("GEMINI_API_KEY");
  if (!key) return json({ error: "AI is not configured yet — add the GEMINI_API_KEY secret to the Supabase project." }, 503);
  const preferred = envLike("GEMINI_MODEL");
  const models = preferred ? [preferred, ...MODEL_CHAIN.filter((m) => m !== preferred)] : [...MODEL_CHAIN];

  let body: { mode?: string; context?: Record<string, unknown>; messages?: Msg[]; force?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const mode = MODES.has(String(body.mode)) ? String(body.mode) : "chat";
  const ctx = body.context || {};

  // An overview is the same for every student, so check the shared cache first.
  // `force` (the Regenerate button) skips the read but still refreshes the row.
  const overviewId = mode === "overview" ? cacheKey(ctx) : "";
  if (mode === "overview" && !body.force) {
    const hit = await cacheGet(overviewId);
    if (hit) {
      cacheBumpHit(overviewId);   // fire and forget
      return json({ text: hit.body, model: hit.model, cached: true });
    }
  }

  let contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  if (mode === "overview") {
    contents = [{ role: "user", parts: [{ text: overviewPrompt(ctx) }] }];
  } else {
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-14);
    contents = msgs
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 12000) }] }));
    if (contents.length === 0) return json({ error: "No message" }, 400);
  }

  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt(mode, ctx) }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
  });

  // Walk the model chain. A 503 is transient (retry the same model); a 429 means
  // that model's daily free quota is gone (move to the next one).
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

      if (r.status === 429) { everQuotaExhausted = true; continue outer; }  // next model
      if (r.status === 503 && attempt < 2) { await new Promise((x) => setTimeout(x, 700 * (attempt + 1))); continue; }
      break;                                                                // 4xx: next model won't help either
    }
  }

  if (!res) {
    const friendly = everQuotaExhausted
      ? "The daily free AI limit has been reached. It resets at midnight Pacific time — or add billing to the Google AI key to lift it."
      : lastStatus === 503
        ? "The AI is busy right now. Give it a moment and try again."
        : lastStatus === 404
          ? "No usable AI model was found for this key. Set the GEMINI_MODEL secret to a current model."
          : lastStatus === 400 || lastStatus === 403
            ? "The AI key was rejected. Check the GEMINI_API_KEY secret on the Supabase project."
            : `AI request failed (${lastStatus || "no response"}).`;
    return json({ error: friendly }, 502);
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) return json({ error: "The AI returned an empty answer. Try rephrasing." }, 502);

  // Don't make the student wait for the cache write — it is bookkeeping.
  if (mode === "overview") cachePut(overviewId, ctx, text, used);
  return json({ text, model: used, cached: false });
});
