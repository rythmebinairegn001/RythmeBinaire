import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DETAILED_COURSE_MODULES } from '../data/lessonsData';

/**
 * Espace professeur (voir supabase/professeurs.sql).
 * Un professeur crée des classes, donne un code aux élèves, suit leur progression et leur écrit.
 * Les règles de sécurité sont dans la base : un professeur ne lit que les élèves de SES classes.
 */

export interface TeacherClass {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  open: boolean;
  created_at: string;
  /** Lien d'invitation du groupe WhatsApp de la classe (facultatif ; nécessite supabase/classes-whatsapp.sql). */
  whatsapp_url?: string | null;
}

export interface ClassStudent {
  id: string;
  email: string;
  full_name: string | null;
  joined_at: string;
  /** Compte enfant supervisé : jamais d'e-mail ni d'identifiant, pas de message direct. */
  is_child?: boolean;
}

export interface Completion {
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed_at: string;
}

export type Activity = 'active' | 'quiet' | 'inactive' | 'never';

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  isChild: boolean;
  /** Leçons terminées dans les cours suivis par la classe (tous les cours si aucun n'est choisi). */
  lessonsDone: number;
  /** 0–100 ; null si le total de leçons est inconnu. */
  percent: number | null;
  lastActive: string | null;
  activity: Activity;
}

export interface ClassOverview {
  rows: StudentRow[];
  counts: Record<Activity, number>;
  /** Moyenne des pourcentages connus (arrondie), null si aucune donnée. */
  averagePercent: number | null;
}

const DAY = 86_400_000;

/** Actif ≤ 7 jours, « calme » ≤ 21 jours, sinon inactif ; jamais = aucune leçon terminée. */
export function activityOf(lastActive: string | null, now: Date = new Date()): Activity {
  if (!lastActive) return 'never';
  const age = now.getTime() - new Date(lastActive).getTime();
  if (age <= 7 * DAY) return 'active';
  if (age <= 21 * DAY) return 'quiet';
  return 'inactive';
}

/**
 * Calcule le tableau de suivi d'une classe. Fonction pure (testable sans base).
 * `trackedCourseIds` vide = on compte toutes les leçons terminées. `totalLessons` = total de leçons des cours suivis.
 */
export function computeClassOverview(
  students: ClassStudent[],
  completions: Completion[],
  trackedCourseIds: string[],
  totalLessons: number,
  now: Date = new Date(),
): ClassOverview {
  const tracked = new Set(trackedCourseIds);
  const rows: StudentRow[] = students.map((s) => {
    const mine = completions.filter((c) => c.user_id === s.id);
    const counted = tracked.size ? mine.filter((c) => tracked.has(c.course_id)) : mine;
    const lessonsDone = new Set(counted.map((c) => `${c.course_id}::${c.lesson_id}`)).size;
    const last = mine.reduce<string | null>((acc, c) => (!acc || c.completed_at > acc ? c.completed_at : acc), null);
    const percent = tracked.size && totalLessons > 0 ? Math.min(100, Math.round((lessonsDone / totalLessons) * 100)) : null;
    return {
      id: s.id,
      name: s.full_name?.trim() || (s.is_child ? 'Enfant' : s.email),
      email: s.is_child ? '' : s.email,
      isChild: !!s.is_child,
      lessonsDone,
      percent,
      lastActive: last,
      activity: activityOf(last, now),
    };
  });
  // Les élèves à relancer d'abord (inactifs/jamais), puis par progression croissante
  const order: Record<Activity, number> = { inactive: 0, never: 1, quiet: 2, active: 3 };
  rows.sort((a, b) => order[a.activity] - order[b.activity] || (a.percent ?? a.lessonsDone) - (b.percent ?? b.lessonsDone) || a.name.localeCompare(b.name));
  const counts: Record<Activity, number> = { active: 0, quiet: 0, inactive: 0, never: 0 };
  rows.forEach((r) => counts[r.activity]++);
  const known = rows.filter((r) => r.percent !== null) as (StudentRow & { percent: number })[];
  const averagePercent = known.length ? Math.round(known.reduce((n, r) => n + r.percent, 0) / known.length) : null;
  return { rows, counts, averagePercent };
}

