import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Check,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DetailedLesson } from '../../data/lessonsData';
import { QuizEditor } from './QuizEditor';
import { DEFAULT_PASS_PERCENT, QuizDraftQuestion, draftProblem, draftToQuiz, emptyDraftQuestion, parseQuiz, quizToDraft } from '../../data/quiz';
import { ExerciseTest, PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import {
  getExerciseTestsAdmin,
  saveExerciseTestsAdmin,
} from '../../services/adminService';

interface Props {
  isOpen: boolean;
  lesson: DetailedLesson | null;
  lang: PreferredLanguage;
  onClose: () => void;
  onSaveExercise: (
    updatedExercise: DetailedLesson['exercise'] | undefined,
    updatedTests: ExerciseTest[]
  ) => Promise<void>;
}

export const ExerciseModal: React.FC<Props> = ({
  isOpen,
  lesson,
  lang,
  onClose,
  onSaveExercise,
}) => {
  const t = getTranslation(lang);
  const [activeTab, setActiveTab] = useState<'fr' | 'en'>('fr');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Exercise Enabled flag
  const [hasExercise, setHasExercise] = useState<boolean>(true);

  // Config fields
  const [language, setLanguage] = useState<string>('python');
  const [starterCode, setStarterCode] = useState<string>('');

  // Translations
  const [instructionsFr, setInstructionsFr] = useState<string>('');
  const [instructionsEn, setInstructionsEn] = useState<string>('');
  const [hint1Fr, setHint1Fr] = useState<string>('');
  const [hint1En, setHint1En] = useState<string>('');
  const [hint2Fr, setHint2Fr] = useState<string>('');
  const [hint2En, setHint2En] = useState<string>('');

  // Tests list
  const [tests, setTests] = useState<ExerciseTest[]>([]);

  // Type d'exercice : atelier de code ou quiz (questions à choix multiples)
  const [kind, setKind] = useState<'code' | 'quiz'>('code');
  const [quizFr, setQuizFr] = useState<QuizDraftQuestion[]>([]);
  const [quizEn, setQuizEn] = useState<QuizDraftQuestion[]>([]);
  const [passPercent, setPassPercent] = useState<number>(DEFAULT_PASS_PERCENT);

  useEffect(() => {
    if (lesson && isOpen) {
      const ex = lesson.exercise;
      setKind('code');
      setQuizFr([]);
      setQuizEn([]);
      setPassPercent(DEFAULT_PASS_PERCENT);
      if (ex && ex.type === 'quiz') {
        const fr = parseQuiz(ex.instructions?.fr);
        setHasExercise(true);
        setKind('quiz');
        setQuizFr(fr ? quizToDraft(fr) : [emptyDraftQuestion()]);
        setQuizEn(quizToDraft(parseQuiz(ex.instructions?.en)));
        setPassPercent(fr?.pass_percent ?? DEFAULT_PASS_PERCENT);
        setLanguage('quiz');
        setStarterCode('');
        setInstructionsFr('');
        setInstructionsEn('');
        setTests([]);
      } else if (ex) {
        setHasExercise(true);
        setLanguage(ex.language || 'python');
        setStarterCode(ex.starter_code || '');
        setInstructionsFr(ex.instructions?.fr || '');
        setInstructionsEn(ex.instructions?.en || '');
        setHint1Fr(ex.hint_level_1?.fr || '');
        setHint1En(ex.hint_level_1?.en || '');
        setHint2Fr(ex.hint_level_2?.fr || '');
        setHint2En(ex.hint_level_2?.en || '');

        // Load tests
        getExerciseTestsAdmin(ex.id).then((tList) => setTests(tList));
      } else {
        // Default new exercise template
        setHasExercise(false);
        setLanguage('python');
        setStarterCode('# Écrivez votre solution ci-dessous\n\n');
        setInstructionsFr('Consigne de l’exercice...');
        setInstructionsEn('');
        setHint1Fr('Indice 1 : Réfléchissez à...');
        setHint1En('');
        setHint2Fr('Indice 2 : Utilisez la fonction...');
        setHint2En('');
        setTests([
          {
            id: `test-new-1`,
            exercise_id: `ex-${lesson.id}`,
            input: null,
            expected_output: 'Résultat attendu',
            is_hidden: false,
          },
          {
            id: `test-new-2`,
            exercise_id: `ex-${lesson.id}`,
            input: null,
            expected_output: 'Résultat test secret',
            is_hidden: true,
          },
        ]);
      }
      setActiveTab('fr');
      setErrorMsg(null);
    }
  }, [lesson, isOpen]);

  if (!isOpen || !lesson) return null;

  const handleAddTest = () => {
    const newTest: ExerciseTest = {
      id: `test-${Date.now().toString(36)}`,
      exercise_id: lesson.exercise?.id || `ex-${lesson.id}`,
      input: '',
      expected_output: '',
      is_hidden: false,
    };
    setTests([...tests, newTest]);
  };

  const handleUpdateTest = (index: number, field: keyof ExerciseTest, value: any) => {
    const updated = [...tests];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTests(updated);
  };

  const handleRemoveTest = (index: number) => {
    setTests(tests.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (!hasExercise) {
        // Disabled exercise
        await onSaveExercise(undefined, []);
        onClose();
        return;
      }

      if (kind === 'quiz') {
        const problem = draftProblem(quizFr);
        if (problem) {
          setErrorMsg(`Quiz en français : ${problem}.`);
          setActiveTab('fr');
          setSaving(false);
          return;
        }
        const hasEn = quizEn.length > 0;
        const problemEn = hasEn ? draftProblem(quizEn) : null;
        if (problemEn) {
          setErrorMsg(`Quiz en anglais : ${problemEn}. (Vide toutes les questions anglaises pour n’avoir que la version française.)`);
          setActiveTab('en');
          setSaving(false);
          return;
        }
        const quizExerciseId = lesson.exercise?.id || `ex-${lesson.id}`;
        const quizData: DetailedLesson['exercise'] = {
          id: quizExerciseId,
          type: 'quiz',
          language: 'quiz',
          starter_code: '',
          instructions: {
            fr: JSON.stringify(draftToQuiz(quizFr, passPercent)),
            en: hasEn ? JSON.stringify(draftToQuiz(quizEn, passPercent)) : undefined,
          },
        };
        await saveExerciseTestsAdmin(quizExerciseId, []);
        await onSaveExercise(quizData, []);
        onClose();
        return;
      }

      if (!instructionsFr.trim()) {
        setErrorMsg('Les instructions en français sont obligatoires.');
        setActiveTab('fr');
        setSaving(false);
        return;
      }

      const exerciseId = lesson.exercise?.id || `ex-${lesson.id}`;
      const exerciseData: DetailedLesson['exercise'] = {
        id: exerciseId,
        type: 'code_sandbox',
        language,
        starter_code: starterCode,
        instructions: {
          fr: instructionsFr.trim(),
          en: instructionsEn.trim() || undefined,
        },
        hint_level_1: {
          fr: hint1Fr.trim() || undefined,
          en: hint1En.trim() || undefined,
        },
        hint_level_2: {
          fr: hint2Fr.trim() || undefined,
          en: hint2En.trim() || undefined,
        },
      };

      // Ensure tests have exercise_id
      const finalTests = tests.map((t) => ({
        ...t,
        exercise_id: exerciseId,
        expected_output: t.expected_output || '',
      }));

      await saveExerciseTestsAdmin(exerciseId, finalTests);
      await onSaveExercise(exerciseData, finalTests);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="exercise-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="exercise-modal-dialog"
        className="bg-[var(--color-card-bg)] text-[var(--color-text-main)] w-full max-w-4xl rounded-3xl shadow-2xl border border-[var(--color-card-border)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-card-border)] bg-[var(--color-bg-app)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {t.admin.exerciseSettingsTitle}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Leçon {lesson.position} : {lesson.translations[lang]?.title || lesson.translations.fr.title}
              </p>
            </div>
          </div>

          <button
            id="btn-close-exercise-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Enable Exercise Toggle */}
          <div className="p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="chk-has-exercise" className="text-xs sm:text-sm font-bold text-[var(--color-text-main)] cursor-pointer">
                {t.admin.enableExercise}
              </label>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Permet aux élèves de pratiquer le code directement avec l’éditeur interactif et le tuteur IA.
              </p>
            </div>
            <input
              id="chk-has-exercise"
              type="checkbox"
              checked={hasExercise}
              onChange={(e) => setHasExercise(e.target.checked)}
              className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>

          {hasExercise && (
            <>
              <div className="p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Type d’exercice</span>
                <div className="flex gap-2" role="radiogroup" aria-label="Type d’exercice">
                  {([['code', 'Atelier de code'], ['quiz', 'Quiz (questions à choix)']] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={kind === k}
                      id={`btn-kind-${k}`}
                      onClick={() => {
                        setKind(k);
                        if (k === 'quiz' && quizFr.length === 0) setQuizFr([emptyDraftQuestion()]);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${kind === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-[var(--color-text-muted)]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {kind === 'quiz' && (
                  <label className="flex items-center gap-2 text-xs font-semibold ml-auto">
                    Réussite à
                    <input
                      type="number"
                      min={10}
                      max={100}
                      step={5}
                      value={passPercent}
                      onChange={(e) => setPassPercent(Math.min(100, Math.max(10, Number(e.target.value) || DEFAULT_PASS_PERCENT)))}
                      className="w-16 px-2 py-1 rounded-lg bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs"
                      aria-label="Pourcentage de réussite"
                    />
                    %
                  </label>
                )}
              </div>

              {/* Technical Config: Language & Starter Code */}
              {kind === 'code' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)]">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {t.admin.codeLanguageLabel}
                  </label>
                  <select
                    id="select-exercise-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript (Node / ES6)</option>
                    <option value="sql">SQL (SQLite, corrigé dans le navigateur)</option>
                    <option value="html_css">HTML / CSS / JS</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {t.admin.starterCodeLabel}
                  </label>
                  <textarea
                    id="input-starter-code"
                    rows={4}
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                    placeholder="# Code pré-rempli pour l'élève..."
                  />
                </div>
              </div>
              )}

              {/* Instructions and Static Hints Tabs (FR / EN) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-card-border)] pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="tab-exercise-fr"
                      onClick={() => setActiveTab('fr')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'fr'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                      }`}
                    >
                      <span>🇫🇷 Français</span>
                    </button>
                    <button
                      type="button"
                      id="tab-exercise-en"
                      onClick={() => setActiveTab('en')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'en'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                      }`}
                    >
                      <span>🇬🇧 English</span>
                      {(kind === 'quiz' ? quizEn.length === 0 : !instructionsEn.trim()) && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Non traduit" />
                      )}
                    </button>
                  </div>
                </div>

                {kind === 'quiz' && activeTab === 'fr' && <QuizEditor value={quizFr} onChange={setQuizFr} accent="amber" />}
                {kind === 'quiz' && activeTab === 'en' && (
                  <div className="space-y-3">
                    {quizEn.length === 0 && quizFr.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuizEn(quizFr.map((q) => ({ ...q, options: [...q.options], answer: [...q.answer] })))}
                        className="px-3 py-1.5 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold"
                      >
                        Copier les questions françaises pour les traduire
                      </button>
                    )}
                    <QuizEditor value={quizEn} onChange={setQuizEn} accent="purple" />
                  </div>
                )}

                {/* FR TAB */}
                {kind === 'code' && activeTab === 'fr' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--color-text-main)]">
                        {t.admin.instructionsFr} *
                      </label>
                      <textarea
                        id="input-exercise-instructions-fr"
                        rows={3}
                        required
                        value={instructionsFr}
                        onChange={(e) => setInstructionsFr(e.target.value)}
                        placeholder="Ex: Écrivez un script qui affiche exactement 'Hello RythmeBinaireGn'..."
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--color-text-muted)]">
                          {t.admin.hint1Fr}
                        </label>
                        <input
                          id="input-hint1-fr"
                          type="text"
                          value={hint1Fr}
                          onChange={(e) => setHint1Fr(e.target.value)}
                          placeholder="Ex: Pensez à utiliser la fonction print()..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--color-text-muted)]">
                          {t.admin.hint2Fr}
                        </label>
                        <input
                          id="input-hint2-fr"
                          type="text"
                          value={hint2Fr}
                          onChange={(e) => setHint2Fr(e.target.value)}
                          placeholder="Ex: N'oubliez pas les guillemets autour du texte !"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EN TAB */}
                {kind === 'code' && activeTab === 'en' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--color-text-main)]">
                        {t.admin.instructionsEn}
                      </label>
                      <textarea
                        id="input-exercise-instructions-en"
                        rows={3}
                        value={instructionsEn}
                        onChange={(e) => setInstructionsEn(e.target.value)}
                        placeholder="e.g. Write a script that prints exactly 'Hello RythmeBinaireGn'..."
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--color-text-muted)]">
                          {t.admin.hint1En}
                        </label>
                        <input
                          id="input-hint1-en"
                          type="text"
                          value={hint1En}
                          onChange={(e) => setHint1En(e.target.value)}
                          placeholder="e.g. Remember to use the print() function..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--color-text-muted)]">
                          {t.admin.hint2En}
                        </label>
                        <input
                          id="input-hint2-en"
                          type="text"
                          value={hint2En}
                          onChange={(e) => setHint2En(e.target.value)}
                          placeholder="e.g. Do not forget quotes around your string!"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Cases (exercise_tests) */}
              {kind === 'code' && (
              <div className="space-y-3 pt-3 border-t border-[var(--color-card-border)]">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-1.5">
                      <span>{t.admin.testCasesTitle}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {tests.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Définit les critères de réussite exécutés par la sandbox.
                    </p>
                  </div>

                  <button
                    id="btn-add-test-case"
                    type="button"
                    onClick={handleAddTest}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.admin.addTestCaseBtn}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {tests.map((testItem, idx) => (
                    <div
                      key={testItem.id || idx}
                      className="p-3.5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)]">
                          Test #{idx + 1}
                        </span>

                        <div className="flex items-center gap-4">
                          {/* is_hidden Checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--color-text-main)]">
                            <input
                              type="checkbox"
                              checked={testItem.is_hidden}
                              onChange={(e) => handleUpdateTest(idx, 'is_hidden', e.target.checked)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            {testItem.is_hidden ? (
                              <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <EyeOff className="w-3 h-3" />
                                <span>{t.admin.isHiddenTest}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Eye className="w-3 h-3" />
                                <span>Visible par l'élève</span>
                              </span>
                            )}
                          </label>

                          {/* Delete test */}
                          <button
                            type="button"
                            onClick={() => handleRemoveTest(idx)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                            title="Supprimer ce test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                            {t.admin.inputField}
                          </label>
                          <input
                            type="text"
                            value={testItem.input || ''}
                            onChange={(e) => handleUpdateTest(idx, 'input', e.target.value)}
                            placeholder="Optionnel (stdin)"
                            className="w-full px-3 py-1.5 font-mono text-xs rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                            {t.admin.expectedOutputField} *
                          </label>
                          <input
                            type="text"
                            required
                            value={testItem.expected_output}
                            onChange={(e) => handleUpdateTest(idx, 'expected_output', e.target.value)}
                            placeholder="Ex: Hello RythmeBinaireGn"
                            className="w-full px-3 py-1.5 font-mono text-xs rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--color-card-border)] flex items-center justify-end gap-3">
            <button
              id="btn-cancel-exercise-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] transition"
            >
              {t.admin.cancel}
            </button>
            <button
              id="btn-save-exercise-modal"
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.admin.saveExercise}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
