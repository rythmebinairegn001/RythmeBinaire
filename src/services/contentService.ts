/**
 * contentService — lecture / écriture du contenu pédagogique dans Supabase.
 *
 * Pourquoi ce fichier existe :
 * - La base Supabase exige des identifiants au format UUID.
 * - L'interface admin fabrique des identifiants texte ("course-coder-abc", "les-...").
 * - `toUuid` transforme n'importe quel identifiant texte en UUID STABLE
 *   (le même texte donne toujours le même UUID), et laisse un UUID inchangé.
 *
 * Tout ce qui est écrit ici lève une vraie erreur en cas d'échec (au lieu de
 * l'avaler en silence) pour que l'admin voie le problème.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PublicCourseItem, INITIAL_COURSES } from '../data/coursesData';
import {
  DetailedModule,
  DetailedLesson,
  getStaticModulesForCourse,
  registerCourseModules,
} from '../data/lessonsData';
import { ExerciseTest } from '../types/database';
import { EXERCISE_TESTS } from '../data/exerciseTestsData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

// Empreinte 128 bits déterministe (cyrb128)
function cyrb128(str: string): number[] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Identifiant texte -> UUID stable. Un UUID est renvoyé tel quel. */
export function toUuid(key: string): string {
  if (isUuid(key)) return key.toLowerCase();
  const [a, b, c, d] = cyrb128(key);
  const hex = (n: number) => n.toString(16).padStart(8, '0');
  const s = hex(a) + hex(b) + hex(c) + hex(d); // 32 caractères
  const variant = ((parseInt(s[16], 16) & 0x3) | 0x8).toString(16);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-5${s.slice(13, 16)}-${variant}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

/** Nouvel identifiant pour un élément créé par l'admin. */
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  return toUuid(`gen-${Date.now()}-${Math.random()}`);
}

function explain(action: string, err: any): Error {
  const code = err?.code || '';
  const msg = err?.message || String(err);
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(
      `${action} : refusé par la base. Vérifie que tu es connecté avec le compte administrateur (role = admin).`
    );
  }
  if (code === '23503') {
    return new Error(`${action} : l'élément parent n'existe pas encore dans la base (${msg}).`);
  }
  return new Error(`${action} : ${msg}`);
}

function check(action: string, res: { error: any }) {
  if (res && res.error) throw explain(action, res.error);
}

// ---------------------------------------------------------------------------
// COURS
// ---------------------------------------------------------------------------

const COURSE_SELECT = `
  *,
  course_translations ( lang, title, summary, description ),
  modules ( id, position, module_translations ( lang, title ), lessons ( id ) )
`;

