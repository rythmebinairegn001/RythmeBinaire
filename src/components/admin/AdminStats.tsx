import React, { useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { AdminStats as Stats, courseLabel, loadAdminStats } from '../../services/statsService';
import { formatGnf } from '../../services/schoolService';
import { AudienceResult, completionRate, loadAudience } from '../../services/analyticsService';

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
  const [audience, setAudience] = useState<AudienceResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAdminStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    loadAudience().then((a) => {
      if (!cancelled) setAudience(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return <p className="text-sm text-slate-500">…</p>;
  const max = Math.max(1, ...stats.daily.map((d) => d.count));

  return (
    <div id="admin-stats" className="space-y-8">
      <AudienceSection lang={lang} result={audience} />
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

const COUNTRY_NAMES: Record<string, { fr: string; en: string }> = {
  GN: { fr: 'Guinée', en: 'Guinea' }, SN: { fr: 'Sénégal', en: 'Senegal' }, CI: { fr: "Côte d'Ivoire", en: 'Ivory Coast' },
  ML: { fr: 'Mali', en: 'Mali' }, BF: { fr: 'Burkina Faso', en: 'Burkina Faso' }, BJ: { fr: 'Bénin', en: 'Benin' }, TG: { fr: 'Togo', en: 'Togo' },
  NE: { fr: 'Niger', en: 'Niger' }, CM: { fr: 'Cameroun', en: 'Cameroon' }, GA: { fr: 'Gabon', en: 'Gabon' }, CG: { fr: 'Congo', en: 'Congo' },
  MA: { fr: 'Maroc', en: 'Morocco' }, NG: { fr: 'Nigéria', en: 'Nigeria' }, GH: { fr: 'Ghana', en: 'Ghana' }, KE: { fr: 'Kenya', en: 'Kenya' },
  FR: { fr: 'France', en: 'France' }, BE: { fr: 'Belgique', en: 'Belgium' }, CA: { fr: 'Canada', en: 'Canada' }, US: { fr: 'États-Unis', en: 'United States' },
};

const Split: React.FC<{ title: string; data: Record<string, number>; label?: (k: string) => string }> = ({ title, data, label }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-600 mb-2">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">—</p>
      ) : (
        <ul className="space-y-1 text-sm text-slate-700">
          {entries.map(([k, n]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="truncate">{label ? label(k) : k}</span>
              <strong>{n} <span className="text-[11px] font-normal text-slate-400">({Math.round((n / total) * 100)} %)</span></strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Audience du site : visiteurs anonymes, pages vues, inscriptions, cours (données de la base, admin seulement). */
export const AudienceSection: React.FC<{ lang: PreferredLanguage; result: AudienceResult | null }> = ({ lang, result }) => {
  const fr = lang === 'fr';
  if (!result) return null;
  if (result.status !== 'ok') {
    const msg =
      result.status === 'missing'
        ? fr ? "L'audience n'est pas encore activée : exécutez supabase/analytics.sql dans Supabase (voir ANALYTICS-ACTIVATION.md)." : 'Audience is not enabled yet: run supabase/analytics.sql in Supabase (see ANALYTICS-ACTIVATION.md).'
        : result.status === 'forbidden'
          ? fr ? 'Accès refusé : cette page est réservée aux administrateurs.' : 'Access denied: this page is for administrators only.'
          : fr ? "Impossible de charger l'audience pour le moment." : 'Could not load the audience right now.';
    return <p id="audience-notice" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">{msg}</p>;
  }
  const a = result.data;
  const rate = completionRate(a.completion);
  const maxV = Math.max(1, ...a.daily.map((d) => d.visitors));
  const maxW = Math.max(1, ...a.weekly_signups.map((w) => w.signups));
  const cName = (k: string) => (COUNTRY_NAMES[k] ? COUNTRY_NAMES[k][lang] : k);
  const lName = (k: string) => (k === 'fr' ? 'Français' : k === 'en' ? 'English' : k);
  const dName = (k: string) => (k === 'mobile' ? (fr ? 'Téléphone' : 'Phone') : fr ? 'Ordinateur' : 'Computer');
  return (
    <section id="audience" className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Audience du site' : 'Site audience'}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={fr ? 'Visiteurs (aujourd’hui)' : 'Visitors (today)'} value={a.visitors_today} hint={fr ? `${a.visitors_total} depuis le début` : `${a.visitors_total} all time`} />
        <Tile label={fr ? 'Visiteurs (7 jours)' : 'Visitors (7 days)'} value={a.visitors_7} hint={fr ? `${a.visitors_30} sur 30 jours` : `${a.visitors_30} over 30 days`} />
        <Tile label={fr ? 'Pages vues (7 jours)' : 'Page views (7 days)'} value={a.views_7} hint={fr ? `${a.views_today} aujourd’hui · ${a.views_30} sur 30 j` : `${a.views_today} today · ${a.views_30} over 30 d`} />
        <Tile label={fr ? 'Connexions (30 jours)' : 'Logins (30 days)'} value={a.logins_30} />
        <Tile label={fr ? 'Inscrits (total)' : 'Registered (total)'} value={a.users_total} />
        <Tile label={fr ? 'Nouveaux inscrits' : 'New signups'} value={a.signups_7} hint={fr ? `7 jours · ${a.signups_30} sur 30 jours` : `7 days · ${a.signups_30} over 30 days`} />
        <Tile label={fr ? 'Utilisateurs actifs (7 j)' : 'Active users (7 d)'} value={a.active_7} hint={fr ? `${a.active_30} sur 30 jours` : `${a.active_30} over 30 days`} />
        <Tile label={fr ? 'Cours terminés' : 'Courses completed'} value={rate === null ? '—' : `${rate} %`} hint={fr ? `${a.completion.completed} sur ${a.completion.started} commencés` : `${a.completion.completed} of ${a.completion.started} started`} />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-600 mb-3">{fr ? 'Visiteurs par jour (30 derniers jours)' : 'Visitors per day (last 30 days)'}</p>
        <div className="flex items-end gap-1 h-28">
          {a.daily.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${d.day} : ${d.visitors} / ${d.views} / ${d.signups}`}>
              <div className="w-full rounded-t bg-sky-500" style={{ height: `${(d.visitors / maxV) * 100}%`, minHeight: d.visitors ? 3 : 1, opacity: d.visitors ? 1 : 0.2 }} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{fr ? 'Survolez une barre : jour, visiteurs / pages vues / inscriptions.' : 'Hover a bar: day, visitors / page views / signups.'}</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-600 mb-3">{fr ? 'Nouveaux inscrits par semaine (12 semaines)' : 'New signups per week (12 weeks)'}</p>
        <div className="flex items-end gap-1.5 h-24">
          {a.weekly_signups.map((w) => (
            <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full" title={`${w.week} : ${w.signups}`}>
              <span className="text-[10px] text-slate-500">{w.signups || ''}</span>
              <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(w.signups / maxW) * 100}%`, minHeight: w.signups ? 3 : 1, opacity: w.signups ? 1 : 0.2 }} />
            </div>
          ))}
        </div>
      </div>

      {a.courses.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm overflow-x-auto">
          <p className="text-xs font-semibold text-slate-600 mb-2">{fr ? 'Cours les plus suivis' : 'Most followed courses'}</p>
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="text-left text-[11px] text-slate-500">
                <th className="font-semibold pb-1">{fr ? 'Cours' : 'Course'}</th>
                <th className="font-semibold pb-1 text-right">{fr ? 'Inscrits' : 'Enrolled'}</th>
                <th className="font-semibold pb-1 text-right">{fr ? 'Commencés' : 'Started'}</th>
                <th className="font-semibold pb-1 text-right">{fr ? 'Terminés' : 'Completed'}</th>
              </tr>
            </thead>
            <tbody>
              {a.courses.map((c) => (
                <tr key={c.course_id} className="border-t border-slate-100">
                  <td className="py-1 pr-3 truncate max-w-[16rem]">{courseLabel(c.course_id, lang)}</td>
                  <td className="py-1 text-right">{c.enrolled}</td>
                  <td className="py-1 text-right">{c.starts}</td>
                  <td className="py-1 text-right">{c.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <Split title={fr ? 'Pays estimé (visiteurs, 30 j)' : 'Estimated country (visitors, 30 d)'} data={a.countries} label={cName} />
        <Split title={fr ? 'Langue des visiteurs (30 j)' : 'Visitor language (30 d)'} data={a.languages_visitors} label={lName} />
        <Split title={fr ? 'Langue des inscrits' : 'Registered users language'} data={a.languages_users} label={lName} />
      </div>
      <Split title={fr ? 'Appareil (visiteurs, 30 j)' : 'Device (visitors, 30 d)'} data={a.devices} label={dName} />
      <p className="text-[11px] text-slate-500">
        {fr
          ? "Chiffres anonymes : un visiteur = un navigateur (une personne sur deux appareils compte deux fois). Le pays est estimé par le fuseau horaire. Votre propre appareil : ouvrez le site avec ?notrack=1 pour ne plus être compté."
          : 'Anonymous figures: one visitor = one browser (a person on two devices counts twice). Country is estimated from the time zone. Your own device: open the site with ?notrack=1 to stop being counted.'}
      </p>
    </section>
  );
};
