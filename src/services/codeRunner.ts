/**
 * codeRunner — exécute le code des élèves DANS LEUR NAVIGATEUR, sans serveur.
 *
 * - Python : Pyodide (Python compilé pour le navigateur). ~10 Mo au premier chargement,
 *   ensuite gardé en cache par le navigateur (donc léger pour les connexions lentes).
 * - JavaScript : exécuté dans un Web Worker isolé.
 *
 * Le code tourne dans un Worker : il ne peut pas toucher à la page, et on peut l'arrêter
 * de force en cas de boucle infinie (délai maximum ci-dessous).
 */
import { ExerciseTest } from '../types/database';
import { getTestsForExercise } from '../data/exerciseTestsData';
import type { ExecuteRequest, ExecuteResponse, FailedTestDetail } from './exerciseService';

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const EXEC_TIMEOUT_MS = 10_000;
const LOAD_TIMEOUT_MS = 120_000;

/** Code Python exécuté dans le worker (aussi utilisé tel quel par les tests). */
export const PY_RUN_SOURCE = `
function cleanTraceback(msg) {
  var i = msg.indexOf('File "<exec>"');
  var tb = i >= 0 ? msg.slice(i) : msg;
  return tb.replace(/<exec>/g, 'main.py').trim();
}
async function runPy(pyodide, code, input) {
  var out = [];
  pyodide.setStdout({ batched: function (s) { out.push(s); } });
  pyodide.setStderr({ batched: function (s) { out.push(s); } });
  var lines = input == null ? [] : String(input).split('\\n');
  var n = 0;
  pyodide.setStdin({ stdin: function () { return n < lines.length ? lines[n++] : undefined; } });
  var ns = pyodide.globals.get('dict')();
  try {
    await pyodide.runPythonAsync(code, { globals: ns });
    return { ok: true, stdout: out.join('\\n') };
  } catch (e) {
    return { ok: false, stdout: out.join('\\n'), error: cleanTraceback(String((e && e.message) || e)) };
  } finally {
    ns.destroy();
  }
}
`;

const JS_RUN_SOURCE = `
async function runJs(code) {
  var out = [];
  var fmt = function (a) { return a.map(function (x) { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch (e) { return String(x); } }).join(' '); };
  var fakeConsole = { log: function () { out.push(fmt([].slice.call(arguments))); }, info: function () { out.push(fmt([].slice.call(arguments))); }, warn: function () { out.push(fmt([].slice.call(arguments))); }, error: function () { out.push(fmt([].slice.call(arguments))); } };
  try {
    var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('console', code)(fakeConsole);
    return { ok: true, stdout: out.join('\\n') };
  } catch (e) {
    return { ok: false, stdout: out.join('\\n'), error: String((e && e.name) || 'Error') + ': ' + String((e && e.message) || e) };
  }
}
`;

const PY_WORKER_SOURCE = `
importScripts('${PYODIDE_BASE}pyodide.js');
${PY_RUN_SOURCE}
var ready = loadPyodide({ indexURL: '${PYODIDE_BASE}' }).then(function (p) { postMessage({ type: 'ready' }); return p; })
  .catch(function (e) { postMessage({ type: 'loaderror', message: String((e && e.message) || e) }); throw e; });
onmessage = async function (ev) {
  var p = await ready;
  var r = await runPy(p, ev.data.code, ev.data.input);
  postMessage({ type: 'result', id: ev.data.id, result: r });
};
`;

const JS_WORKER_SOURCE = `
${JS_RUN_SOURCE}
postMessage({ type: 'ready' });
onmessage = async function (ev) {
  var r = await runJs(ev.data.code);
  postMessage({ type: 'result', id: ev.data.id, result: r });
};
`;

interface RunResult {
  ok: boolean;
  stdout: string;
  error?: string;
}

interface WorkerHandle {
  worker: Worker;
  ready: Promise<void>;
}

const handles: Record<string, WorkerHandle | undefined> = {};
let nextId = 1;

function startWorker(kind: 'python' | 'javascript'): WorkerHandle {
  const src = kind === 'python' ? PY_WORKER_SOURCE : JS_WORKER_SOURCE;
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const worker = new Worker(url);
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Le chargement de l’environnement a pris trop de temps.')), LOAD_TIMEOUT_MS);
    worker.addEventListener('message', function onMsg(ev: MessageEvent) {
      if (ev.data?.type === 'ready') {
        clearTimeout(timer);
        resolve();
      } else if (ev.data?.type === 'loaderror') {
        clearTimeout(timer);
        reject(new Error(ev.data.message));
      }
    });
    worker.addEventListener('error', (e) => {
      clearTimeout(timer);
      reject(new Error(e.message || 'Erreur du worker'));
    });
  });
  // évite un "unhandled rejection" si personne n'attend encore
  ready.catch(() => {});
  return { worker, ready };
}

