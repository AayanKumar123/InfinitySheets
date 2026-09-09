import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { FULL_PAPER_TYPE } from '../../../data/pastPapers';

/**
 * Full past papers for this subject, as uploaded by an admin (or seeded).
 * Links out to the awarding body — we never re-host the PDFs.
 */
export default function PastPapersPanel({ pastPapers = [], subject, board }) {
  const papers = pastPapers
    .filter((p) => p.answerType === FULL_PAPER_TYPE && p.subject === subject && (!p.board || p.board === board) && p.link)
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  if (papers.length === 0) return null;

  return (
    <div className="card-soft p-6" data-testid="subject-past-papers">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </span>
        <h3 className="text-[15px] font-semibold text-slate-900">Past papers</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {papers.map((p) => (
          <li key={p.id}>
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 rounded-lg border border-[color:var(--color-border)] px-3 py-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-slate-900 leading-snug">{p.q}</span>
                {p.year && <span className="block text-[11.5px] text-slate-500 mt-0.5">{p.year}</span>}
              </span>
              <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-600 mt-0.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
