import React, { useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { AdminStats as Stats, courseLabel, loadAdminStats } from '../../services/statsService';
import { formatGnf } from '../../services/schoolService';

interface Props {
  lang: PreferredLanguage;
}

const Tile: React.FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
    <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    <p className="font-display text-2xl font-bold text-slate-900 mt-1">{value}</p>
    {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

/** Tableau de bord chiffré de l'administrateur (lecture seule). */
export const AdminStats: React.FC<Props> = ({ lang }) => {
  const fr = lang === 'fr';
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAdminStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return <p className="text-sm text-slate-500">…</p>;
  const max = Math.max(1, ...stats.daily.map((d) => d.count));

  return (
    <div id="admin-stats" className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Élèves' : 'Students'}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label={fr ? 'Élèves inscrits' : 'Registered students'} value={stats.students.total} />
          <Tile label={fr ? 'Nouveaux (7 jours)' : 'New (7 days)'} value={stats.students.new7} hint={fr ? `${stats.students.new30} sur 30 jours` : `${stats.students.new30} over 30 days`} />
          <Tile label={fr ? 'Actifs (7 jours)' : 'Active (7 days)'} value={stats.activity.active7} hint={fr ? 'ont terminé une leçon' : 'completed a lesson'} />
          <Tile label={fr ? 'Actifs (30 jours)' : 'Active (30 days)'} value={stats.activity.active30} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Apprentissage' : 'Learning'}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label={fr ? 'Leçons terminées (total)' : 'Lessons completed (total)'} value={stats.activity.lessonsTotal} />
          <Tile label={fr ? 'Leçons (7 jours)' : 'Lessons (7 days)'} value={stats.activity.lessons7} />
          <Tile label={fr ? 'Indices IA (30 jours)' : 'AI hints (30 days)'} value={stats.activity.hints30} />
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-600 mb-3">{fr ? 'Leçons terminées par jour (14 derniers jours)' : 'Lessons completed per day (last 14 days)'}</p>
          <div className="flex items-end gap-1.5 h-28">
            {stats.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.day} : ${d.count}`}>
                <span className="text-[10px] text-slate-500">{d.count || ''}</span>
                <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1, opacity: d.count ? 1 : 0.2 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {stats.daily.map((d) => (
              <span key={d.day} className="flex-1 text-center text-[9px] text-slate-400">{d.day.slice(8)}</span>
            ))}
          </div>
        </div>
        {stats.topCourses.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 mb-2">{fr ? 'Cours les plus suivis (leçons terminées)' : 'Most followed courses (lessons completed)'}</p>
            <ol className="space-y-1 text-sm text-slate-700">
              {stats.topCourses.map((c) => (
                <li key={c.courseId} className="flex justify-between gap-3">
                  <span className="truncate">{courseLabel(c.courseId, lang)}</span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Argent et accès' : 'Money and access'}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label={fr ? 'Encaissé (total écoles)' : 'Collected (schools, total)'} value={formatGnf(stats.revenue.totalGnf)} />
          <Tile label={fr ? 'Encaissé (30 jours)' : 'Collected (30 days)'} value={formatGnf(stats.revenue.last30Gnf)} />
          <Tile label={fr ? 'Revenu mensuel des écoles payées' : 'Monthly revenue of paid schools'} value={formatGnf(stats.schools.monthlyRecurringGnf)} hint={fr ? `${stats.schools.paid} école(s) payée(s)` : `${stats.schools.paid} paid school(s)`} />
          <Tile label={fr ? 'Écoles (expirées / non payées)' : 'Schools (expired / unpaid)'} value={`${stats.schools.expired} / ${stats.schools.unpaid}`} hint={fr ? `${stats.schools.total} au total` : `${stats.schools.total} total`} />
          <Tile label={fr ? 'Accès offerts actifs' : 'Active free accesses'} value={stats.access.granted} />
          <Tile label={fr ? 'Accès payés actifs (individuels)' : 'Active paid accesses (individual)'} value={stats.access.paid} />
        </div>
        <p className="text-[11px] text-slate-500">
          {fr
            ? "Les paiements individuels sont activés à la main (« Payé ») sans montant enregistré : seuls les paiements des écoles sont comptés en argent."
            : 'Individual payments are activated by hand ("Paid") with no amount recorded: only school payments are counted as money.'}
        </p>
      </section>
    </div>
  );
};
