// Illustrative progress data for the landing page's predicted-grade chart
// and the subject breakdown section. One student's ten-week journey.

export const SUBJECT_PROGRESS = [
  {
    id: 'physics',
    subject: 'Physics',
    color: '#3b82f6',
    predictedFrom: 4,
    predictedTo: 6,
    nextThreshold: { grade: 7, needed: '86% average' },
    attempts: [
      { score: 42, topic: 'Electrostatics', date: 'Apr 28' },
      { score: 48, topic: 'Mechanics', date: 'May 5' },
      { score: 46, topic: 'Waves', date: 'May 12' },
      { score: 55, topic: 'Electrostatics', date: 'May 19' },
      { score: 61, topic: 'Optics', date: 'May 26' },
      { score: 58, topic: 'Thermodynamics', date: 'Jun 2' },
      { score: 68, topic: 'Mechanics', date: 'Jun 9' },
      { score: 74, topic: 'Electrostatics', date: 'Jun 16' },
      { score: 79, topic: 'Waves', date: 'Jun 23' },
      { score: 84, topic: 'Modern Physics', date: 'Jun 30' },
    ],
  },
  {
    id: 'mathematics',
    subject: 'Mathematics',
    color: '#8b5cf6',
    predictedFrom: 5,
    predictedTo: 6,
    nextThreshold: { grade: 7, needed: '84% average' },
    attempts: [
      { score: 55, topic: 'Algebra', date: 'Apr 30' },
      { score: 52, topic: 'Trigonometry', date: 'May 7' },
      { score: 60, topic: 'Trigonometry', date: 'May 14' },
      { score: 63, topic: 'Geometry', date: 'May 21' },
      { score: 61, topic: 'Probability', date: 'May 28' },
      { score: 70, topic: 'Trigonometry', date: 'Jun 4' },
      { score: 72, topic: 'Calculus', date: 'Jun 11' },
      { score: 76, topic: 'Algebra', date: 'Jun 18' },
      { score: 80, topic: 'Statistics', date: 'Jun 25' },
      { score: 82, topic: 'Trigonometry', date: 'Jul 2' },
    ],
  },
  {
    id: 'chemistry',
    subject: 'Chemistry',
    color: '#10b981',
    predictedFrom: 5,
    predictedTo: 7,
    nextThreshold: { grade: 7, needed: 'hold 85%+ average' },
    attempts: [
      { score: 58, topic: 'Organic', date: 'May 2' },
      { score: 62, topic: 'Equilibrium', date: 'May 9' },
      { score: 66, topic: 'Organic', date: 'May 16' },
      { score: 64, topic: 'Inorganic', date: 'May 23' },
      { score: 72, topic: 'Physical', date: 'May 30' },
      { score: 75, topic: 'Organic', date: 'Jun 6' },
      { score: 79, topic: 'Coordination Compounds', date: 'Jun 13' },
      { score: 83, topic: 'Equilibrium', date: 'Jun 20' },
      { score: 86, topic: 'Physical', date: 'Jun 27' },
      { score: 88, topic: 'Organic', date: 'Jul 4' },
    ],
  },
];

export function subjectStats(s) {
  const scores = s.attempts.map((a) => a.score);
  const first = scores[0];
  const last = scores[scores.length - 1];
  const avg = Math.round(scores.reduce((x, y) => x + y, 0) / scores.length);
  const best = Math.max(...scores);
  return { first, last, avg, best, improvement: last - first };
}
