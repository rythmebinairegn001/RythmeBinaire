/**
 * Exercices de type « quiz » (questions à choix multiples, corrigées automatiquement).
 *
 * Le quiz est stocké dans une exercice normale (type = 'quiz') : les questions sont écrites en JSON
 * dans le champ « consigne » de chaque langue (FR et EN), ce qui garde le modèle de données bilingue
 * sans nouvelle table. Les bonnes réponses sont vérifiées dans le navigateur de l'élève :
 * c'est un outil d'entraînement, pas un examen noté.
 */
export interface QuizQuestion {
  /** Énoncé de la question */
  q: string;
  /** 2 à 6 réponses possibles */
  options: string[];
  /** Position (à partir de 0) de la bonne réponse. Tableau si plusieurs bonnes réponses. */
  answer: number | number[];
  /** Courte explication affichée après la correction */
  explain?: string;
}

export interface QuizDefinition {
  /** Pourcentage minimal pour valider la leçon (60 par défaut : 2 bonnes réponses sur 3) */
  pass_percent?: number;
  questions: QuizQuestion[];
}

export const QUIZ_TYPE = 'quiz';
export const DEFAULT_PASS_PERCENT = 60;

/** Lit et vérifie un quiz. Renvoie null si le texte n'est pas un quiz valide. */
export function parseQuiz(raw: string | undefined | null): QuizDefinition | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const d = data as Partial<QuizDefinition> | null;
  if (!d || !Array.isArray(d.questions) || d.questions.length === 0) return null;
  for (const q of d.questions) {
    if (!q || typeof q.q !== 'string' || !q.q.trim()) return null;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) return null;
    if (q.options.some((o) => typeof o !== 'string' || !o.trim())) return null;
    const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (answers.length === 0) return null;
    for (const a of answers) {
      if (!Number.isInteger(a) || a < 0 || a >= q.options.length) return null;
    }
  }
  return d as QuizDefinition;
}

/** Message d'erreur lisible pour la validation d'un fichier de cours, ou null si tout va bien. */
export function quizProblem(raw: string | undefined | null): string | null {
  return parseQuiz(raw) ? null : 'quiz invalide (JSON illisible, question vide, réponse hors liste…)';
}

export function correctSet(q: QuizQuestion): number[] {
  return (Array.isArray(q.answer) ? [...q.answer] : [q.answer]).sort((a, b) => a - b);
}

/** Une question est juste si l'élève a coché exactement les bonnes réponses. */
export function isQuestionCorrect(q: QuizQuestion, picked: number[]): boolean {
  const want = correctSet(q);
  const got = [...picked].sort((a, b) => a - b);
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

export interface QuizScore {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
}

export function scoreQuiz(quiz: QuizDefinition, picks: number[][]): QuizScore {
  const total = quiz.questions.length;
  const correct = quiz.questions.filter((q, i) => isQuestionCorrect(q, picks[i] || [])).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent, passed: percent >= (quiz.pass_percent ?? DEFAULT_PASS_PERCENT) };
}

// ---------------------------------------------------------------- Édition (Administration)

/** Question en cours d'édition : champs toujours présents, réponses toujours sous forme de liste. */
export interface QuizDraftQuestion {
  q: string;
  options: string[];
  answer: number[];
  explain: string;
}

export function emptyDraftQuestion(): QuizDraftQuestion {
  return { q: '', options: ['', '', ''], answer: [0], explain: '' };
}

export function quizToDraft(def: QuizDefinition | null): QuizDraftQuestion[] {
  if (!def) return [];
  return def.questions.map((q) => ({ q: q.q, options: [...q.options], answer: correctSet(q), explain: q.explain || '' }));
}

/** Problème bloquant d'un brouillon (message lisible), ou null s'il est publiable. */
export function draftProblem(draft: QuizDraftQuestion[]): string | null {
  if (draft.length === 0) return 'ajoute au moins une question';
  for (let i = 0; i < draft.length; i++) {
    const d = draft[i];
    const n = i + 1;
    if (!d.q.trim()) return `question ${n} : l’énoncé est vide`;
    const filled = d.options.filter((o) => o.trim());
    if (filled.length < 2) return `question ${n} : au moins 2 réponses possibles`;
    if (d.answer.length === 0) return `question ${n} : coche la bonne réponse`;
    if (d.answer.some((a) => !d.options[a] || !d.options[a].trim())) return `question ${n} : la bonne réponse est vide`;
  }
  return null;
}

/** Transforme le brouillon en quiz enregistrable : retire les réponses vides en recalant les positions. */
export function draftToQuiz(draft: QuizDraftQuestion[], passPercent?: number): QuizDefinition {
  const questions: QuizQuestion[] = draft.map((d) => {
    const keep: number[] = [];
    d.options.forEach((o, i) => { if (o.trim()) keep.push(i); });
    const answer = d.answer.filter((a) => keep.includes(a)).map((a) => keep.indexOf(a)).sort((a, b) => a - b);
    const out: QuizQuestion = {
      q: d.q.trim(),
      options: keep.map((i) => d.options[i].trim()),
      answer: answer.length === 1 ? answer[0] : answer,
    };
    if (d.explain.trim()) out.explain = d.explain.trim();
    return out;
  });
  const def: QuizDefinition = { questions };
  if (passPercent && passPercent !== DEFAULT_PASS_PERCENT) def.pass_percent = passPercent;
  return def;
}
