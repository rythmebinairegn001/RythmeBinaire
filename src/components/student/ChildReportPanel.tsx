import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { QuizHistoryPanel } from './QuizHistory';
import { ChildReport, loadChildReport, reportToText, whatsappLink } from '../../services/parentReportService';

const STATE: Record<ChildReport['activity'], { fr: string; en: string; cls: string }> = {
  active: { fr: 'Actif cette semaine', en: 'Active this week', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  quiet: { fr: 'Activité en baisse', en: 'Activity slowing', cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  inactive: { fr: 'Inactif depuis longtemps', en: 'Inactive for a while', cls: 'bg-red-50 border-red-200 text-red-700' },
  never: { fr: 'Pas encore commencé', en: 'Not started yet', cls: 'bg-slate-100 border-slate-200 text-slate-600' },
};

/** Affichage pur du rapport (testable). */
export const ChildReportView: React.FC<{
  name: string;
  report: ChildReport;
  titles: Record<string, string>;
  lang: PreferredLanguage;
}> = ({ name, report: r, titles, lang }) => {
  const fr = lang === 'fr';
  const tile = (value: string, label: string) => (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-center">
      <div className="font-display text-xl font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
  const text = reportToText(name, r, titles, lang);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4" data-testid="child-report">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h3 className="text-sm font-bold text-slate-900">{fr ? `Rapport de ${name} – 7 derniers jours` : `${name}'s report – last 7 days`}</h3>
        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${STATE[r.activity].cls}`}>{fr ? STATE[r.activity].fr : STATE[r.activity].en}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tile(String(r.lessonsWeek), fr ? 'leçons cette semaine' : 'lessons this week')}
        {tile(`${r.activeDays7}/7`, fr ? 'jours actifs' : 'active days')}
        {tile(`${r.passedWeek}/${r.attemptsWeek}`, fr ? 'exercices réussis' : 'exercises passed')}
        {tile(String(r.hintsWeek), fr ? 'indices IA demandés' : 'AI hints asked')}
      </div>
      <p className="text-xs text-slate-600">
        {fr ? 'Série en cours' : 'Current streak'} : {r.streak} {fr ? (r.streak > 1 ? 'jours' : 'jour') : r.streak === 1 ? 'day' : 'days'} · {fr ? 'Total' : 'Total'} : {r.lessonsTotal} {fr ? 'leçon(s) terminée(s)' : 'lesson(s) completed'} ·{' '}
        {r.daysSince === null ? (fr ? 'aucune activité' : 'no activity') : r.daysSince === 0 ? (fr ? "dernière activité aujourd'hui" : 'last active today') : fr ? `dernière activité il y a ${r.daysSince} j` : `last active ${r.daysSince} d ago`}
      </p>
      {r.courses.length > 0 && (
        <ul className="space-y-2">
          {r.courses.map((c) => (
            <li key={c.courseId} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700">
                <span className="font-semibold">{titles[c.courseId] || (fr ? 'Cours' : 'Course')}</span>
                <span>{c.percent !== null ? `${c.percent} %` : `${c.done} ${fr ? 'leçon(s)' : 'lesson(s)'}`}</span>
              </div>
              {c.percent !== null && (
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${c.percent}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-700 leading-relaxed">💡 {fr ? r.tip.fr : r.tip.en}</p>
      <a href={whatsappLink(text)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
        <MessageCircle className="w-3.5 h-3.5" /> {fr ? 'Partager par WhatsApp' : 'Share on WhatsApp'}
      </a>
    </div>
  );
};

/** Charge et affiche le rapport d'un enfant. */
export const ChildReportPanel: React.FC<{ childId: string; name: string; titles: Record<string, string>; lang: PreferredLanguage }> = ({ childId, name, titles, lang }) => {
  const [report, setReport] = useState<ChildReport | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadChildReport(childId).then((r) => !cancelled && setReport(r)).catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [childId]);
  if (error) return <p className="text-xs text-amber-800">{lang === 'fr' ? 'Rapport indisponible pour le moment.' : 'Report unavailable right now.'}</p>;
  if (!report) return <p className="text-xs text-slate-500">…</p>;
  return (
    <div className="space-y-4">
      <ChildReportView name={name} report={report} titles={titles} lang={lang} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <QuizHistoryPanel userId={childId} lang={lang} title={lang === 'fr' ? `Quiz de ${name}` : `${name}'s quizzes`} />
      </div>
    </div>
  );
};
