// Weekly email digest (Monday morning): questions answered, accuracy,
// streak, weakest topic and one suggestion, for every student who opted in
// (user_settings.digest_email = true).
//
// Auth: this is NOT a browser endpoint. It is called by pg_cron (see
// supabase/setup/weekly_digest_cron.sql) with the shared secret in
// `x-digest-secret`; anything else gets 401. Secrets (Supabase dashboard →
// Edge Functions → Secrets):
//   DIGEST_SECRET     — random string, same value as in the cron job
//   RESEND_API_KEY    — https://resend.com key (free tier: 3k emails/month)
//   DIGEST_FROM       — e.g. "InfinitySheets <digest@yourdomain.com>" (a
//                       verified Resend domain); defaults to onboarding@resend.dev
//   APP_URL           — link target, e.g. https://infinitysheets.app
// With no RESEND_API_KEY the function still runs and returns what it would
// have sent (dry run) — useful for testing with ?dry=1.
import { createClient } from "npm:@supabase/supabase-js@2";

type Sheet = { user_id: string; subject: string; topic: string; total: number; correct: number; score: number; created_at: string; questions: unknown };

function env(name: string) { return Deno.env.get(name) || ""; }

// Constant-time comparison of two secrets (compares SHA-256 digests).
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function digestFor(name: string, sheets: Sheet[], streak: number, appUrl: string) {
  const total = sheets.reduce((s, w) => s + (w.total || 0), 0);
  const correct = sheets.reduce((s, w) => s + (w.correct || 0), 0);
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const byTopic: Record<string, { n: number; ok: number }> = {};
  for (const w of sheets) {
    const qs = Array.isArray(w.questions) ? w.questions as Array<{ _topic?: string }> : [];
    const results = (w as unknown as { data?: { results?: boolean[] } }).data?.results || [];
    qs.forEach((q, i) => {
      const k = `${w.subject} · ${q?._topic || w.topic}`;
      const e = byTopic[k] || (byTopic[k] = { n: 0, ok: 0 });
      e.n += 1; if (results[i]) e.ok += 1;
    });
  }
  const weakest = Object.entries(byTopic).filter(([, v]) => v.n >= 3).map(([k, v]) => ({ k, acc: Math.round((v.ok / v.n) * 100) })).sort((a, b) => a.acc - b.acc)[0];
  const first = (name || "there").split(" ")[0];
  const lines = sheets.length
    ? [
      `Hi ${first}, here is your week on InfinitySheets.`,
      ``,
      `• ${sheets.length} worksheet${sheets.length === 1 ? "" : "s"} · ${total} questions · ${acc}% accuracy`,
      `• Streak: ${streak} day${streak === 1 ? "" : "s"}`,
      weakest ? `• Weakest topic: ${weakest.k} (${weakest.acc}%)` : `• Keep going — a few more sheets and we can spot your weakest topic.`,
      ``,
      weakest ? `This week: do one short sheet on ${weakest.k.split(" · ")[1]} first, then your review questions.` : `This week: aim for three short sheets and let the reviews come back to you.`,
    ]
    : [
      `Hi ${first}, you did not do any worksheets last week.`,
      ``,
      `Your streak is at ${streak}. One 10-minute sheet today gets it moving again.`,
    ];
  const text = `${lines.join("\n")}\n\nOpen the app: ${appUrl}/#dashboard\n\nYou get this because the weekly digest is on in Settings → Reminders & digest. Turn it off there any time.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:560px"><h2 style="margin:0 0 12px;font-size:20px">Your week on InfinitySheets</h2>${lines.map((l) => (l ? `<p style="margin:0 0 6px">${l.replace(/^• /, "&bull; ")}</p>` : `<div style="height:8px"></div>`)).join("")}<p style="margin:16px 0"><a href="${appUrl}/#dashboard" style="background:#7c3aed;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Open the app</a></p><p style="color:#64748b;font-size:12px">You get this because the weekly digest is on in Settings → Reminders &amp; digest. Turn it off there any time.</p></div>`;
  return { subject: sheets.length ? `Your week: ${total} questions at ${acc}%` : "Your streak needs you this week", text, html };
}

Deno.serve(async (req: Request) => {
  const secret = env("DIGEST_SECRET");
  if (!secret || !(await sameSecret(req.headers.get("x-digest-secret") || "", secret))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1" || !env("RESEND_API_KEY");
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const appUrl = env("APP_URL") || "https://infinitysheets.app";
  const from = env("DIGEST_FROM") || "InfinitySheets <onboarding@resend.dev>";

  const { data: optIn, error } = await supabase.from("user_settings").select("user_id, streak, digest_sent_at").eq("digest_email", true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const results: Array<Record<string, unknown>> = [];

  for (const row of optIn || []) {
    // At most one digest per 6 days per student, whatever the schedule does.
    if (row.digest_sent_at && Date.now() - new Date(row.digest_sent_at).getTime() < 6 * 24 * 3600 * 1000) continue;
    // The address comes from auth (verified), never from the editable profile.
    const { data: au } = await supabase.auth.admin.getUserById(row.user_id);
    const email = au?.user?.email;
    if (!email || !au?.user?.email_confirmed_at) continue;
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", row.user_id).maybeSingle();
    const { data: sheets } = await supabase.from("worksheets").select("user_id, subject, topic, total, correct, score, created_at, questions, data").eq("user_id", row.user_id).gte("created_at", since);
    const d = digestFor(profile?.name || "", (sheets || []) as Sheet[], row.streak || 0, appUrl);
    if (dry) { results.push({ to: email, subject: d.subject, preview: d.text.slice(0, 200) }); continue; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject: d.subject, text: d.text, html: d.html }),
    });
    const ok = res.ok;
    if (ok) await supabase.from("user_settings").update({ digest_sent_at: new Date().toISOString() }).eq("user_id", row.user_id);
    results.push({ to: email, ok, status: res.status });
  }
  return new Response(JSON.stringify({ dry, sent: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
