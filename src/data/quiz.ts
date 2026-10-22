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
