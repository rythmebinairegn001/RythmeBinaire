import React, { useState, useEffect } from 'react';
import { preloadRunner } from '../../services/codeRunner';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  FileCode,
  HelpCircle,
  Lightbulb,
  Check,
  ChevronRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { DetailedLesson } from '../../data/lessonsData';
import { PublicCourseItem } from '../../data/coursesData';
import { PreferredLanguage, UserProfile, AiHintRequest, ExerciseTest } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { CodeEditor } from './CodeEditor';
import {
  executeCode,
  requestAiHint,
  getDailyHintQuota,
  getExerciseHintHistory,
  fetchExerciseTests,
  ExecuteResponse,
} from '../../services/exerciseService';

interface Props {
  course: PublicCourseItem;
  lesson: DetailedLesson;
  user: UserProfile;
  lang: PreferredLanguage;
  onBackToLesson: () => void;
  onLessonCompleted?: (courseId: string, lessonId: string) => void;
  onNextLesson?: () => void;
}

export const StudentExercisePage: React.FC<Props> = ({
  course,
  lesson,
  user,
  lang,
  onBackToLesson,
  onLessonCompleted,
  onNextLesson,
}) => {
  const t = getTranslation(lang);
  const exercise = lesson.exercise;

  // Language & Content
  const lessonTranslation = lesson.translations[lang] || lesson.translations.fr;
  const courseTranslation = course.translations[lang] || course.translations.fr;
  const instructions =
    exercise?.instructions?.[lang] ||
    exercise?.instructions?.fr ||
    'Consignes non disponibles pour cet exercice.';

  // Code state
  const starterCode = exercise?.starter_code || '# Écris ton code ici\n';
  const [code, setCode] = useState<string>(() => {
    // Attempt local auto-save recovery
    try {
      const saved = localStorage.getItem(`rb_draft_code_${user.id}_${exercise?.id}`);
      return saved !== null ? saved : starterCode;
    } catch {
      return starterCode;
    }
  });

  // Tests & hints state
  const [tests, setTests] = useState<ExerciseTest[]>([]);
  const [hints, setHints] = useState<AiHintRequest[]>([]);
  const [quota, setQuota] = useState<{ used: number; remaining: number; total: number }>({
    used: 0,
    remaining: 20,
    total: 20,
  });

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecuteResponse | null>(null);

  // Hint requesting state
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [quotaErrorMessage, setQuotaErrorMessage] = useState<string | null>(null);

  // Active side tab ('instructions' | 'hints')
  const [activeTab, setActiveTab] = useState<'instructions' | 'hints'>('instructions');

  // Load tests, hints history, and quota on mount
  useEffect(() => {
    if (!exercise) return;

    let isMounted = true;

    // 0. Charge l'environnement d'exécution en arrière-plan pendant que l'élève lit la consigne
    preloadRunner(exercise.language);

    // 1. Tests
    fetchExerciseTests(exercise.id).then((data) => {
      if (isMounted) setTests(data);
    });

    // 2. Hint history
    getExerciseHintHistory(user.id, exercise.id).then((history) => {
      if (isMounted) setHints(history);
    });

    // 3. Daily quota
    getDailyHintQuota(user.id).then((q) => {
      if (isMounted) setQuota(q);
    });

    return () => {
      isMounted = false;
    };
  }, [exercise, user.id]);

  // Auto-save draft code in localStorage
  useEffect(() => {
    if (!exercise) return;
    try {
      localStorage.setItem(`rb_draft_code_${user.id}_${exercise.id}`, code);
    } catch {
      // Ignore quota error
    }
  }, [code, exercise, user.id]);

  // Reset code to starter
  const handleResetCode = () => {
    if (window.confirm(lang === 'fr' ? 'Réinitialiser le code de départ ?' : 'Reset starter code?')) {
      setCode(starterCode);
      setExecutionResult(null);
      setQuotaErrorMessage(null);
    }
  };

  // Run student code
  const handleRunCode = async () => {
    if (!exercise || isExecuting) return;

    setIsExecuting(true);
    setQuotaErrorMessage(null);

    try {
      const res = await executeCode(
        {
          exercise_id: exercise.id,
          language: exercise.language,
          code: code,
          tests: tests,
        },
        user.id
      );

      setExecutionResult(res);

      // If pass, automatically validate lesson progress
      if (res.status === 'pass' && onLessonCompleted) {
        onLessonCompleted(course.id, lesson.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de communication avec le bac à sable';
      setExecutionResult({
        status: 'error',
        output: `[MOCK] Erreur système : ${msg}`,
        execution_time_ms: 0,
        failed_tests: [{ message: msg }],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Request an AI Hint
  const handleRequestHint = async () => {
    if (!exercise || isRequestingHint) return;

    // Check quota locally first
    if (quota.remaining <= 0) {
      setQuotaErrorMessage(t.exercise.quotaReached);
      return;
    }

    setIsRequestingHint(true);
    setQuotaErrorMessage(null);

    try {
      // Determine current level
      const currentLevel = hints.length > 0 ? hints[hints.length - 1].hint_level + 1 : 1;

      const newHint = await requestAiHint({
        user_id: user.id,
        exercise_id: exercise.id,
        code: code,
        current_hint_level: currentLevel,
        language: exercise.language,
      });

      // Update hints list
      const hintRecord: AiHintRequest = {
        id: `hint-runtime-${Date.now()}`,
        user_id: user.id,
        exercise_id: exercise.id,
        hint_level: newHint.hint_level,
        request_context: code,
        response_text: newHint.hint_text,
        created_at: new Date().toISOString(),
      };

      setHints((prev) => [...prev, hintRecord]);

      // Re-fetch remaining quota
      const updatedQuota = await getDailyHintQuota(user.id);
      setQuota(updatedQuota);

      // Switch to hints tab to view it
      setActiveTab('hints');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.exercise.quotaReached;
      setQuotaErrorMessage(msg);
    } finally {
      setIsRequestingHint(false);
    }
  };

  if (!exercise) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-bold text-[var(--color-text-main)]">
          {lang === 'fr' ? 'Aucun exercice pour cette leçon' : 'No exercise for this lesson'}
        </h2>
        <button
          type="button"
          onClick={onBackToLesson}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          {t.exercise.backToLesson}
        </button>
      </div>
    );
  }

  // Determine if Hint button is visible: ONLY if result is fail or error
  const canRequestHint =
    executionResult !== null &&
    (executionResult.status === 'fail' || executionResult.status === 'error');

  return (
    <div
      id="student-exercise-screen"
      className="flex-1 flex flex-col min-h-[calc(100vh-80px)] bg-[var(--color-bg-app)] text-[var(--color-text-main)]"
    >
      {/* Top Header Bar */}
      <header className="sticky top-20 z-30 bg-[var(--color-card-bg)] border-b border-[var(--color-card-border)] px-4 sm:px-6 py-3.5 shadow-2xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back button + Context */}
          <div className="flex items-center gap-3">
            <button
              id="btn-exercise-back-lesson"
              type="button"
              onClick={onBackToLesson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] transition active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.exercise.backToLesson}</span>
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[var(--color-accent-blue)]">
                {courseTranslation.title} • Module {lesson.position}
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-[var(--color-text-main)] truncate max-w-[280px] sm:max-w-md">
                {lessonTranslation.title}
              </h1>
            </div>
          </div>

          {/* Right: Language indicator + Quota Pill + Main CTA */}
          <div className="flex items-center gap-2.5">
            {/* Language Tag */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-semibold border border-slate-200 dark:border-slate-700">
              <FileCode className="w-3.5 h-3.5 text-[var(--color-accent-blue)]" />
              <span>{exercise.language.toUpperCase()}</span>
            </div>

            {/* Daily Hint Quota Pill */}
            <div
              id="hint-quota-counter-pill"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border transition ${
                quota.remaining > 5
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                  : quota.remaining > 0
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
              }`}
              title="Quota journalier de 20 indices"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>
                <strong className="font-mono">{quota.remaining}</strong>/20 {t.exercise.hintsRemaining}
              </span>
            </div>

            {/* Reset Code Button */}
            <button
              id="btn-exercise-reset-code"
              type="button"
              onClick={handleResetCode}
              className="p-2 rounded-xl border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-slate-600 dark:text-slate-300 transition"
              title={t.exercise.starterCodeReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Run Code Button */}
            <button
              id="btn-exercise-run-code"
              type="button"
              onClick={handleRunCode}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.exercise.runningCode}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.exercise.runCodeBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout: 2 Columns (Left: Instructions / Hints; Right: Code Editor & Result) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (40% width on Desktop: lg:col-span-5): Instructions and Hints History */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Tab Selector (Énoncé vs Indices) */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] shadow-2xs">
            <button
              id="tab-btn-instructions"
              type="button"
              onClick={() => setActiveTab('instructions')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'instructions'
                  ? 'bg-[var(--color-bg-app)] text-[var(--color-text-main)] shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[var(--color-accent-blue)]" />
              <span>{t.exercise.instructionsTab}</span>
            </button>

            <button
              id="tab-btn-hints"
              type="button"
              onClick={() => setActiveTab('hints')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeTab === 'hints'
                  ? 'bg-[var(--color-bg-app)] text-[var(--color-text-main)] shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.exercise.hintsTab}</span>
              {hints.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center font-mono">
                  {hints.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: INSTRUCTIONS & TESTS */}
          {activeTab === 'instructions' && (
            <div
              id="exercise-instructions-panel"
              className="flex-1 bg-[var(--color-card-bg)] rounded-3xl p-5 sm:p-6 border border-[var(--color-card-border)] shadow-sm space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-5">
                {/* Header */}
                <div className="space-y-1 border-b border-[var(--color-card-border)] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide uppercase text-[var(--color-accent-blue)]">
                      {t.exercise.screenTitle}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      ID: {exercise.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                    {lessonTranslation.title}
                  </h2>
                </div>

                {/* Instructions Text */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {lang === 'fr' ? 'Objectif de l’exercice' : 'Exercise Goal'}
                  </h3>
                  <div className="p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-sm leading-relaxed text-[var(--color-text-main)] whitespace-pre-line font-medium">
                    {instructions}
                  </div>
                </div>

                {/* Expected Test Cases */}
                {tests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
                      <span>{t.exercise.testDetails}</span>
                      <span className="text-[11px] font-mono font-normal">
                        {tests.filter((t) => !t.is_hidden).length} test(s) visible(s)
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {tests.map((testItem, idx) => (
                        <div
                          key={testItem.id}
                          className="p-3 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs flex flex-col gap-1.5 font-mono"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-500">Test #{idx + 1}</span>
                            {testItem.is_hidden ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {lang === 'fr' ? 'Test masqué' : 'Hidden test'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                                {lang === 'fr' ? 'Test public' : 'Public test'}
                              </span>
                            )}
                          </div>
                          {!testItem.is_hidden && (
                            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 pt-1 border-t border-[var(--color-card-border)]">
                              <span className="text-[10px] font-sans text-slate-400 font-semibold">
                                {t.exercise.expectedOutput} :
                              </span>
                              <code className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {testItem.expected_output}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Help Prompt */}
              <div className="pt-4 border-t border-[var(--color-card-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'fr'
                      ? 'Besoin d’aide ? Exécutez votre code d’abord.'
                      : 'Need help? Run your code first.'}
                  </span>
                </span>
                {hints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('hints')}
                    className="font-bold text-[var(--color-accent-blue)] hover:underline"
                  >
                    Voir {hints.length} indice(s) →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HINTS & AI GUIDANCE */}
          {activeTab === 'hints' && (
            <div
              id="exercise-hints-panel"
              className="flex-1 bg-[var(--color-card-bg)] rounded-3xl p-5 sm:p-6 border border-[var(--color-card-border)] shadow-sm space-y-5 flex flex-col"
            >
              {/* Hints Header & Counter */}
              <div className="flex items-center justify-between border-b border-[var(--color-card-border)] pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-[var(--color-text-main)]">
                    {t.exercise.hintsTab}
                  </h3>
                </div>

                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  {quota.remaining}/20 restants
                </span>
              </div>

              {/* Quota error message if any */}
              {quotaErrorMessage && (
                <div
                  id="exercise-quota-warning"
                  className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 leading-relaxed font-semibold"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{quotaErrorMessage}</span>
                </div>
              )}

              {/* Hints History List (Ordered oldest to newest) */}
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[460px] pr-1">
                {hints.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium max-w-xs mx-auto leading-relaxed">
                      {t.exercise.noHintsYet}
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      {lang === 'fr'
                        ? 'Le tuteur IA se débloque dès que votre code produit un échec ou une erreur d’exécution.'
                        : 'The AI Tutor unlocks once your code produces a validation failure or error.'}
                    </p>
                  </div>
                ) : (
                  hints.map((hint, idx) => {
                    const isFinalSolution = hint.hint_level >= 5;

                    return (
                      <div
                        key={hint.id || idx}
                        id={`hint-item-${idx + 1}`}
                        className={`p-4 rounded-2xl transition space-y-3 ${
                          isFinalSolution
                            ? 'bg-amber-500/10 border-2 border-orange-500/90 dark:border-orange-500 shadow-md shadow-orange-500/10'
                            : 'bg-[var(--color-bg-app)] border border-[var(--color-card-border)]'
                        }`}
                      >
                        {/* Hint Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isFinalSolution
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {t.exercise.hintLevel} {hint.hint_level}
                            </span>
                            {isFinalSolution && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                ★ Solution
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(hint.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Hint Text Content */}
                        <div className="text-xs leading-relaxed text-[var(--color-text-main)] font-mono whitespace-pre-wrap bg-white/40 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                          {hint.response_text || (lang === 'fr' ? 'Indice indisponible.' : 'Hint unavailable.')}
                        </div>

                        {/* Strict compliance visual banner for final solution */}
                        {isFinalSolution && (
                          <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-800 dark:text-orange-200 text-[11px] font-bold flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>{t.exercise.finalSolutionNotice}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

                {/* Request Hint CTA inside tab if failed/error */}
                {canRequestHint && (
                  <div className="pt-4 border-t border-[var(--color-card-border)]">
                    <button
                      id="btn-tab-request-hint"
                      type="button"
                      onClick={handleRequestHint}
                      disabled={isRequestingHint || quota.remaining <= 0}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRequestingHint ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t.exercise.requestingHint}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {t.exercise.requestHintBtn} (
                            {hints.length === 0 ? 'Niveau 1' : `Niveau ${hints.length + 1}`})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (60% width on Desktop: lg:col-span-7): Code Editor + Execution Result */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Code Editor Container Card */}
          <div className="bg-[var(--color-card-bg)] rounded-3xl p-4 sm:p-5 border border-[var(--color-card-border)] shadow-sm space-y-3 flex flex-col">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-card-border)]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-[var(--color-text-main)] font-mono">
                  main.{exercise.language === 'python' ? 'py' : 'js'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] font-mono">
                <span>{code.split('\n').length} lignes</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">UTF-8</span>
              </div>
            </div>

            {/* Embedded Interactive CodeMirror Editor */}
            <div className="w-full h-[360px] sm:h-[400px]">
              <CodeEditor
                value={code}
                onChange={(val) => setCode(val)}
                language={exercise.language}
                themeMode="dark"
              />
            </div>
          </div>

          {/* Execution Result & Console Panel */}
          <div
            id="exercise-result-panel"
            className="bg-[var(--color-card-bg)] rounded-3xl p-5 sm:p-6 border border-[var(--color-card-border)] shadow-sm space-y-4"
          >
            {/* Result Header & Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-[var(--color-accent-blue)]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-main)]">
                  {t.exercise.consoleOutput}
                </h3>
              </div>

              {executionResult && (
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {executionResult.status === 'pass' && (
                    <span
                      id="badge-result-pass"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.exercise.statusPass}</span>
                    </span>
                  )}

                  {executionResult.status === 'fail' && (
                    <span
                      id="badge-result-fail"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t.exercise.statusFail}</span>
                    </span>
                  )}

                  {executionResult.status === 'error' && (
                    <span
                      id="badge-result-error"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-400 text-xs font-bold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{t.exercise.statusError}</span>
                    </span>
                  )}

                  {/* Execution Time */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3" />
                    {executionResult.execution_time_ms} ms
                  </span>
                </div>
              )}
            </div>

            {/* Console Output Screen */}
            <div
              id="exercise-console-output"
              className="w-full min-h-[110px] max-h-[220px] overflow-y-auto p-4 rounded-2xl bg-[#070D1E] text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner"
            >
              {executionResult ? (
                <pre className="whitespace-pre-wrap font-mono">{executionResult.output}</pre>
              ) : (
                <span className="text-slate-500 italic">
                  {lang === 'fr'
                    ? 'Cliquez sur "Exécuter mon code" pour compiler et tester votre solution...'
                    : 'Click "Run My Code" to compile and test your solution...'}
                </span>
              )}
            </div>

            {/* Detailed failed tests view if any */}
            {executionResult &&
              executionResult.failed_tests &&
              executionResult.failed_tests.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--color-card-border)]">
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Détails des tests non validés :</span>
                  </h4>
                  <div className="space-y-2">
                    {executionResult.failed_tests.map((ft, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono space-y-1"
                      >
                        {ft.message && (
                          <p className="text-red-700 dark:text-red-300 font-semibold">
                            {ft.message}
                          </p>
                        )}
                        {ft.expected && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-bold">{t.exercise.expectedOutput} : </span>
                            <code>{ft.expected}</code>
                          </div>
                        )}
                        {ft.actual && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-bold">{t.exercise.actualOutput} : </span>
                            <code>{ft.actual}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* ACTION FOOTER:
                - If fail or error: PROMINENT "Demander un indice" button (VISIBLE ONLY IF FAIL/ERROR)
                - If pass: Congratulation + Next lesson button
            */}
            {executionResult && (
              <div className="pt-2">
                {/* 1. FAILURE / ERROR STATE: "Demander un indice" Button */}
                {canRequestHint && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {lang === 'fr' ? 'Besoin d’aide pour débloquer ?' : 'Stuck on this test?'}
                        </p>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                          {quota.remaining > 0
                            ? `Le tuteur IA peut vous fournir un indice progressif (${quota.remaining} restants aujourd’hui).`
                            : t.exercise.quotaReached}
                        </p>
                      </div>
                    </div>

                    <button
                      id="btn-result-request-hint"
                      type="button"
                      onClick={handleRequestHint}
                      disabled={isRequestingHint || quota.remaining <= 0}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRequestingHint ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          <span>{t.exercise.requestingHint}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{t.exercise.requestHintBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 2. PASS STATE: Success banner + Next Lesson CTA */}
                {executionResult.status === 'pass' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          {t.exercise.allPassedCongrats}
                        </p>
                        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                          {lang === 'fr'
                            ? 'Votre progression sur cette leçon a été enregistrée avec succès.'
                            : 'Your lesson completion has been recorded successfully.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        id="btn-exercise-continue-lesson"
                        type="button"
                        onClick={onBackToLesson}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold transition"
                      >
                        {t.exercise.backToLesson}
                      </button>

                      {onNextLesson && (
                        <button
                          id="btn-exercise-next-lesson"
                          type="button"
                          onClick={onNextLesson}
                          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span>{t.exercise.continueNext}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
