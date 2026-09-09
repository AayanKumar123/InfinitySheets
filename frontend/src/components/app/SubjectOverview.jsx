import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SUBJECT_INFO, TOPICS } from '../../data/mock';
import { useApp } from '../../context/AppContext';
import SubjectHero from './subject/SubjectHero';
import TopicsList from './subject/TopicsList';
import SubjectSidePanels from './subject/SubjectSidePanels';
import PastPapersPanel from './subject/PastPapersPanel';

const FALLBACK_INFO = {
  emoji: '\u25A0',
  tagline: 'Practice and improve.',
  description: 'Choose a topic and start practicing.',
  keyTopics: [],
  studyTips: [],
  tone: 'primary',
};

function useSubjectStats(worksheets, subject) {
  const stats = {};
  (worksheets || []).forEach((w) => {
    if (w.subject !== subject) return;
    if (!stats[w.topic]) stats[w.topic] = { correct: 0, total: 0 };
    stats[w.topic].correct += w.correct;
    stats[w.topic].total += w.total;
  });
  const totalAnswered = Object.values(stats).reduce((s, x) => s + x.total, 0);
  const totalCorrect = Object.values(stats).reduce((s, x) => s + x.correct, 0);
  const subjectAccuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const worksheetCount = (worksheets || []).filter((w) => w.subject === subject).length;
  return { stats, subjectAccuracy, totalAnswered, worksheetCount };
}

export default function SubjectOverview({ subject, go, onBack }) {
  const { state } = useApp();
  const info = SUBJECT_INFO[subject] || FALLBACK_INFO;
  const topics = TOPICS[subject] || info.keyTopics || [];
  const { stats, subjectAccuracy, totalAnswered, worksheetCount } = useSubjectStats(state.worksheets, subject);

  const launch = (topic) => {
    if (topic) window.sessionStorage.setItem('preselect_topic', topic);
    window.sessionStorage.setItem('preselect_subject', subject);
    go('worksheets');
  };

  return (
    <div className="relative" data-testid="subject-overview">
      <button
        onClick={onBack}
        data-testid="subject-back"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to subjects
      </button>

      <SubjectHero
        subject={subject}
        info={info}
        examTrack={state.user?.examTrack || 'SSLC'}
        topicCount={topics.length}
        subjectAccuracy={subjectAccuracy}
        worksheetCount={worksheetCount}
        questionCount={totalAnswered}
        onCreateWorksheet={() => launch(null)}
        onViewHistory={() => go('history')}
      />

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <TopicsList
          subject={subject}
          tone={info.tone}
          topics={topics}
          stats={stats}
          onLaunch={launch}
          onOpen={(topic) => { window.location.hash = `#topic?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`; }}
        />
        <div className="flex flex-col gap-4">
          <SubjectSidePanels keyTopics={info.keyTopics} studyTips={info.studyTips} />
          <PastPapersPanel pastPapers={state.pastPapers} subject={subject} board={state.user?.examTrack} />
        </div>
      </div>
    </div>
  );
}
