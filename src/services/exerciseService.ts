import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ExerciseTest, ExerciseSubmission, AiHintRequest } from '../types/database';
import { getTestsForExercise } from '../data/exerciseTestsData';
import { runLocally } from './codeRunner';
import { saveTests, loadTests } from '../lib/offlineStore';

export interface ExecuteRequest {
  exercise_id: string;
  language: string;
  code: string;
  tests: ExerciseTest[];
}

export interface FailedTestDetail {
  test_id?: string;
  expected?: string;
  actual?: string;
  message?: string;
}

export interface ExecuteResponse {
  status: 'pass' | 'fail' | 'error';
  output: string;
  execution_time_ms: number;
  failed_tests: FailedTestDetail[];
}

export interface HintRequest {
  user_id: string;
  exercise_id: string;
  code: string;
  current_hint_level: number;
  language: string;
  /** Dernière sortie de la console (aide le tuteur à repérer l'erreur). */
  last_output?: string;
}

export interface HintResponse {
  hint_level: number;
  hint_text: string;
  is_final_solution: boolean;
}

type LocalExerciseSubmission = ExerciseSubmission & { output: string };
type LocalAiHintRequest = AiHintRequest & { is_final_solution: boolean };

const DAILY_HINT_QUOTA = 20;
const HINTS_STORAGE_KEY_PREFIX = 'rythmebinaire_ai_hints_';
const SUBMISSIONS_STORAGE_KEY_PREFIX = 'rythmebinaire_submissions_';