/** Export CSV simple (ouvrable dans Excel) du suivi d'une classe. */
export function overviewToCsv(rows: StudentRow[], lang: 'fr' | 'en'): string {
  const head = lang === 'fr' ? ['Nom', 'E-mail', 'Leçons terminées', 'Progression %', 'Dernière activité'] : ['Name', 'E-mail', 'Lessons done', 'Progress %', 'Last activity'];
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(';')];
  for (const r of rows) lines.push([r.name, r.email, r.lessonsDone, r.percent ?? '', r.lastActive ? r.lastActive.slice(0, 10) : ''].map(esc).join(';'));
  return '﻿' + lines.join('\r\n');
}

const NO_BACKEND = 'Supabase non configuré';

// ---------------------------------------------------------------- Lecture / écriture

export async function loadIsTeacher(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data } = await supabase.from('teachers').select('user_id').eq('user_id', userId).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function listMyClasses(teacherId: string): Promise<TeacherClass[]> {
  const { data, error } = await supabase.from('classes').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as TeacherClass[];
}

export async function createClass(teacherId: string, name: string): Promise<TeacherClass> {
  const clean = name.trim();
  if (!clean) throw new Error('empty_name');
  const { data, error } = await supabase.from('classes').insert({ teacher_id: teacherId, name: clean.slice(0, 80) }).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data as TeacherClass;
}

export async function setClassOpen(classId: string, open: boolean): Promise<void> {
  const { error } = await supabase.from('classes').update({ open }).eq('id', classId);
  if (error) throw new Error(error.message);
}

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw new Error(error.message);
}

export async function listClassCourses(classId: string): Promise<string[]> {
  const { data, error } = await supabase.from('class_courses').select('course_id').eq('class_id', classId);
  if (error) throw new Error(error.message);
  return ((data || []) as { course_id: string }[]).map((r) => r.course_id);
}

