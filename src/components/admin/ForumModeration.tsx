import React, { useCallback, useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { ForumAdminPost, adminAction, adminListPosts, adminMute } from '../../services/forumService';

const BTN = 'px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800';

export const ForumModerationView: React.FC<{
  lang: PreferredLanguage; posts: ForumAdminPost[] | null; onlyFlagged: boolean; onToggle: (v: boolean) => void;
  onAction: (p: ForumAdminPost, a: 'hide' | 'restore' | 'delete') => void; onMute: (p: ForumAdminPost) => void;
}> = ({ lang, posts, onlyFlagged, onToggle, onAction, onMute }) => {
  const fr = lang === 'fr';
  if (posts === null)
    return (
      <div id="forum-moderation" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {fr ? "L'entraide n'est pas activée : exécute supabase/entraide.sql dans Supabase (SQL Editor), puis recharge." : 'Community is not enabled: run supabase/entraide.sql in Supabase (SQL Editor), then reload.'}
      </div>
    );
  return (
    <div id="forum-moderation" className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input id="forum-only-flagged" type="checkbox" checked={onlyFlagged} onChange={(e) => onToggle(e.target.checked)} />
        {fr ? 'Seulement les messages signalés ou masqués' : 'Only reported or hidden messages'}
      </label>
      <ul className="space-y-2">
        {posts.length === 0 && <li className="text-sm text-slate-500">{fr ? 'Rien à modérer.' : 'Nothing to moderate.'}</li>}
        {posts.map((p) => (
          <li key={p.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div className="text-xs text-slate-600">{p.author_name} · {p.author_email} · {p.kind === 'question' ? (fr ? 'Question' : 'Question') : fr ? 'Réponse' : 'Answer'}{p.author_muted ? (fr ? ' · réduit au silence' : ' · muted') : ''}</div>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${p.status === 'hidden' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                {p.status === 'hidden' ? (fr ? `Masqué (${p.hidden_by})` : `Hidden (${p.hidden_by})`) : fr ? 'Visible' : 'Visible'} · {p.report_count} {fr ? 'signalement(s)' : 'report(s)'}
              </span>
            </div>
            {p.title && <div className="font-semibold text-sm text-slate-900">{p.title}</div>}
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{p.body}</p>
            {p.reasons && <p className="text-xs text-slate-500">{fr ? 'Motifs' : 'Reasons'} : {p.reasons}</p>}
            <div className="flex flex-wrap gap-2">
              {p.status === 'hidden' ? <button type="button" data-act="restore" className={BTN} onClick={() => onAction(p, 'restore')}>{fr ? 'Rétablir' : 'Restore'}</button> : <button type="button" data-act="hide" className={BTN} onClick={() => onAction(p, 'hide')}>{fr ? 'Masquer' : 'Hide'}</button>}
              <button type="button" data-act="delete" className={`${BTN} text-red-800`} onClick={() => onAction(p, 'delete')}>{fr ? 'Supprimer' : 'Delete'}</button>
              <button type="button" data-act="mute" className={BTN} onClick={() => onMute(p)}>{p.author_muted ? (fr ? 'Rendre la parole' : 'Unmute') : fr ? 'Réduire au silence' : 'Mute author'}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ForumModeration: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => {
  const fr = lang === 'fr';
  const [posts, setPosts] = useState<ForumAdminPost[] | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => setPosts(await adminListPosts(onlyFlagged)), [onlyFlagged]);
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <>
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>}
      <ForumModerationView lang={lang} posts={posts} onlyFlagged={onlyFlagged} onToggle={setOnlyFlagged}
        onAction={async (p, a) => {
          setError(null);
          if (a === 'delete' && !window.confirm(fr ? 'Supprimer définitivement ce message (et ses réponses s’il s’agit d’une question) ?' : 'Permanently delete this message (and its answers if it is a question)?')) return;
          if (!(await adminAction(p.id, a))) setError(fr ? 'Action impossible. Réessaie.' : 'Action failed. Try again.');
          await refresh();
        }}
        onMute={async (p) => {
          setError(null);
          if (!(await adminMute(p.author_id, !p.author_muted, ''))) setError(fr ? 'Action impossible. Réessaie.' : 'Action failed. Try again.');
          await refresh();
        }} />
    </>
  );
};
