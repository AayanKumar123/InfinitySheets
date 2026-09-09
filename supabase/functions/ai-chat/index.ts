// InfinitySheets AI — one Gemini-backed endpoint for every assistant in the app.
//
//   POST { mode: 'overview' | 'chat' | 'recommend' | 'diagnose', context, messages }
//   → { text, model }
//
// The Gemini key lives ONLY here, as the GEMINI_API_KEY secret on the project
// (Dashboard → Edge Functions → Secrets, or `supabase secrets set`). It is never
// shipped to the browser. Optional: GEMINI_MODEL (default gemini-2.5-flash).
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
  const base = `You are the InfinitySheets study assistant for a student preparing for ${boardLabel(board)}${level}. You know exactly what this exam's examiners require and you answer like a top tutor who has read the syllabus and mark schemes: specific, exam-focused, never generic. Use plain language, short paragraphs and bullet points. Use Markdown headings (##) and bold sparingly. Never invent past-paper question numbers or statistics. If a question is outside the syllabus, say so and answer briefly.\n\nExam context: ${notes}`;

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

type Msg = { role: "user" | "assistant"; content: string };
const MODES = new Set(["overview", "chat", "recommend", "diagnose"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "AI is not configured yet — add the GEMINI_API_KEY secret to the Supabase project." }, 503);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

  let body: { mode?: string; context?: Record<string, unknown>; messages?: Msg[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const mode = MODES.has(String(body.mode)) ? String(body.mode) : "chat";
  const ctx = body.context || {};

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

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt(mode, ctx) }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const friendly = res.status === 429
      ? "The AI is busy right now (rate limit). Try again in a minute."
      : `AI request failed (${res.status}).`;
    console.error("gemini", res.status, detail.slice(0, 400));
    return json({ error: friendly }, 502);
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) return json({ error: "The AI returned an empty answer. Try rephrasing." }, 502);
  return json({ text, model });
});
