/**
 * Révision espacée (méthode des boîtes de Leitner) — calculs purs, sans réseau.
 *
 * Une question entre dans la révision dès qu'elle a été ratée une fois dans un quiz.
 * Ensuite on suit tous les « événements » de cette question : réponses d'un quiz (juste si absente de la liste
 * des erreurs de la tentative) et réponses de révision. Une mauvaise réponse remet la question à zéro ;
 * une bonne réponse (à au moins 12 h de la précédente, pour ne pas compter les essais de la même séance)
 * la fait monter d'une boîte. Délais avant la prochaine révision : 1, 3, 7, 14, 30 jours.
 * Après 5 bonnes réponses d'affilée, la question est considérée comme acquise.
 */
import type { QuizAttempt } from './quizAttemptStats';

export interface QuizReviewRow {
  course_id: string;
  lesson_id: string;
  q_index: number;
  correct: boolean;
  created_at: string;
}

export const INTERVAL_DAYS = [1, 3, 7, 14, 30];
const DAY = 86_400_000;
const SAME_SESSION_MS = 12 * 3_600_000;

export interface ReviewItem {
  key: string;
  courseId: string;
  lessonId: string;
  qIndex: number;
  courseTitle: string;
  lessonTitle: string;
  /** Boîte actuelle : 0 = vient d'être ratée … 4 = presque acquise */
  box: number;
  dueAt: number;
  due: boolean;
}

export interface ReviewState {
  items: ReviewItem[];
  dueCount: number;
  /** Questions ratées au moins une fois et maintenant acquises (5 bonnes réponses d'affilée) */
  masteredCount: number;
  /** Questions en cours de révision (pas encore acquises) */
  learningCount: number;
}

interface Ev {
  t: number;
  correct: boolean;
}

export function computeReviewState(attempts: QuizAttempt[], reviews: QuizReviewRow[], now: Date = new Date()): ReviewState {
  const events = new Map<string, Ev[]>();
  const meta = new Map<string, { courseId: string; lessonId: string; qIndex: number; courseTitle: string; lessonTitle: string }>();
  const push = (key: string, ev: Ev) => {
    if (!events.has(key)) events.set(key, []);
    events.get(key)!.push(ev);
  };

  // 1. Questions « à suivre » : celles ratées au moins une fois dans un quiz, par leçon
  const byLesson = new Map<string, QuizAttempt[]>();
  for (const a of attempts) {
    const lk = `${a.course_id}::${a.lesson_id}`;
    if (!byLesson.has(lk)) byLesson.set(lk, []);
    byLesson.get(lk)!.push(a);
  }
  for (const [lk, list] of byLesson) {
    const wrongIdx = new Set<number>();
    for (const a of list) for (const w of a.wrong || []) wrongIdx.add(w.i);
    for (const i of wrongIdx) {
      const key = `${lk}::${i}`;
      const last = list[list.length - 1];
      meta.set(key, { courseId: list[0].course_id, lessonId: list[0].lesson_id, qIndex: i, courseTitle: last.course_title, lessonTitle: last.lesson_title });
      for (const a of list) {
        if (i >= a.total) continue; // le quiz a changé depuis : on ignore
        push(key, { t: new Date(a.created_at).getTime(), correct: !(a.wrong || []).some((w) => w.i === i) });
      }
    }
  }
  // 2. Réponses données en révision
  for (const r of reviews) {
    const key = `${r.course_id}::${r.lesson_id}::${r.q_index}`;
    if (!meta.has(key)) continue;
    push(key, { t: new Date(r.created_at).getTime(), correct: r.correct });
  }

  const items: ReviewItem[] = [];
  let mastered = 0;
  for (const [key, evs] of events) {
    evs.sort((a, b) => a.t - b.t);
    let box = 0;
    let last = evs[0]?.t ?? 0;
    let started = false;
    for (const e of evs) {
      if (!e.correct) {
        box = 0;
        last = e.t;
        started = true;
      } else if (started && e.t - last >= SAME_SESSION_MS) {
        box += 1;
        last = e.t;
      }
    }
    if (!started) continue; // jamais ratée (ne devrait pas arriver)
    if (box >= INTERVAL_DAYS.length) {
      mastered += 1;
      continue;
    }
    const dueAt = last + INTERVAL_DAYS[box] * DAY;
    const m = meta.get(key)!;
    items.push({ key, ...m, box, dueAt, due: dueAt <= now.getTime() });
  }
  items.sort((a, b) => a.dueAt - b.dueAt);
  return { items, dueCount: items.filter((i) => i.due).length, masteredCount: mastered, learningCount: items.length };
}

/** Prochaine séance : jusqu'à `max` questions à réviser, les plus en retard d'abord, pas plus de 2 par leçon pour varier. */
export function pickSession(state: ReviewState, max = 5): ReviewItem[] {
  const perLesson = new Map<string, number>();
  const out: ReviewItem[] = [];
  for (const it of state.items) {
    if (!it.due) continue;
    const k = `${it.courseId}::${it.lessonId}`;
    if ((perLesson.get(k) || 0) >= 2) continue;
    perLesson.set(k, (perLesson.get(k) || 0) + 1);
    out.push(it);
    if (out.length >= max) break;
  }
  // complète si on n'a pas atteint `max` à cause de la limite par leçon
  if (out.length < max) {
    for (const it of state.items) {
      if (!it.due || out.includes(it)) continue;
      out.push(it);
      if (out.length >= max) break;
    }
  }
  return out;
}
