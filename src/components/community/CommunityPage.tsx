import React, { useCallback, useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import {
  ForumError, ForumPost, ForumQuestion, ForumStatus, FORUM_ERRORS, FORUM_LIMITS,
  acceptAnswer, answerQuestion, askQuestion, forumStatus, getThread, listQuestions, removeOwnPost, reportPost,
} from '../../services/forumService';

const BADGE = 'ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold';
const BTN = 'px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800';
const BTN_MAIN = 'px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50';

const Author: React.FC<{ name: string; teacher: boolean; lang: PreferredLanguage }> = ({ name, teacher, lang }) => (
  <span className="text-xs text-slate-600">{name}{teacher && <span className={BADGE}>{lang === 'fr' ? 'Professeur' : 'Teacher'}</span>}</span>
);

/** Message d'accès (compte enfant, réduit au silence, script absent). */
export const ForumBlockedView: React.FC<{ lang: PreferredLanguage; status: ForumStatus; onBack: () => void }> = ({ lang, status, onBack }) => {
  const fr = lang === 'fr';
  const text =
    status === 'child_account'
      ? fr ? "L'entraide n'est pas ouverte aux comptes enfants. Pose tes questions à ton professeur ou à l'adulte qui t'accompagne." : 'The community is not open to child accounts. Ask your teacher or the adult who supports you.'
      : status === 'muted'
      ? FORUM_ERRORS.muted[lang]
      : fr ? "L'entraide n'est pas encore activée sur ce site." : 'The community is not enabled on this site yet.';
  return (
    <div id="forum-blocked" className="max-w-xl mx-auto py-10 px-4 space-y-4">
      <p className="text-sm text-slate-700">{text}</p>
      <button type="button" className={BTN} onClick={onBack}>{fr ? 'Retour' : 'Back'}</button>
    </div>
  );
};

export const ForumListView: React.FC<{
  lang: PreferredLanguage; questions: ForumQuestion[]; hasMore: boolean; filterLang: 'all' | 'fr' | 'en'; unsolved: boolean;
  courseTitles: Record<string, string>; loading: boolean; error: ForumError | null;
  onFilterLang: (l: 'all' | 'fr' | 'en') => void; onUnsolved: (v: boolean) => void; onOpen: (id: string) => void; onAsk: () => void; onMore: () => void; onBack: () => void;
}> = (p) => {
  const fr = p.lang === 'fr';
  return (
    <div id="forum-list" className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">{fr ? 'Entraide' : 'Community help'}</h1>
        <div className="flex gap-2">
          <button type="button" className={BTN} onClick={p.onBack}>{fr ? 'Retour' : 'Back'}</button>
          <button id="forum-ask" type="button" className={BTN_MAIN} onClick={p.onAsk}>{fr ? 'Poser une question' : 'Ask a question'}</button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {fr ? 'Texte seulement, sans liens ni coordonnées. Sois respectueux : tout message peut être signalé.' : 'Text only, no links or contact details. Be respectful: any message can be reported.'}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1">
          {fr ? 'Langue' : 'Language'}
          <select id="forum-filter-lang" className="border border-slate-200 rounded-lg px-2 py-1" value={p.filterLang} onChange={(e) => p.onFilterLang(e.target.value as 'all')}>
            <option value="all">{fr ? 'Toutes' : 'All'}</option><option value="fr">Français</option><option value="en">English</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input id="forum-filter-unsolved" type="checkbox" checked={p.unsolved} onChange={(e) => p.onUnsolved(e.target.checked)} />
          {fr ? 'Sans réponse validée' : 'Not solved yet'}
        </label>
      </div>
      {p.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{FORUM_ERRORS[p.error][p.lang]}</div>}
      <ul className="space-y-2">
        {!p.loading && !p.error && p.questions.length === 0 && <li className="text-sm text-slate-500">{fr ? 'Aucune question pour le moment. Sois le premier !' : 'No questions yet. Be the first!'}</li>}
        {p.questions.map((q) => (
          <li key={q.id}>
            <button type="button" data-q={q.id} onClick={() => p.onOpen(q.id)} className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm text-slate-900">{q.title}</span>
                {q.solved && <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0">{fr ? 'Résolu' : 'Solved'}</span>}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">{q.excerpt}</p>
              <p className="text-[11px] text-slate-500">
                <Author name={q.author_name} teacher={q.author_is_teacher} lang={p.lang} /> · {q.answer_count} {fr ? (q.answer_count > 1 ? 'réponses' : 'réponse') : q.answer_count === 1 ? 'answer' : 'answers'}
                {q.course_id && p.courseTitles[q.course_id] ? ` · ${p.courseTitles[q.course_id]}` : ''} · {q.lang.toUpperCase()}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {p.hasMore && <button id="forum-more" type="button" className={BTN} onClick={p.onMore}>{fr ? 'Voir plus' : 'Load more'}</button>}
    </div>
  );
};

export const ForumAskView: React.FC<{
  lang: PreferredLanguage; courses: { id: string; title: string }[]; error: ForumError | null; busy: boolean;
  title: string; body: string; course: string; msgLang: 'fr' | 'en';
  onChange: (f: { title?: string; body?: string; course?: string; msgLang?: 'fr' | 'en' }) => void; onSubmit: () => void; onCancel: () => void;
}> = (p) => {
  const fr = p.lang === 'fr';
  return (
    <div id="forum-ask-form" className="max-w-2xl mx-auto py-8 px-4 space-y-4">
      <h1 className="font-display text-2xl font-bold text-slate-900">{fr ? 'Poser une question' : 'Ask a question'}</h1>
      <input id="forum-title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" maxLength={FORUM_LIMITS.titleMax} placeholder={fr ? 'Titre (ex : Ma boucle for ne s’arrête pas)' : 'Title (e.g. My for loop never stops)'} value={p.title} onChange={(e) => p.onChange({ title: e.target.value })} />
      <textarea id="forum-body" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[140px]" maxLength={FORUM_LIMITS.bodyMax} placeholder={fr ? 'Explique ce que tu as essayé et où tu bloques. Pas de lien, pas de numéro.' : 'Explain what you tried and where you are stuck. No links, no phone numbers.'} value={p.body} onChange={(e) => p.onChange({ body: e.target.value })} />
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">{fr ? 'Cours (facultatif)' : 'Course (optional)'}
          <select id="forum-course" className="border border-slate-200 rounded-lg px-2 py-1" value={p.course} onChange={(e) => p.onChange({ course: e.target.value })}>
            <option value="">—</option>{p.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">{fr ? 'Langue du message' : 'Message language'}
          <select id="forum-msglang" className="border border-slate-200 rounded-lg px-2 py-1" value={p.msgLang} onChange={(e) => p.onChange({ msgLang: e.target.value as 'fr' })}>
            <option value="fr">Français</option><option value="en">English</option>
          </select>
        </label>
      </div>
      {p.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{FORUM_ERRORS[p.error][p.lang]}</div>}
      <div className="flex gap-2">
        <button id="forum-submit" type="button" className={BTN_MAIN} disabled={p.busy} onClick={p.onSubmit}>{fr ? 'Publier' : 'Publish'}</button>
        <button type="button" className={BTN} onClick={p.onCancel}>{fr ? 'Annuler' : 'Cancel'}</button>
      </div>
    </div>
  );
};

export const ForumThreadView: React.FC<{
  lang: PreferredLanguage; posts: ForumPost[]; answerText: string; error: ForumError | null; note: string | null; busy: boolean;
  onAnswerText: (t: string) => void; onAnswer: () => void; onAccept: (p: ForumPost) => void; onReport: (p: ForumPost) => void; onRemove: (p: ForumPost) => void; onBack: () => void;
}> = (p) => {
  const fr = p.lang === 'fr';
  const q = p.posts.find((x) => x.kind === 'question');
  const answers = p.posts.filter((x) => x.kind === 'answer');
  if (!q)
    return (
      <div id="forum-thread" className="max-w-2xl mx-auto py-8 px-4 space-y-3">
        <p className="text-sm text-slate-600">{FORUM_ERRORS.not_found[p.lang]}</p>
        <button type="button" className={BTN} onClick={p.onBack}>{fr ? 'Retour' : 'Back'}</button>
      </div>
    );
  const actions = (x: ForumPost) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {x.kind === 'answer' && q.mine && <button type="button" data-accept={x.id} className={BTN} onClick={() => p.onAccept(x)}>{x.accepted ? (fr ? 'Retirer « utile »' : 'Unmark helpful') : fr ? 'Cette réponse m’a aidé' : 'This helped me'}</button>}
      {x.mine ? <button type="button" data-remove={x.id} className={BTN} onClick={() => p.onRemove(x)}>{fr ? 'Supprimer' : 'Delete'}</button> : <button type="button" data-report={x.id} className={BTN} onClick={() => p.onReport(x)}>{fr ? 'Signaler' : 'Report'}</button>}
    </div>
  );
  return (
    <div id="forum-thread" className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      <button type="button" className={BTN} onClick={p.onBack}>{fr ? '← Toutes les questions' : '← All questions'}</button>
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h1 className="font-display text-xl font-bold text-slate-900">{q.title}</h1>
        <p className="mt-1"><Author name={q.author_name} teacher={q.author_is_teacher} lang={p.lang} /></p>
        <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{q.body}</p>
        {actions(q)}
      </div>
      <h2 className="text-sm font-bold text-slate-700">{answers.length} {fr ? (answers.length > 1 ? 'réponses' : 'réponse') : answers.length === 1 ? 'answer' : 'answers'}</h2>
      <ul className="space-y-2">
        {answers.map((a) => (
          <li key={a.id} className={`rounded-2xl border p-4 ${a.accepted ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            {a.accepted && <p className="text-[11px] font-bold text-emerald-800 mb-1">{fr ? '✓ Réponse utile' : '✓ Helpful answer'}</p>}
            <Author name={a.author_name} teacher={a.author_is_teacher} lang={p.lang} />
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{a.body}</p>
            {actions(a)}
          </li>
        ))}
      </ul>
      {p.note && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{p.note}</div>}
      {p.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{FORUM_ERRORS[p.error][p.lang]}</div>}
      <div className="space-y-2">
        <textarea id="forum-answer" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[90px]" maxLength={FORUM_LIMITS.bodyMax} placeholder={fr ? 'Ta réponse : guide, explique, sans donner tout le code si possible.' : 'Your answer: guide and explain, without giving the whole code if possible.'} value={p.answerText} onChange={(e) => p.onAnswerText(e.target.value)} />
        <button id="forum-send-answer" type="button" className={BTN_MAIN} disabled={p.busy} onClick={p.onAnswer}>{fr ? 'Répondre' : 'Answer'}</button>
      </div>
    </div>
  );
};

/** Conteneur : charge, filtre, pose, répond, signale. */
export const CommunityPage: React.FC<{ lang: PreferredLanguage; courses: { id: string; title: string }[]; onBack: () => void }> = ({ lang, courses, onBack }) => {
  const fr = lang === 'fr';
  const [status, setStatus] = useState<ForumStatus | null>(null);
  const [screen, setScreen] = useState<'list' | 'ask' | 'thread'>('list');
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [filterLang, setFilterLang] = useState<'all' | 'fr' | 'en'>('all');
  const [unsolved, setUnsolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ForumError | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', course: '', msgLang: lang as 'fr' | 'en' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [answerText, setAnswerText] = useState('');
  const titles = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  useEffect(() => { void forumStatus().then(setStatus); }, []);

  const load = useCallback(async (append: boolean, offset: number) => {
    setLoading(true); setError(null);
    const r = await listQuestions({ lang: filterLang === 'all' ? null : filterLang, unsolved, offset });
    setLoading(false);
    if (!r.ok) { setError(r.error); return; }
    setHasMore(r.data.length >= FORUM_LIMITS.pageSize);
    setQuestions((prev) => (append ? [...prev, ...r.data] : r.data));
  }, [filterLang, unsolved]);
  useEffect(() => { if (status === 'ok' && screen === 'list') void load(false, 0); }, [status, screen, load]);

  const openThread = async (id: string) => {
    setOpenId(id); setScreen('thread'); setError(null); setNote(null); setAnswerText('');
    const r = await getThread(id);
    if (r.ok) setPosts(r.data); else { setPosts([]); setError(r.error); }
  };
  const reload = async () => { if (openId) { const r = await getThread(openId); if (r.ok) setPosts(r.data); } };

  if (status === null) return <div className="py-10 text-center text-sm text-slate-500">…</div>;
  if (status !== 'ok') return <ForumBlockedView lang={lang} status={status} onBack={onBack} />;

  if (screen === 'ask')
    return (
      <ForumAskView lang={lang} courses={courses} error={error} busy={busy} {...form}
        onChange={(f) => setForm((s) => ({ ...s, ...f }))}
        onCancel={() => { setError(null); setScreen('list'); }}
        onSubmit={async () => {
          setBusy(true); setError(null);
          const r = await askQuestion(form.title, form.body, form.course || null, form.msgLang);
          setBusy(false);
          if (!r.ok) { setError(r.error); return; }
          setForm({ title: '', body: '', course: '', msgLang: lang });
          await openThread(r.data);
        }} />
    );
  if (screen === 'thread')
    return (
      <ForumThreadView lang={lang} posts={posts} answerText={answerText} error={error} note={note} busy={busy}
        onBack={() => { setError(null); setScreen('list'); }}
        onAnswerText={setAnswerText}
        onAnswer={async () => {
          if (!openId) return;
          setBusy(true); setError(null); setNote(null);
          const r = await answerQuestion(openId, answerText);
          setBusy(false);
          if (!r.ok) { setError(r.error); return; }
          setAnswerText(''); await reload();
        }}
        onAccept={async (x) => { setError(null); const r = await acceptAnswer(x.id, !x.accepted); if (!r.ok) setError(r.error); await reload(); }}
        onRemove={async (x) => {
          if (!window.confirm(fr ? 'Supprimer ce message ?' : 'Delete this message?')) return;
          const r = await removeOwnPost(x.id);
          if (!r.ok) setError(r.error);
          if (x.kind === 'question') setScreen('list'); else await reload();
        }}
        onReport={async (x) => {
          const reason = window.prompt(fr ? 'Pourquoi signales-tu ce message ? (facultatif)' : 'Why are you reporting this message? (optional)') ;
          if (reason === null) return;
          const r = await reportPost(x.id, reason);
          setNote(r === 'ok' ? (fr ? 'Merci, le message a été signalé.' : 'Thanks, the message was reported.') : r === 'already' ? (fr ? 'Tu as déjà signalé ce message.' : 'You already reported this message.') : null);
          if (r === 'unavailable') setError('unavailable');
          await reload();
        }} />
    );
  return (
    <ForumListView lang={lang} questions={questions} hasMore={hasMore} filterLang={filterLang} unsolved={unsolved} courseTitles={titles} loading={loading} error={error}
      onFilterLang={setFilterLang} onUnsolved={setUnsolved} onOpen={openThread} onAsk={() => { setError(null); setScreen('ask'); }}
      onMore={() => void load(true, questions.length)} onBack={onBack} />
  );
};
