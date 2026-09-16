// "Download my data": everything the app holds about the student, as JSON
// (complete) or CSV (worksheets only, for a spreadsheet). Runs entirely in
// the browser from the loaded state — nothing new is fetched or sent.
import jsPDF from 'jspdf';

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportJson(state) {
  const { user, worksheets, mistakes, courses, settings, streak, badges, flashcards, studyPlan } = state;
  const payload = {
    exportedAt: new Date().toISOString(),
    account: user ? { name: user.name, email: user.email, examTrack: user.examTrack, subjects: user.subjects } : null,
    settings, streak, badges, flashcards, studyPlan, courses, worksheets, mistakes,
  };
  download(`infinitysheets-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function exportCsv(state) {
  const rows = [['date', 'subject', 'topics', 'difficulty', 'answer_type', 'questions', 'correct', 'score_pct', 'duration_sec', 'exam_mode', 'simulation']];
  (state.worksheets || []).forEach((w) => rows.push([w.date, w.subject, w.topic, w.difficulty, w.answerType, w.total, w.correct, w.score, w.durationSec || '', w.examMode ? 'yes' : '', w.simulation ? 'yes' : '']));
  download(`infinitysheets-worksheets-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv');
}

// Printable flashcards: question on the front grid, answers on a matching
// back page (print double-sided, flip on long edge).
export function exportFlashcardsPdf(deck, title = 'Flashcards') {
  if (!deck.length) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const H = 297; const cols = 2; const rowsPer = 4; const margin = 10;
  const cw = (W - margin * 2) / cols; const ch = (H - margin * 2 - 8) / rowsPer;
  const clean = (s) => String(s || '').replace(/[^\x20-\x7e\n°±²³¹¼½¾×÷]/g, (c) => ({ '√': 'sqrt', '≤': '<=', '≥': '>=', '≠': '!=', 'π': 'pi', '→': '->' }[c] || ''));
  const page = (cards, side) => {
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`${title} — ${side} (print double-sided, flip on long edge)`, margin, 7);
    cards.forEach((c, i) => {
      const r = Math.floor(i / cols);
      // Backs are mirrored horizontally so they line up after flipping.
      const col = side === 'Answers' ? cols - 1 - (i % cols) : i % cols;
      const x = margin + col * cw; const y = margin + 4 + r * ch;
      doc.setDrawColor(200); doc.rect(x, y, cw, ch);
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(clean(`${c.subject}${c.topic ? ' · ' + c.topic : ''}`), x + 4, y + 6);
      doc.setFontSize(11); doc.setTextColor(20);
      const body = doc.splitTextToSize(clean(side === 'Answers' ? c.back : c.front), cw - 8).slice(0, 9);
      doc.text(body, x + 4, y + 13);
    });
  };
  const per = cols * rowsPer;
  for (let i = 0; i < deck.length; i += per) {
    const chunk = deck.slice(i, i + per);
    if (i > 0) doc.addPage();
    page(chunk, 'Questions');
    doc.addPage();
    page(chunk, 'Answers');
  }
  doc.save(`${title.replace(/\W+/g, '-').toLowerCase()}.pdf`);
}
