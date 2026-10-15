import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, UserMinus } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { TeacherEntry, addTeacherByEmail, listTeachers, removeTeacher } from '../../services/teacherService';

/** Admin : désigner les professeurs (un compte existant + le droit « professeur »). */
export const TeachersManager: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => {
  const fr = lang === 'fr';
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [email, setEmail] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTeachers(await listTeachers());
      setLoadError(null);
    } catch {
      setLoadError(fr ? "L'espace professeur n'est pas encore activé : exécute supabase/professeurs.sql dans Supabase (SQL Editor), puis recharge." : 'The teacher space is not enabled yet: run supabase/professeurs.sql in Supabase (SQL Editor), then reload.');
    }
  }, [fr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const r = await addTeacherByEmail(email);
      const txt = {
        added: fr ? 'Professeur ajouté. Il verra « Espace professeur » à sa prochaine connexion.' : 'Teacher added. They will see "Teacher space" at their next login.',
        already: fr ? 'Cette personne est déjà professeur.' : 'This person is already a teacher.',
        not_registered: fr ? "Aucun compte avec cet e-mail : la personne doit d'abord s'inscrire." : 'No account with this e-mail: the person must register first.',
        invalid: fr ? 'E-mail invalide.' : 'Invalid e-mail.',
      }[r];
      setMessage({ kind: r === 'added' ? 'ok' : 'error', text: txt });
      if (r === 'added') {
        setEmail('');
        await refresh();
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div id="teachers-manager" className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          {fr ? 'Professeurs' : 'Teachers'}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr
            ? "Un professeur est un compte normal à qui tu donnes le droit de créer des classes. Il ne voit que les élèves qui rejoignent ses classes avec son code."
            : 'A teacher is a normal account that you allow to create classes. They only see the students who join their classes with their code.'}
        </p>
        <form className="flex flex-col sm:flex-row gap-3 pt-2" onSubmit={add}>
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={fr ? 'E-mail du professeur (compte existant)' : 'Teacher e-mail (existing account)'}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
          />
          <button type="submit" className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white">
            {fr ? 'Ajouter' : 'Add'}
          </button>
        </form>
      </div>
      {loadError && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>}
      {message && <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${message.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>{message.text}</div>}
      {!loadError && (
        <ul className="space-y-2">
          {teachers.length === 0 && <li className="text-sm text-slate-500">{fr ? 'Aucun professeur pour le moment.' : 'No teachers yet.'}</li>}
          {teachers.map((t) => (
            <li key={t.user_id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-slate-900">{t.full_name || t.email}</div>
                <div className="text-xs text-slate-500">{t.email}</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                onClick={async () => {
                  if (!window.confirm(fr ? 'Retirer le droit professeur ? Ses classes restent en base mais il ne pourra plus en créer.' : 'Remove teacher rights? Their classes stay in the database but they can no longer create any.')) return;
                  await removeTeacher(t.user_id);
                  await refresh();
                }}
              >
                <UserMinus className="w-3.5 h-3.5" /> {fr ? 'Retirer' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