function mapCourseRow(c: any): PublicCourseItem {
  const fr = c.course_translations?.find((t: any) => t.lang === 'fr');
  const en = c.course_translations?.find((t: any) => t.lang === 'en');
  const mods = [...(c.modules || [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((m: any) => {
      const mFr = m.module_translations?.find((t: any) => t.lang === 'fr');
      const mEn = m.module_translations?.find((t: any) => t.lang === 'en');
      return {
        id: m.id,
        position: m.position,
        lessonCount: (m.lessons || []).length,
        translations: {
          fr: { title: mFr?.title || 'Module' },
          en: { title: mEn?.title || '' },
        },
      };
    });
  return {
    id: c.id,
    track: c.track || 'coder',
    level: c.level || 'debutant',
    status: c.status || 'draft',
    created_at: c.created_at || new Date().toISOString(),
    estimated_hours: Number(c.estimated_hours) > 0 ? Number(c.estimated_hours) : 10,
    translations: {
      fr: {
        title: fr?.title || 'Sans titre',
        summary: fr?.summary || '',
        description: fr?.description || '',
      },
      en: {
        title: en?.title || '',
        summary: en?.summary || '',
        description: en?.description || '',
      },
    },
    modules: mods,
  };
}

/** Lit les cours dans Supabase. Lève une erreur si la requête échoue. */
export async function fetchCoursesFromDb(publishedOnly: boolean): Promise<PublicCourseItem[]> {
  let q = supabase.from('courses').select(COURSE_SELECT);
  if (publishedOnly) q = q.eq('status', 'published');
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw explain('Lecture des cours', error);
  return (data || []).map(mapCourseRow);
}

/** Crée ou met à jour un cours (et ses traductions). */
export async function saveCourseToDb(course: PublicCourseItem): Promise<string> {
  const id = toUuid(course.id);
  const base: Record<string, unknown> = {
    id,
    track: course.track,
    level: course.level,
    status: course.status,
    created_at: course.created_at,
  };

  // `estimated_hours` est une colonne optionnelle (voir SQL dans schema-sql.ts).
  let res = await supabase.from('courses').upsert({ ...base, estimated_hours: course.estimated_hours });
  if (res.error && /estimated_hours/i.test(res.error.message || '')) {
    res = await supabase.from('courses').upsert(base);
  }
  check('Enregistrement du cours', res);

  const fr = course.translations.fr;
  check(
    'Enregistrement du cours (FR)',
    await supabase
      .from('course_translations')
      .upsert(
        { course_id: id, lang: 'fr', title: fr.title || 'Sans titre', summary: fr.summary, description: fr.description },
        { onConflict: 'course_id,lang' }
      )
  );

  const en = course.translations.en;
  if (en?.title?.trim()) {
    check(
      'Enregistrement du cours (EN)',
      await supabase
        .from('course_translations')
        .upsert(
          { course_id: id, lang: 'en', title: en.title, summary: en.summary, description: en.description },
          { onConflict: 'course_id,lang' }
        )
    );
  } else {
    await supabase.from('course_translations').delete().eq('course_id', id).eq('lang', 'en');
  }
  return id;
}

export async function deleteCourseFromDb(courseId: string): Promise<void> {
  check('Suppression du cours', await supabase.from('courses').delete().eq('id', toUuid(courseId)));
}

// ---------------------------------------------------------------------------
// MODULES / LEÇONS / EXERCICES
// ---------------------------------------------------------------------------

/**
 * Lit modules + leçons + exercices de plusieurs cours en une seule requête.
 * Renvoie { [courseId]: DetailedModule[] }.
 */
export async function loadModulesFromDb(courseIds: string[]): Promise<Record<string, DetailedModule[]>> {
  const ids = courseIds.map(toUuid);
  const out: Record<string, DetailedModule[]> = {};
  ids.forEach((id) => (out[id] = []));
  if (ids.length === 0) return out;

  const { data, error } = await supabase
    .from('modules')
    .select(
      `id, course_id, position,
       module_translations ( lang, title ),
       lessons ( id, position,
         lesson_translations ( lang, title, content ),
         exercises ( id, type, language, starter_code,
           exercise_translations ( lang, instructions, hint_level_1, hint_level_2 ) ) )`
    )
    .in('course_id', ids)
    .order('position', { ascending: true });
  if (error) throw explain('Lecture du contenu des cours', error);

  for (const m of data || []) {
    const mFr = m.module_translations?.find((t: any) => t.lang === 'fr');
    const mEn = m.module_translations?.find((t: any) => t.lang === 'en');
    const lessons: DetailedLesson[] = [...(m.lessons || [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((l: any) => {
        const lFr = l.lesson_translations?.find((t: any) => t.lang === 'fr');
        const lEn = l.lesson_translations?.find((t: any) => t.lang === 'en');
        const ex = l.exercises?.[0];
        const lesson: DetailedLesson = {
          id: l.id,
          moduleId: m.id,
          courseId: m.course_id,
          position: l.position,
          translations: {
            fr: { title: lFr?.title || 'Leçon', content: lFr?.content || '' },
            ...(lEn ? { en: { title: lEn.title, content: lEn.content } } : {}),
          },
        };
        if (ex) {
          const eFr = ex.exercise_translations?.find((t: any) => t.lang === 'fr');
          const eEn = ex.exercise_translations?.find((t: any) => t.lang === 'en');
          lesson.exercise = {
            id: ex.id,
            type: ex.type || 'code_sandbox',
            language: ex.language || 'python',
            starter_code: ex.starter_code || '',
            instructions: { fr: eFr?.instructions || '', en: eEn?.instructions || undefined },
            hint_level_1: { fr: eFr?.hint_level_1 || undefined, en: eEn?.hint_level_1 || undefined },
            hint_level_2: { fr: eFr?.hint_level_2 || undefined, en: eEn?.hint_level_2 || undefined },
          };
        }
        return lesson;
      });
    (out[m.course_id] ||= []).push({
      id: m.id,
      courseId: m.course_id,
      position: m.position,
      translations: {
        fr: { title: mFr?.title || 'Module' },
        en: { title: mEn?.title || '' },
      },
      lessons,
    });
  }
  return out;
}

/** Charge le contenu des cours publiés et le met à disposition des pages élève. */
export async function loadAndRegisterContent(courseIds: string[]): Promise<void> {
  const byCourse = await loadModulesFromDb(courseIds);
  for (const id of Object.keys(byCourse)) registerCourseModules(id, byCourse[id]);
}

/**
 * Enregistre toute la structure d'un cours : modules, leçons, exercices, tests.
 * `testsByExercise` : tests à écrire, indexés par identifiant d'exercice (celui de l'interface).
 * Les éléments retirés dans l'interface sont supprimés dans la base (après les écritures).
 */
export async function saveModulesToDb(
  courseId: string,
  modules: DetailedModule[],
  testsByExercise: Record<string, ExerciseTest[] | undefined> = {}
): Promise<void> {
  const cId = toUuid(courseId);

  const modRows = modules.map((m, i) => ({ id: toUuid(m.id), course_id: cId, position: i + 1 }));
  if (modRows.length > 0) check('Enregistrement des modules', await supabase.from('modules').upsert(modRows));

  const modTr: any[] = [];
  const modEnDelete: string[] = [];
  const lessonRows: any[] = [];
  const lessonTr: any[] = [];
  const lessonEnDelete: string[] = [];
  const exRows: any[] = [];
  const exTr: any[] = [];
  const exEnDelete: string[] = [];
  const keepLessons: string[] = [];
  const keepExercises: string[] = [];
  const testPlans: Array<{ exId: string; tests: ExerciseTest[] }> = [];

  modules.forEach((m) => {
    const mId = toUuid(m.id);
    modTr.push({ module_id: mId, lang: 'fr', title: m.translations.fr.title || 'Module' });
    if (m.translations.en?.title?.trim()) modTr.push({ module_id: mId, lang: 'en', title: m.translations.en.title });
    else modEnDelete.push(mId);

    m.lessons.forEach((l, li) => {
      const lId = toUuid(l.id);
      keepLessons.push(lId);
      lessonRows.push({ id: lId, module_id: mId, position: li + 1 });
      lessonTr.push({ lesson_id: lId, lang: 'fr', title: l.translations.fr.title || 'Leçon', content: l.translations.fr.content || '' });
      const le = l.translations.en;
      if (le?.title?.trim()) lessonTr.push({ lesson_id: lId, lang: 'en', title: le.title, content: le.content || '' });
      else lessonEnDelete.push(lId);

      if (l.exercise) {
        const eId = toUuid(l.exercise.id);
        keepExercises.push(eId);
        exRows.push({
          id: eId,
          lesson_id: lId,
          type: l.exercise.type || 'code_sandbox',
          language: l.exercise.language || 'python',
          starter_code: l.exercise.starter_code || '',
        });
        exTr.push({
          exercise_id: eId,
          lang: 'fr',
          instructions: l.exercise.instructions.fr || '',
          hint_level_1: l.exercise.hint_level_1?.fr || null,
          hint_level_2: l.exercise.hint_level_2?.fr || null,
        });
        const enI = l.exercise.instructions.en;
        if (enI?.trim()) {
          exTr.push({
            exercise_id: eId,
            lang: 'en',
            instructions: enI,
            hint_level_1: l.exercise.hint_level_1?.en || null,
            hint_level_2: l.exercise.hint_level_2?.en || null,
          });
        } else exEnDelete.push(eId);
        const tests = testsByExercise[l.exercise.id];
        if (tests) testPlans.push({ exId: eId, tests });
      }
    });
  });

  if (modTr.length) check('Titres des modules', await supabase.from('module_translations').upsert(modTr, { onConflict: 'module_id,lang' }));
  if (modEnDelete.length) await supabase.from('module_translations').delete().in('module_id', modEnDelete).eq('lang', 'en');

  if (lessonRows.length) check('Enregistrement des leçons', await supabase.from('lessons').upsert(lessonRows));
  if (lessonTr.length) check('Texte des leçons', await supabase.from('lesson_translations').upsert(lessonTr, { onConflict: 'lesson_id,lang' }));
  if (lessonEnDelete.length) await supabase.from('lesson_translations').delete().in('lesson_id', lessonEnDelete).eq('lang', 'en');

  if (exRows.length) check('Enregistrement des exercices', await supabase.from('exercises').upsert(exRows));
  if (exTr.length) check("Consignes des exercices", await supabase.from('exercise_translations').upsert(exTr, { onConflict: 'exercise_id,lang' }));
  if (exEnDelete.length) await supabase.from('exercise_translations').delete().in('exercise_id', exEnDelete).eq('lang', 'en');

  for (const plan of testPlans) {
    check('Tests (nettoyage)', await supabase.from('exercise_tests').delete().eq('exercise_id', plan.exId));
    if (plan.tests.length) {
      check(
        'Tests des exercices',
        await supabase.from('exercise_tests').insert(
          plan.tests.map((t) => ({
            exercise_id: plan.exId,
            input: t.input ?? null,
            expected_output: t.expected_output ?? '',
            is_hidden: !!t.is_hidden,
          }))
        )
      );
    }
  }

  // --- Nettoyage : ce qui n'existe plus dans l'interface disparaît de la base ---
  const keepMods = modRows.map((r) => r.id);
  const { data: dbMods, error: mErr } = await supabase.from('modules').select('id').eq('course_id', cId);
  if (mErr) throw explain('Nettoyage des modules', mErr);
  const staleMods = (dbMods || []).map((r: any) => r.id).filter((id: string) => !keepMods.includes(id));
  if (staleMods.length) check('Suppression de modules', await supabase.from('modules').delete().in('id', staleMods));

  if (keepMods.length) {
    const { data: dbLessons } = await supabase.from('lessons').select('id').in('module_id', keepMods);
    const staleLessons = (dbLessons || []).map((r: any) => r.id).filter((id: string) => !keepLessons.includes(id));
    if (staleLessons.length) check('Suppression de leçons', await supabase.from('lessons').delete().in('id', staleLessons));
  }
  if (keepLessons.length) {
    const { data: dbEx } = await supabase.from('exercises').select('id').in('lesson_id', keepLessons);
    const staleEx = (dbEx || []).map((r: any) => r.id).filter((id: string) => !keepExercises.includes(id));
    if (staleEx.length) check("Suppression d'exercices", await supabase.from('exercises').delete().in('id', staleEx));
  }
}

/** Tests d'un exercice depuis la base (l'admin voit aussi les tests cachés). */
export async function loadTestsFromDb(exerciseId: string): Promise<ExerciseTest[]> {
  const { data, error } = await supabase.from('exercise_tests').select('*').eq('exercise_id', toUuid(exerciseId));
  if (error) throw explain('Lecture des tests', error);
  return (data || []).map((t: any) => ({
    id: t.id,
    exercise_id: t.exercise_id,
    input: t.input,
    expected_output: t.expected_output,
    is_hidden: !!t.is_hidden,
  }));
}

// ---------------------------------------------------------------------------
// IMPORT DES COURS D'EXEMPLE
// ---------------------------------------------------------------------------

/**
 * Copie les cours d'exemple (ceux écrits dans le code) vers la base, en brouillon.
 * Renvoie le nombre de cours importés.
 */
export async function importSampleCourses(): Promise<number> {
  if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
  let count = 0;
  for (const sample of INITIAL_COURSES) {
    const modules = getStaticModulesForCourse(sample.id);
    const course: PublicCourseItem = { ...sample, status: 'draft' };
    await saveCourseToDb(course);
    if (modules.length > 0) {
      const cId = toUuid(sample.id);
      const fixed = modules.map((m) => ({ ...m, courseId: cId }));
      const tests: Record<string, ExerciseTest[]> = {};
      for (const m of fixed)
        for (const l of m.lessons)
          if (l.exercise && EXERCISE_TESTS[l.exercise.id]) tests[l.exercise.id] = EXERCISE_TESTS[l.exercise.id];
      await saveModulesToDb(sample.id, fixed, tests);
    }
    count++;
  }
  return count;
}