// Local storage helpers
function getLocalHints(userId: string): LocalAiHintRequest[] {
  try {
    const raw = localStorage.getItem(`${HINTS_STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHints(userId: string, hints: LocalAiHintRequest[]): void {
  try {
    localStorage.setItem(`${HINTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(hints));
  } catch (e) {
    console.error('Failed to save hints locally:', e);
  }
}

function getLocalSubmissions(userId: string): LocalExerciseSubmission[] {
  try {
    const raw = localStorage.getItem(`${SUBMISSIONS_STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubmissions(userId: string, subs: LocalExerciseSubmission[]): void {
  try {
    localStorage.setItem(`${SUBMISSIONS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(subs));
  } catch (e) {
    console.error('Failed to save submissions locally:', e);
  }
}

/**
 * Fetch tests associated with an exercise (from Supabase exercise_tests or local dataset)
 */
export async function fetchExerciseTests(exerciseId: string): Promise<ExerciseTest[]> {
  const fallbackTests = getTestsForExercise(exerciseId);

  if (!isSupabaseConfigured()) {
    return fallbackTests;
  }

  try {
    const { data, error } = await supabase
      .from('exercise_tests')
      .select('*')
      .eq('exercise_id', exerciseId);

    if (error || !data || data.length === 0) {
      return (await loadTests(exerciseId)) ?? fallbackTests;
    }

    void saveTests(exerciseId, data as ExerciseTest[]);
    return data as ExerciseTest[];
  } catch {
    return (await loadTests(exerciseId)) ?? fallbackTests;
  }
}

/**
 * Calculate the remaining daily hint quota for a student (20 minus today's requests)
 */
export async function getDailyHintQuota(
  userId: string
): Promise<{ used: number; remaining: number; total: number }> {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // First check local storage
  const localHints = getLocalHints(userId);
  const localTodayCount = localHints.filter((h) => h.created_at.slice(0, 10) === todayStr).length;

  if (!isSupabaseConfigured()) {
    const remaining = Math.max(0, DAILY_HINT_QUOTA - localTodayCount);
    return { used: localTodayCount, remaining, total: DAILY_HINT_QUOTA };
  }

  try {
    // Count from Supabase ai_hint_requests
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const { data, error } = await supabase
      .from('ai_hint_requests')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', todayStart);

    if (error || !data) {
      const remaining = Math.max(0, DAILY_HINT_QUOTA - localTodayCount);
      return { used: localTodayCount, remaining, total: DAILY_HINT_QUOTA };
    }

    const count = Math.max(data.length, localTodayCount);
    const remaining = Math.max(0, DAILY_HINT_QUOTA - count);
    return { used: count, remaining, total: DAILY_HINT_QUOTA };
  } catch {
    const remaining = Math.max(0, DAILY_HINT_QUOTA - localTodayCount);
    return { used: localTodayCount, remaining, total: DAILY_HINT_QUOTA };
  }
}

/**
 * Fetch all hints received by the student for a specific exercise, ordered oldest to newest
 */
export async function getExerciseHintHistory(
  userId: string,
  exerciseId: string
): Promise<AiHintRequest[]> {
  const localList = getLocalHints(userId).filter((h) => h.exercise_id === exerciseId);

  if (!isSupabaseConfigured()) {
    return localList.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  try {
    const { data, error } = await supabase
      .from('ai_hint_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return localList.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return data as AiHintRequest[];
  } catch {
    return localList.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
}

/**
 * Execute student code:
 * Calls POST https://sandbox.rythmebinairegn.org/execute
 * With Authorization: Bearer {SANDBOX_API_KEY}
 * Falls back to mock function while sandbox is in pilot / staging.
 */
export async function executeCode(
  req: ExecuteRequest,
  userId: string
): Promise<ExecuteResponse> {
  const sandboxUrl = (import.meta.env?.VITE_SANDBOX_API_URL as string | undefined)?.trim();

  // The endpoint must validate the authenticated user server-side. Never expose
  // a shared sandbox secret in a VITE_ variable, as it is bundled to the browser.
  if (sandboxUrl && isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authenticated session');
      const resp = await fetch(sandboxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(req),
      });

      if (resp.ok) {
        const result = (await resp.json()) as ExecuteResponse;
        await recordSubmission(userId, req.exercise_id, req.code, result);
        return result;
      }
    } catch {
      // Fallback to mock simulation
    }
  }

  // Exécution réelle dans le navigateur (Python via Pyodide, JavaScript)
  const local = await runLocally(req);
  if (local) {
    await recordSubmission(userId, req.exercise_id, req.code, local);
    return local;
  }

  // Langages non gérés (ex : html) : simulation
  const result = await simulateMockExecution(req);
  await recordSubmission(userId, req.exercise_id, req.code, result);
  return result;
}

/**
 * Mock simulator for code sandbox execution:
 * Returns realistic compiler output tagged with [MOCK]
 */
async function simulateMockExecution(req: ExecuteRequest): Promise<ExecuteResponse> {
  // Artificial network/compilation latency
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

  const codeTrimmed = req.code.trim();

  // 1. Empty code check
  if (!codeTrimmed) {
    return {
      status: 'error',
      output: `[MOCK] Erreur d'exécution (${req.language}) :\nFichier vide. Aucun code à exécuter.`,
      execution_time_ms: 12,
      failed_tests: [
        {
          message: '[MOCK] Aucun code fourni dans l’éditeur',
        },
      ],
    };
  }

  // 2. Python syntax error detection
  if (req.language.toLowerCase() === 'python') {
    // Check for unbalanced quotes or parentheses
    const openParens = (codeTrimmed.match(/\(/g) || []).length;
    const closeParens = (codeTrimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return {
        status: 'error',
        output: `[MOCK] SyntaxError: parenthesis '(' was never closed\n  File "main.py", line 1\n    ${codeTrimmed.split('\n')[0]}\n    ^\nSyntaxError: unmatched parentheses`,
        execution_time_ms: 38,
        failed_tests: [
          {
            message: '[MOCK] Erreur de syntaxe Python : parenthèse non fermée',
          },
        ],
      };
    }

    const doubleQuotes = (codeTrimmed.match(/"/g) || []).length;
    const singleQuotes = (codeTrimmed.match(/'/g) || []).length;
    if (doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0) {
      return {
        status: 'error',
        output: `[MOCK] SyntaxError: unterminated string literal (detected at line 1)\n  File "main.py", line 1\n    ${codeTrimmed.split('\n')[0]}\n    ^\nSyntaxError: EOL while scanning string literal`,
        execution_time_ms: 42,
        failed_tests: [
          {
            message: '[MOCK] Erreur de syntaxe Python : chaîne de caractères non fermée',
          },
        ],
      };
    }
  }

  // 3. Evaluation against expected tests
  const tests = req.tests.length > 0 ? req.tests : getTestsForExercise(req.exercise_id);
  const failedTests: FailedTestDetail[] = [];

  // Realistic evaluation heuristics per exercise
  let allPass = false;
  let simulatedOutput = '';

  if (req.exercise_id === 'ex-py-101') {
    const hasTargetString =
      codeTrimmed.includes('Hello RythmeBinaireGn') &&
      codeTrimmed.toLowerCase().includes('print');

    if (hasTargetString) {
      allPass = true;
      simulatedOutput = `[MOCK] Hello RythmeBinaireGn\n\n----------------------------------------\nTests exécutés : 2/2 réussis\nTemps d'exécution : 68 ms\nMémoire utilisée : 7.4 MB`;
    } else {
      allPass = false;
      const extractedPrint = codeTrimmed.match(/print\((.*?)\)/)?.[1] || 'None';
      simulatedOutput = `[MOCK] Sortie d'exécution :\n${extractedPrint.replace(/["']/g, '')}\n\nAssertionError: La sortie ne correspond pas à l'énoncé.\nAttendu : "Hello RythmeBinaireGn"`;
      failedTests.push({
        test_id: tests[0]?.id || 'test-1',
        expected: 'Hello RythmeBinaireGn',
        actual: extractedPrint.replace(/["']/g, ''),
        message: '[MOCK] La chaîne affichée ne correspond pas exactement au texte demandé.',
      });
    }
  } else if (req.exercise_id === 'ex-py-102') {
    const hasVariables =
      codeTrimmed.includes('ville') &&
      codeTrimmed.includes('pays') &&
      codeTrimmed.includes('message');
    const hasConakryGuinee =
      codeTrimmed.includes('Conakry') && codeTrimmed.includes('Guinée');
    const hasPrint = codeTrimmed.includes('print');

    if (hasVariables && hasConakryGuinee && hasPrint) {
      allPass = true;
      simulatedOutput = `[MOCK] Bienvenue à Conakry, en Guinée !\n\n----------------------------------------\nTests exécutés : 1/1 réussi\nTemps d'exécution : 74 ms`;
    } else {
      allPass = false;
      simulatedOutput = `[MOCK] Échec du test unitaire :\nVariables attendues non définies ou message incomplet.\nAssurez-vous de définir 'message' avec la f-string et de l'afficher avec print(message).`;
      failedTests.push({
        test_id: tests[0]?.id || 'test-1',
        expected: 'Bienvenue à Conakry, en Guinée !',
        actual: 'Sortie incomplète ou incorrecte',
        message: '[MOCK] La variable message ou son affichage n’est pas conforme à la consigne.',
      });
    }
  } else {
    // Generic exercise fallback
    const expected = tests[0]?.expected_output || '';
    if (expected && codeTrimmed.includes(expected)) {
      allPass = true;
      simulatedOutput = `[MOCK] ${expected}\n\n----------------------------------------\nValidation réussie : tous les tests ont passé !`;
    } else {
      allPass = false;
      simulatedOutput = `[MOCK] Sortie d'exécution :\nCode exécuté sans lever d'exception.\nCependant, les tests attendus n'ont pas été validés.`;
      failedTests.push({
        test_id: tests[0]?.id || 'test-default',
        expected: expected || 'Sortie conforme',
        actual: 'Valeur retournée divergente',
        message: '[MOCK] Le résultat produit ne valide pas le jeu de test.',
      });
    }
  }

  return {
    status: allPass ? 'pass' : 'fail',
    output: simulatedOutput,
    execution_time_ms: Math.floor(55 + Math.random() * 60),
    failed_tests: failedTests,
  };
}

/**
 * Record code submission into exercise_submissions table
 */
async function recordSubmission(
  userId: string,
  exerciseId: string,
  code: string,
  result: ExecuteResponse
): Promise<void> {
  const submissionRecord: LocalExerciseSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    exercise_id: exerciseId,
    code_submitted: code,
    status: result.status,
    output: result.output,
    execution_time_ms: result.execution_time_ms,
    created_at: new Date().toISOString(),
  };

  // Always save locally
  const currentLocal = getLocalSubmissions(userId);
  saveLocalSubmissions(userId, [submissionRecord, ...currentLocal]);

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('exercise_submissions').insert([
        {
          id: submissionRecord.id,
          user_id: userId,
          exercise_id: exerciseId,
          code_submitted: code,
          status: result.status,
          output: result.output,
          execution_time_ms: result.execution_time_ms,
          created_at: submissionRecord.created_at,
        },
      ]);
    } catch (err) {
      console.warn('Could not persist submission to Supabase:', err);
    }
  }
}

/**
 * Request an AI Hint from Tutor API:
 * POST https://tutor.rythmebinairegn.org/hint
 * Headers: Authorization: Bearer {TUTOR_API_KEY}
 * Body: { user_id, exercise_id, code, current_hint_level, language }
 */
export async function requestAiHint(req: HintRequest): Promise<HintResponse> {
  // 1. Quota check
  const quota = await getDailyHintQuota(req.user_id);
  if (quota.remaining <= 0) {
    throw new Error("Quota d'indices atteint pour aujourd'hui, reviens demain");
  }

  const tutorUrl = (import.meta.env?.VITE_TUTOR_API_URL as string | undefined)?.trim();

  // Tuteur réel : une Supabase Edge Function (supabase/functions/tutor-hint). Elle garde la clé IA
  // secrète, décide elle-même du niveau d'indice, applique les limites ET enregistre l'indice.
  // Ici on n'enregistre donc rien, et on ne retombe JAMAIS sur le faux tuteur en cas d'erreur :
  // un élève ne doit pas prendre un « [MOCK] » pour une vraie réponse.
  if (tutorUrl && isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Reconnecte-toi pour demander un indice.');
    let resp: Response;
    try {
      resp = await fetch(tutorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          exercise_id: req.exercise_id,
          code: req.code,
          last_output: req.last_output,
        }),
      });
    } catch {
      throw new Error('Impossible de joindre le tuteur. Vérifie ta connexion et réessaie.');
    }
    const payload = (await resp.json().catch(() => null)) as
      | (Partial<HintResponse> & { error?: string })
      | null;
    if (!resp.ok || !payload || typeof payload.hint_text !== 'string') {
      throw new Error(payload?.error || 'Le tuteur est momentanément indisponible.');
    }
    return payload as HintResponse;
  }

  // Mode développement (pas de tuteur configuré) : faux indices clairement marqués [MOCK].
  const mockResponse = generateMockHint(req);
  await recordHintRequest(req.user_id, req.exercise_id, req.code, mockResponse);
  return mockResponse;
}

/**
 * Generates an explicitly identifiable mock hint response.
 * Follows the instruction:
 * "Pour le mock, fais en sorte que la fonction simulant l'API renvoie des réponses plausibles mais clairement identifiables comme test (ex: "[MOCK] Ceci est un indice simulé, niveau 2"), pour qu'on ne confonde jamais un mock avec une vraie réponse une fois les vraies API branchées."
 */
function generateMockHint(req: HintRequest): HintResponse {
  const level = req.current_hint_level || 1;

  if (level === 1) {
    return {
      hint_level: 1,
      hint_text: `[MOCK] Indice simulé (Niveau 1) : Pour afficher du texte en Python, appelle la fonction intégrée print(...) en plaçant la chaîne de caractères entre guillemets doubles.`,
      is_final_solution: false,
    };
  }

  if (level === 2) {
    return {
      hint_level: 2,
      hint_text: `[MOCK] Indice simulé (Niveau 2) : Fais bien attention aux majuscules et à l'orthographe du nom du projet. La chaîne exacte demandée est "Hello RythmeBinaireGn".`,
      is_final_solution: false,
    };
  }

  // Final solution at level >= 3
  return {
    hint_level: level,
    hint_text: `[MOCK] Solution complète simulée :\nprint("Hello RythmeBinaireGn")`,
    is_final_solution: true,
  };
}

/**
 * Record hint request into ai_hint_requests table
 */
async function recordHintRequest(
  userId: string,
  exerciseId: string,
  code: string,
  response: HintResponse
): Promise<void> {
  const record: LocalAiHintRequest = {
    id: `hint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    exercise_id: exerciseId,
    hint_level: response.hint_level,
    request_context: code,
    response_text: response.hint_text,
    is_final_solution: response.is_final_solution,
    created_at: new Date().toISOString(),
  };

  // Save to local storage
  const currentHints = getLocalHints(userId);
  saveLocalHints(userId, [...currentHints, record]);

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('ai_hint_requests').insert([
        {
          id: record.id,
          user_id: userId,
          exercise_id: exerciseId,
          request_context: code,
          hint_level: response.hint_level,
          response_text: response.hint_text,
          created_at: record.created_at,
        },
      ]);
    } catch (err) {
      console.warn('Could not record hint in Supabase:', err);
    }
  }
}
