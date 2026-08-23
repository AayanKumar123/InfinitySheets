import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, X } from 'lucide-react';
import EmptyStateScene from '../decor/EmptyStateScene';
import SubjectGroupedList from './SubjectGroupedList';

export default function Mistakes() {
  const { state, removeMistake } = useApp();
  const list = state.mistakes || [];
  const [reveal, setReveal] = useState({});

  if (list.length === 0) {
    return (
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
        <EmptyStateScene variant="book" className="absolute inset-0" />
        <div className="relative p-12 text-center">
          <div className="text-[15px] font-medium text-slate-700">No mistakes recorded</div>
          <div className="text-[13px] text-slate-500 mt-1">Missed questions will appear here so you can retry them.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[820px]" data-testid="mistakes-list">
      <SubjectGroupedList
        items={list}
        testIdPrefix="mistakes"
        itemLabelSingular="mistake"
        itemLabelPlural="mistakes"
        renderItem={(m) => {
          const shown = reveal[m.id];
          return (
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-5">
              <div className="text-[12.5px] text-slate-500 mb-1">{m.topic}</div>
              <div className="text-[14.5px] font-medium text-slate-900">{m.question}</div>
              <div className="mt-3 flex flex-col gap-2">
                {m.options.map((opt, i) => {
                  const isCorrect = i === m.correct;
                  const isGiven = i === m.given;
                  let cls = 'border-[color:var(--color-border)] hover:border-slate-300';
                  if (shown) {
                    if (isCorrect) cls = 'border-emerald-300 bg-emerald-50/50';
                    else if (isGiven) cls = 'border-rose-300 bg-rose-50/50';
                    else cls = 'border-[color:var(--color-border)]';
                  }
                  return (
                    <div key={`${m.id}-${i}`} className={`px-4 py-2.5 rounded-lg border text-[14px] flex items-center justify-between ${cls}`}>
                      <span><span className="inline-block w-6 text-slate-500 font-medium">{String.fromCharCode(65 + i)}.</span>{opt}</span>
                      {shown && isCorrect && <Check className="w-5 h-5 text-emerald-600" />}
                      {shown && isGiven && !isCorrect && <X className="w-5 h-5 text-rose-600" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setReveal({ ...reveal, [m.id]: !shown })} className="btn-outline-dark px-3 py-1.5 rounded-md text-[13px]">{shown ? 'Hide answer' : 'Reveal answer'}</button>
                <button onClick={() => removeMistake(m.id)} className="px-3 py-1.5 rounded-md text-[13px] text-slate-600 hover:text-slate-900">Mark as reviewed</button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
