import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const UNKNOWN_SUBJECT = 'Other';

const sortSubjects = (a, b) => {
  if (a === UNKNOWN_SUBJECT) return 1;
  if (b === UNKNOWN_SUBJECT) return -1;
  return a.localeCompare(b);
};

function getSubjectLabel(item) {
  const s = (item?.subject || '').trim();
  return s || UNKNOWN_SUBJECT;
}

function groupBySubject(items) {
  const groups = new Map();
  for (const it of items) {
    const key = getSubjectLabel(it);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return Array.from(groups.entries())
    .map(([subject, list]) => ({ subject, list }))
    .sort((a, b) => sortSubjects(a.subject, b.subject));
}

export default function SubjectGroupedList({
  items,
  renderItem,
  testIdPrefix,
  className = '',
  groupClassName = '',
  itemClassName = '',
  // Override the labels used in the group header. By default the count says
  // "N items" — pages like WorksheetHistory/Mistakes pass clearer copy.
  itemLabelSingular = 'item',
  itemLabelPlural = 'items',
}) {
  const groups = useMemo(() => groupBySubject(items || []), [items]);
  // All groups start collapsed so the page stays scannable.
  const [open, setOpen] = useState({});
  const toggle = (subject) => setOpen((m) => ({ ...m, [subject]: !m[subject] }));
  if (!items || items.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {groups.map(({ subject, list }) => {
        const isOpen = !!open[subject];
        const contentId = testIdPrefix ? `${testIdPrefix}-items-${subject}` : undefined;
        const headerId = testIdPrefix ? `${testIdPrefix}-group-${subject}` : undefined;
        return (
          <section
            key={subject}
            className={`rounded-xl border border-[color:var(--color-border)] bg-white overflow-hidden ${groupClassName}`}
            data-testid={headerId}
          >
            <button
              type="button"
              onClick={() => toggle(subject)}
              aria-expanded={isOpen}
              aria-controls={contentId}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                <h3 className="text-[14.5px] font-semibold text-slate-900 truncate">{subject}</h3>
              </div>
              <span className="text-[12px] font-medium text-slate-500 shrink-0">
                {list.length} {list.length === 1 ? itemLabelSingular : itemLabelPlural}
              </span>
            </button>
            {isOpen && (
              <div
                id={contentId}
                className={`flex flex-col gap-3 px-5 pb-5 pt-1 border-t border-[color:var(--color-border)] ${itemClassName}`}
                data-testid={contentId}
              >
                {list.map((item) => (
                  <div
                    key={item.id}
                    data-testid={testIdPrefix ? `${testIdPrefix}-item-${item.id}` : undefined}
                  >
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
