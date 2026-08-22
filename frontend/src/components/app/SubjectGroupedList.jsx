import React, { useMemo } from 'react';

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
}) {
  const groups = useMemo(() => groupBySubject(items || []), [items]);
  if (!items || items.length === 0) return null;
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {groups.map(({ subject, list }) => (
        <section
          key={subject}
          className={`flex flex-col gap-3 ${groupClassName}`}
          data-testid={testIdPrefix ? `${testIdPrefix}-group-${subject}` : undefined}
        >
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-slate-900">{subject}</h3>
            <span className="text-[12px] font-medium text-slate-500">
              {list.length} {list.length === 1 ? 'item' : 'items'}
            </span>
          </header>
          <div
            className={`flex flex-col gap-3 ${itemClassName}`}
            data-testid={testIdPrefix ? `${testIdPrefix}-items-${subject}` : undefined}
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
        </section>
      ))}
    </div>
  );
}
