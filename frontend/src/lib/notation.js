// Textbook notation for question text: "3^2" → "3²", "x^-1" → "x⁻¹",
// "sqrt(2)" → "√2", "2 * 3" → "2 × 3", "H2O" → "H₂O", ">=" → "≥", "pi" → "π".
// Pure text → text; safe to run repeatedly. Anything it does not recognise
// is left exactly as written, and code-like tokens (URLs) are untouched.

const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'k': 'ᵏ', 'm': 'ᵐ', 'p': 'ᵖ', 't': 'ᵗ' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', 'n': 'ₙ', 'i': 'ᵢ', 'x': 'ₓ', 'a': 'ₐ', 'e': 'ₑ', 'k': 'ₖ', 'm': 'ₘ', 'p': 'ₚ', 't': 'ₜ' };

const toSup = (s) => [...s].map((c) => SUP[c] ?? null).every(Boolean) ? [...s].map((c) => SUP[c]).join('') : null;
const toSub = (s) => [...s].map((c) => SUB[c] ?? null).every(Boolean) ? [...s].map((c) => SUB[c]).join('') : null;

const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω', epsilon: 'ε' };

// Chemical formula elements for the subscript pass (H2O, CO2, C6H12O6, Fe2O3).
const ELEMENTS = /\b((?:H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Fe|Cu|Zn|Ag|Au|Hg|Pb|Sn|I|Br|Mn|Cr|Ni|Co|Ba|Sr|Ti)(?:\d+)?){2,}\b/g;

export function textbook(text) {
  if (text === null || text === undefined) return text;
  let s = String(text);
  if (!s || /https?:\/\//.test(s)) return s;

  // Protect nothing fancy; work left to right.
  // 1) Exponents: x^2, x^{12}, x^(n+1), 10^-3, e^x
  s = s.replace(/\^\{([^}]{1,12})\}/g, (m, e) => toSup(e) ?? m);
  s = s.replace(/\^\(([^)]{1,12})\)/g, (m, e) => toSup(e) ?? m);
  s = s.replace(/\^(-?[0-9]{1,4}|-?[a-z](?![a-z]))/g, (m, e) => toSup(e) ?? m);
  // 2) Subscripts written explicitly: a_1, x_{n}, a_n
  s = s.replace(/_\{([^}]{1,8})\}/g, (m, e) => toSub(e) ?? m);
  s = s.replace(/(?<=[A-Za-z])_([0-9]{1,3}|[a-z](?![a-z]))/g, (m, e) => toSub(e) ?? m);
  // 3) Chemical formulas: digits after element symbols become subscripts.
  s = s.replace(ELEMENTS, (f) => f.replace(/([A-Z][a-z]?)(\d+)/g, (m, el, n) => el + toSub(n)));
  // 4) Roots and functions
  s = s.replace(/\bsqrt\s*\(\s*([^()]{1,24})\s*\)/g, '√($1)').replace(/√\(([0-9a-zA-Z]{1,6})\)/g, '√$1');
  s = s.replace(/\b(?:root|sqrt)\s+([0-9a-zA-Z]{1,6})\b/g, '√$1');
  s = s.replace(/\bcbrt\s*\(([^()]{1,24})\)/g, '∛($1)');
  // 5) Operators and comparisons
  s = s.replace(/(?<=\S)\s*\*\s*(?=\S)/g, ' × ').replace(/\s{2,}/g, ' ');
  s = s.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠').replace(/\+\/-|\+-/g, '±').replace(/->/g, '→').replace(/<->/g, '⇌');
  s = s.replace(/\binfinity\b/gi, '∞');
  s = s.replace(/(\d)\s*(?:degrees?|deg)\b(\s*(?:C|F)\b)?/gi, (m, n, u) => `${n}°${u ? u.trim() : ''}`);
  // 6) Greek written out as words in maths/science context (pi, theta, ...)
  s = s.replace(/\b(alpha|beta|gamma|delta|Delta|theta|lambda|mu|pi|rho|sigma|Sigma|tau|phi|omega|Omega|epsilon)\b/g, (m, g) => GREEK[g] || m);
  // 7) Fractions: 1/2, 1/4, 3/4 as single glyphs when standalone
  s = s.replace(/(?<![\d/])1\/2(?![\d/])/g, '½').replace(/(?<![\d/])1\/4(?![\d/])/g, '¼').replace(/(?<![\d/])3\/4(?![\d/])/g, '¾').replace(/(?<![\d/])1\/3(?![\d/])/g, '⅓').replace(/(?<![\d/])2\/3(?![\d/])/g, '⅔');
  // 8) Units: m/s^2 handled by (1); m2 → m², cm3 → cm³
  s = s.replace(/\b(m|cm|mm|km|ft|in)([23])\b/g, (m, u, n) => u + toSup(n));
  return s;
}

// Apply to a question object without mutating it.
export function textbookQuestion(q) {
  if (!q) return q;
  return {
    ...q,
    q: textbook(q.q),
    options: Array.isArray(q.options) ? q.options.map(textbook) : q.options,
    typedAnswer: q.typedAnswer ? textbook(q.typedAnswer) : q.typedAnswer,
    typedAliases: Array.isArray(q.typedAliases) ? q.typedAliases.map(textbook) : q.typedAliases,
    examAnswer: q.examAnswer ? textbook(q.examAnswer) : q.examAnswer,
    markScheme: Array.isArray(q.markScheme) ? q.markScheme.map((p) => ({ ...p, point: textbook(p.point) })) : q.markScheme,
  };
}

// Reverse map used by the grader so a student typing "m/s^2" still matches
// an answer displayed as "m/s²".
const SUP_REV = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]));
const SUB_REV = Object.fromEntries(Object.entries(SUB).map(([k, v]) => [v, k]));
export function asciiNotation(text) {
  return String(text ?? '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱˣʸᵃᵇᶜᵈᵉᵏᵐᵖᵗ]+/g, (m) => '^' + [...m].map((c) => SUP_REV[c] ?? c).join(''))
    .replace(/[₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢₓₐₑₖₘₚₜ]+/g, (m) => [...m].map((c) => SUB_REV[c] ?? c).join(''))
    .replace(/√/g, 'sqrt').replace(/×/g, '*').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=').replace(/±/g, '+-').replace(/π/g, 'pi').replace(/°/g, ' deg').replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4').replace(/⅓/g, '1/3').replace(/⅔/g, '2/3');
}
