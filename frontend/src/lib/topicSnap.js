// Snap a free-text topic label (from the AI, a PDF, an import) onto one of a
// subject's canonical topics so it lines up with the worksheet builder, the
// Syllabus Bank and the analytics. Ported from the pdf-questions importer
// (Infinitysheetslol/infinitysheets-updates) and widened to every subject in
// TOPICS: exact match → keyword hint → substring → bigram similarity.
import { topicsFor } from './subjects';

// Words that strongly imply a topic, checked before fuzzy matching.
const KEYWORD_HINTS = {
  Physics: [
    [['newton', 'force', 'friction', 'momentum', 'acceleration', 'gravity', 'projectile', 'energy', 'work', 'kinematic', 'motion'], 'Mechanics'],
    [['charge', 'coulomb', 'electric field', 'capacitor', 'voltage', 'potential'], 'Electrostatics'],
    [['lens', 'mirror', 'refraction', 'diffraction', 'polarisation', 'optics', 'light'], 'Optics'],
    [['heat', 'temperature', 'thermal', 'entropy', 'carnot', 'gas law'], 'Thermodynamics'],
    [['photon', 'quantum', 'atomic', 'photoelectric', 'de broglie', 'nuclear', 'radioactiv'], 'Modern Physics'],
    [['wave', 'sound', 'resonance', 'frequency', 'amplitude', 'doppler'], 'Waves'],
  ],
  Mathematics: [
    [['polynomial', 'equation', 'linear', 'quadratic', 'inequality', 'arithmetic progression', 'ap '], 'Algebra'],
    [['sin', 'cos', 'tan', 'trigonometric', 'identity', 'height and distance'], 'Trigonometry'],
    [['angle', 'circle', 'polygon', 'triangle', 'coordinate geometry', 'mensuration'], 'Geometry'],
    [['derivative', 'integral', 'limit', 'differentiat'], 'Calculus'],
    [['probability', 'chance', 'combination', 'permutation'], 'Probability'],
    [['mean', 'median', 'mode', 'variance', 'distribution', 'ogive'], 'Statistics'],
  ],
  Chemistry: [
    [['alkane', 'alkene', 'alcohol', 'carbonyl', 'ester', 'organic', 'hydrocarbon'], 'Organic'],
    [['periodic', 'metal', 'acid', 'salt', 'inorganic', 'base'], 'Inorganic'],
    [['rate', 'kinetic', 'enthalpy', 'gibbs', 'thermochemistry', 'electrochem'], 'Physical'],
    [['ligand', 'coordination', 'complex ion', 'transition metal'], 'Coordination Compounds'],
    [['equilibrium', 'le chatelier', 'kc', 'kp'], 'Equilibrium'],
  ],
  Biology: [
    [['cell', 'organelle', 'mitochondria', 'chloroplast', 'membrane'], 'Cell Biology'],
    [['gene', 'dna', 'allele', 'chromosome', 'inherit', 'mendel', 'heredity'], 'Genetics'],
    [['ecosystem', 'food web', 'biodiversity', 'population', 'pollution', 'environment'], 'Ecology'],
    [['respiration', 'circulation', 'digestion', 'kidney', 'hormone', 'nervous system', 'reproduction'], 'Human Physiology'],
    [['photosynthesis', 'xylem', 'phloem', 'stomata', 'plant', 'chlorophyll'], 'Plant Physiology'],
  ],
};

function bigramDice(a, b) {
  const grams = (s) => {
    const t = String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    const out = new Set();
    for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
    return out;
  };
  const A = grams(a); const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((g) => { if (B.has(g)) inter += 1; });
  return (2 * inter) / (A.size + B.size);
}

/**
 * snapTopic(subject, proposed, { allowed, fallback })
 *   allowed  — topic list to snap onto (defaults to the first board's syllabus for the subject)
 *   fallback — what to return when nothing matches (defaults to allowed[0])
 * Unknown subject with no topic list: the proposed label is kept.
 */
export function snapTopic(subject, proposed, { allowed, fallback } = {}) {
  const valid = (allowed && allowed.length ? allowed : topicsFor(null, subject)) || [];
  const p = proposed ? String(proposed).trim() : '';
  if (!valid.length) return p || fallback || 'General';
  const dflt = fallback || valid[0];
  if (!p) return dflt;
  const guess = p.toLowerCase();
  for (const t of valid) if (t.toLowerCase() === guess) return t;
  for (const [keywords, canonical] of KEYWORD_HINTS[subject] || []) {
    if (keywords.some((k) => guess.includes(k)) && valid.includes(canonical)) return canonical;
  }
  for (const t of valid) {
    const lt = t.toLowerCase();
    if (lt.includes(guess) || guess.includes(lt)) return t;
  }
  let best = dflt; let bestScore = 0;
  for (const t of valid) {
    const score = bigramDice(t, p);
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return bestScore >= 0.55 ? best : dflt;
}

// Same idea for the question text itself: when the AI gave no topic, guess
// one from the wording (keyword hints only — anything fuzzier is noise).
export function guessTopicFromText(subject, text, allowed) {
  const valid = (allowed && allowed.length ? allowed : topicsFor(null, subject)) || [];
  const t = String(text || '').toLowerCase();
  for (const [keywords, canonical] of KEYWORD_HINTS[subject] || []) {
    if (keywords.some((k) => t.includes(k)) && valid.includes(canonical)) return canonical;
  }
  return null;
}