function getHandle(kind: 'python' | 'javascript'): WorkerHandle {
  let h = handles[kind];
  if (!h) {
    h = startWorker(kind);
    handles[kind] = h;
  }
  return h;
}

function resetHandle(kind: 'python' | 'javascript') {
  handles[kind]?.worker.terminate();
  handles[kind] = undefined;
}

/** Lance le chargement de Python en arrière-plan (pendant que l'élève lit la consigne). */
export function preloadRunner(language: string): void {
  const kind = language.toLowerCase() === 'python' ? 'python' : language.toLowerCase() === 'javascript' ? 'javascript' : null;
  if (!kind || typeof Worker === 'undefined') return;
  try {
    getHandle(kind);
  } catch {}
}

export function isRunnerSupported(language: string): boolean {
  const l = language.toLowerCase();
  return (l === 'python' || l === 'javascript') && typeof Worker !== 'undefined';
}

async function runOnce(kind: 'python' | 'javascript', code: string, input: string | null): Promise<RunResult> {
  const h = getHandle(kind);
  try {
    await h.ready;
  } catch (e: any) {
    resetHandle(kind);
    return {
      ok: false,
      stdout: '',
      error:
        "Impossible de charger l'environnement d'exécution (connexion internet nécessaire la première fois). " +
        (e?.message ? `Détail : ${e.message}` : ''),
    };
  }
  const id = nextId++;
  return new Promise<RunResult>((resolve) => {
    const timer = setTimeout(() => {
      h.worker.removeEventListener('message', onMsg);
      resetHandle(kind); // arrêt forcé (boucle infinie…)
      resolve({ ok: false, stdout: '', error: "Temps d'exécution dépassé (10 s). Y a-t-il une boucle infinie dans ton code ?" });
    }, EXEC_TIMEOUT_MS);
    function onMsg(ev: MessageEvent) {
      if (ev.data?.type === 'result' && ev.data.id === id) {
        clearTimeout(timer);
        h.worker.removeEventListener('message', onMsg);
        resolve(ev.data.result as RunResult);
      }
    }
    h.worker.addEventListener('message', onMsg);
    h.worker.postMessage({ id, code, input });
  });
}

export function normalizeOutput(s: string): string {
  return (s || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Évalue des résultats d'exécution face aux tests (fonction pure, testable).
 */
export function gradeRuns(
  tests: ExerciseTest[],
  runs: RunResult[]
): { status: 'pass' | 'fail' | 'error'; output: string; failed: FailedTestDetail[] } {
  const first = runs[0];
  if (!first.ok) {
    return { status: 'error', output: `${first.stdout ? first.stdout + '\n' : ''}${first.error}`, failed: [{ message: first.error }] };
  }
  const failed: FailedTestDetail[] = [];
  runs.forEach((r, i) => {
    const t = tests[i];
    if (!t) return;
    if (!r.ok) {
      failed.push({ test_id: t.id, expected: t.expected_output, actual: r.error, message: r.error });
    } else if (normalizeOutput(r.stdout) !== normalizeOutput(t.expected_output)) {
      failed.push({
        test_id: t.id,
        expected: t.is_hidden ? '(test caché)' : t.expected_output,
        actual: t.is_hidden ? '(test caché)' : r.stdout,
        message: t.is_hidden ? 'Un test caché a échoué : vérifie les autres cas possibles.' : 'La sortie ne correspond pas à celle attendue.',
      });
    }
  });
  const total = tests.length || 1;
  const passed = tests.length ? total - failed.length : 1;
  const summary = `Tests réussis : ${passed}/${total}`;
  const shown = first.stdout ? first.stdout + '\n\n' : '';
  return { status: failed.length === 0 ? 'pass' : 'fail', output: `${shown}----------------------------------------\n${summary}`, failed };
}

/**
 * Exécute le code de l'élève et le corrige. Renvoie null si le langage n'est pas géré ici.
 */
export async function runLocally(req: ExecuteRequest): Promise<ExecuteResponse | null> {
  if (!isRunnerSupported(req.language)) return null;
  const kind = req.language.toLowerCase() as 'python' | 'javascript';
  const tests = req.tests.length > 0 ? req.tests : getTestsForExercise(req.exercise_id);
  const t0 = performance.now();

  const runs: RunResult[] = [];
  if (tests.length === 0) {
    runs.push(await runOnce(kind, req.code, null));
  } else {
    for (const t of tests) {
      const r = await runOnce(kind, req.code, t.input);
      runs.push(r);
      if (!r.ok && runs.length === 1) break; // erreur de code : inutile de relancer
    }
  }
  const graded = gradeRuns(tests, runs);
  return {
    status: graded.status,
    output: graded.output,
    execution_time_ms: Math.round(performance.now() - t0),
    failed_tests: graded.failed,
  };
}