export async function setCourseTracked(classId: string, courseId: string, tracked: boolean): Promise<void> {
  if (tracked) {
    const { error } = await supabase.from('class_courses').upsert({ class_id: classId, course_id: courseId }, { onConflict: 'class_id,course_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('class_courses').delete().eq('class_id', classId).eq('course_id', courseId);
    if (error) throw new Error(error.message);
  }
}

/** Nombre total de leçons des cours donnés (base d'abord, contenu d'exemple en secours). */
export async function countLessons(courseIds: string[]): Promise<number> {
  if (!courseIds.length) return 0;
  const perCourse = new Map<string, number>();
  try {
    const { data } = await supabase.from('modules').select('course_id, lessons(id)').in('course_id', courseIds);
    for (const m of (data || []) as { course_id: string; lessons?: { id: string }[] }[]) {
      perCourse.set(m.course_id, (perCourse.get(m.course_id) || 0) + (m.lessons?.length || 0));
    }
  } catch {
    // on retombe sur le contenu d'exemple ci-dessous
  }
  let total = 0;
  for (const id of courseIds) {
    const fromDb = perCourse.get(id) || 0;
    const fromStatic = (DETAILED_COURSE_MODULES[id] || []).reduce((n, m) => n + m.lessons.length, 0);
    total += fromDb || fromStatic;
  }
  return total;
}

/** Élèves d'une classe + leurs leçons terminées. */
export async function loadClassData(classId: string): Promise<{ students: ClassStudent[]; completions: Completion[] }> {
  // Liste protégée (les enfants apparaissent sans e-mail) ; repli sur l'ancienne lecture si enfants-v2.sql n'est pas exécuté.
  try {
    const r = await supabase.rpc('class_roster', { p_class: classId });
    if (!r.error && Array.isArray(r.data)) {
      const roster = r.data as { student_id: string; full_name: string | null; email: string | null; is_child: boolean; joined_at: string }[];
      if (!roster.length) return { students: [], completions: [] };
      const { data: prog } = await supabase.from('lesson_progress').select('user_id, course_id, lesson_id, completed_at').in('user_id', roster.map((m) => m.student_id));
      return {
        students: roster.map((m) => ({ id: m.student_id, email: m.email || '', full_name: m.full_name, joined_at: m.joined_at, is_child: m.is_child })),
        completions: ((prog || []) as Completion[]).filter((c) => !!c.completed_at),
      };
    }
  } catch {
    /* repli ci-dessous */
  }
  const { data: members, error } = await supabase.from('class_members').select('student_id, joined_at').eq('class_id', classId);
  if (error) throw new Error(error.message);
  const list = (members || []) as { student_id: string; joined_at: string }[];
  if (!list.length) return { students: [], completions: [] };
  const ids = list.map((m) => m.student_id);
  const [{ data: users }, { data: prog }] = await Promise.all([
    supabase.from('users').select('id, email, full_name').in('id', ids),
    supabase.from('lesson_progress').select('user_id, course_id, lesson_id, completed_at').in('user_id', ids),
  ]);
  const byId = new Map(((users || []) as { id: string; email: string; full_name: string | null }[]).map((u) => [u.id, u]));
  const students: ClassStudent[] = list.map((m) => ({
    id: m.student_id,
    email: byId.get(m.student_id)?.email || '—',
    full_name: byId.get(m.student_id)?.full_name ?? null,
    joined_at: m.joined_at,
  }));
  return { students, completions: ((prog || []) as Completion[]).filter((c) => !!c.completed_at) };
}

export async function removeStudent(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId);
  if (error) throw new Error(error.message);
}

export async function sendMessage(classId: string, teacherId: string, studentId: string, body: string): Promise<void> {
  const clean = body.trim();
  if (!clean) throw new Error('empty_message');
  const { error } = await supabase.from('teacher_messages').insert({ class_id: classId, teacher_id: teacherId, student_id: studentId, body: clean.slice(0, 1000) });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- Relecture du code des élèves

export interface StudentSubmission {
  id: string;
  exercise_id: string;
  code: string;
  status: 'pass' | 'fail' | 'error';
  created_at: string;
  /** Début de l'énoncé de l'exercice (une ligne), pour s'y retrouver. */
  exercise_label: string;
}

/** Réduit un texte à une ligne courte (espaces et retours à la ligne compactés). */
export function oneLine(text: string | null | undefined, max = 80): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Message de correction qui rappelle l'exercice commenté. */
export function withExercisePrefix(label: string): string {
  return label ? `[Exercice : ${oneLine(label, 60)}] ` : '';
}

/** Dernières soumissions de code d'un élève (le professeur doit avoir cet élève dans une de ses classes). */
export async function loadStudentSubmissions(studentId: string, limit = 30): Promise<StudentSubmission[]> {
  const { data, error } = await supabase
    .from('exercise_submissions')
    .select('id, exercise_id, code_submitted, status, created_at')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data || []) as { id: string; exercise_id: string; code_submitted: string; status: StudentSubmission['status']; created_at: string }[];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.exercise_id))];
  const labels = new Map<string, string>();
  try {
    const { data: tr } = await supabase.from('exercise_translations').select('exercise_id, lang, instructions').in('exercise_id', ids);
    const list = (tr || []) as { exercise_id: string; lang: string; instructions: string }[];
    for (const lang of ['en', 'fr']) for (const t of list) if (t.lang === lang) labels.set(t.exercise_id, oneLine(t.instructions));
  } catch {
    // énoncés indisponibles : on affiche quand même le code
  }
  return rows.map((r) => ({ id: r.id, exercise_id: r.exercise_id, code: r.code_submitted, status: r.status, created_at: r.created_at, exercise_label: labels.get(r.exercise_id) || '' }));
}

// ---------------------------------------------------------------- Côté élève

export interface MyClass {
  class_id: string;
  class_name: string;
  teacher_name: string;
  joined_at: string;
}
export interface TeacherMessage {
  id: string;
  class_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export async function listMyJoinedClasses(): Promise<MyClass[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.rpc('my_classes');
    if (error) return [];
    return (data || []) as MyClass[];
  } catch {
    return [];
  }
}

