import React, { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { ClassOverview } from '../../services/teacherService';
import { buildReminderMessage, studentsToRemind } from '../../services/reminderMessage';
import { whatsappLink } from '../../services/parentReportService';

/** Relance des élèves inactifs : message prêt à envoyer dans le groupe WhatsApp de la classe. Caché si personne à relancer. */
export const InactiveReminder: React.FC<{
  overview: ClassOverview;
  className: string;
  whatsappUrl: string | null;
  lang: PreferredLanguage;
}> = ({ overview, className, whatsappUrl, lang }) => {
  const fr = lang === 'fr';
  const [quiet, setQuiet] = useState(true);
  const [withNames, setWithNames] = useState(false);
  const [copied, setCopied] = useState(false);
  const targets = useMemo(() => studentsToRemind(overview.rows, quiet), [overview.rows, quiet]);
  const message = useMemo(
    () => buildReminderMessage(targets, { lang: fr ? 'fr' : 'en', className, withNames, siteUrl: typeof window !== 'undefined' ? window.location.origin : '' }),
    [targets, fr, className, withNames],
  );
  if (!overview.rows.length || (!targets.length && quiet)) return null;
  if (!targets.length) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3" data-testid="inactive-reminder">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-emerald-700" />
        {fr ? `Relancer ${targets.length} élève${targets.length > 1 ? 's' : ''} inactif${targets.length > 1 ? 's' : ''}` : `Remind ${targets.length} inactive student${targets.length > 1 ? 's' : ''}`}
      </h3>
      <div className="flex flex-wrap gap-4 text-xs text-slate-800">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} />
          {fr ? 'Inclure ceux inactifs depuis plus de 7 jours' : 'Include those inactive for over 7 days'}
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={withNames} onChange={(e) => setWithNames(e.target.checked)} />
          {fr ? 'Citer les prénoms (jamais ceux des enfants)' : 'Mention first names (never children’s)'}
        </label>
      </div>
      <textarea readOnly value={message} rows={5} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900" aria-label={fr ? 'Message de relance' : 'Reminder message'} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white">
          {copied ? (fr ? 'Copié ✓' : 'Copied ✓') : fr ? 'Copier le message' : 'Copy message'}
        </button>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
            {fr ? 'Ouvrir le groupe WhatsApp de la classe' : 'Open the class WhatsApp group'}
          </a>
        )}
        <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-800">
          {fr ? 'Envoyer via WhatsApp (choisir le contact)' : 'Send via WhatsApp (pick contact)'}
        </a>
      </div>
      <p className="text-[11px] text-slate-600">
        {fr
          ? 'Copie le message, ouvre le groupe, colle-le : WhatsApp ne permet pas d’écrire dans un groupe à ta place. Aucun numéro de téléphone n’est enregistré.'
          : 'Copy the message, open the group and paste it: WhatsApp does not let apps post in a group for you. No phone number is stored.'}
      </p>
    </section>
  );
};