/** Messages de mes professeurs, du plus récent au plus ancien. */
export async function listMyMessages(studentId: string): Promise<TeacherMessage[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data } = await supabase.from('teacher_messages').select('id, class_id, body, created_at, read_at').eq('student_id', studentId).order('created_at', { ascending: false });
    return (data || []) as TeacherMessage[];
  } catch {
    return [];
  }
}

export async function markMessagesRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await supabase.from('teacher_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
}

export type JoinError = 'invalid_code' | 'child_account' | 'own_class' | 'unknown';

/** Rejoint une classe avec son code. Lance une Error dont le message est un JoinError. */
export async function joinClass(code: string): Promise<{ class_id: string; class_name: string }> {
  if (!isSupabaseConfigured()) throw new Error(NO_BACKEND);
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) throw new Error('invalid_code' satisfies JoinError);
  const { data, error } = await supabase.rpc('join_class', { p_code: clean });
  if (error) {
    const m = error.message || '';
    const kind: JoinError = m.includes('child_account') ? 'child_account' : m.includes('own_class') ? 'own_class' : m.includes('invalid_code') ? 'invalid_code' : 'unknown';
    throw new Error(kind);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { class_id: string; class_name: string } | undefined;
  if (!row) throw new Error('invalid_code' satisfies JoinError);
  return row;
}

export async function leaveClass(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- Admin : désigner les professeurs

export interface TeacherEntry {
  user_id: string;
  email: string;
  full_name: string | null;
}

export async function listTeachers(): Promise<TeacherEntry[]> {
  const { data: t, error } = await supabase.from('teachers').select('user_id');
  if (error) throw new Error(error.message);
  const ids = ((t || []) as { user_id: string }[]).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: users } = await supabase.from('users').select('id, email, full_name').in('id', ids);
  return ((users || []) as { id: string; email: string; full_name: string | null }[]).map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }));
}

/** Désigne un professeur à partir de son e-mail (le compte doit déjà exister). */
export async function addTeacherByEmail(email: string): Promise<'added' | 'not_registered' | 'already' | 'invalid'> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return 'invalid';
  const { data: u } = await supabase.from('users').select('id').eq('email', clean).maybeSingle();
  if (!u) return 'not_registered';
  const { data: ex } = await supabase.from('teachers').select('user_id').eq('user_id', (u as { id: string }).id).maybeSingle();
  if (ex) return 'already';
  const { error } = await supabase.from('teachers').insert({ user_id: (u as { id: string }).id });
  if (error) throw new Error(error.message);
  return 'added';
}

export async function removeTeacher(userId: string): Promise<void> {
  const { error } = await supabase.from('teachers').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** Lien d'invitation d'un groupe WhatsApp : https://chat.whatsapp.com/<code> (rien d'autre n'est accepté). */
export const WHATSAPP_GROUP_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;
export function normalizeWhatsappGroupUrl(raw: string): string | null {
  const u = raw.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  return WHATSAPP_GROUP_RE.test(u) ? u : null;
}

/** Le professeur enregistre (ou efface avec une chaîne vide) le groupe WhatsApp de sa classe. */
export async function setClassWhatsapp(classId: string, raw: string): Promise<void> {
  const clean = raw.trim();
  const url = clean ? normalizeWhatsappGroupUrl(clean) : null;
  if (clean && !url) throw new Error('whatsapp_invalid');
  const { error } = await supabase.from('classes').update({ whatsapp_url: url }).eq('id', classId);
  if (error) throw new Error(error.message);
}

/** Liens WhatsApp de mes classes (vide pour un compte enfant ou si le script SQL n'est pas lancé). */
export async function listMyClassLinks(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase.rpc('my_class_links');
    if (error) return {};
    const out: Record<string, string> = {};
    for (const r of (data || []) as { class_id: string; whatsapp_url: string }[]) if (r.whatsapp_url) out[r.class_id] = r.whatsapp_url;
    return out;
  } catch {
    return {};
  }
}
