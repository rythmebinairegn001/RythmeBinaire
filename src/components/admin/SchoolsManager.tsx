import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Plus, Receipt, Trash2, UserMinus, Users } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { supabase } from '../../lib/supabase';
import {
  AddMembersReport,
  DEFAULT_PRICE_PER_STUDENT_GNF,
  School,
  SchoolInput,
  SchoolMember,
  SchoolPayment,
  addMembersByEmail,
  countMembersBySchool,
  createSchool,
  deleteSchool,
  formatGnf,
  listMembers,
  listPayments,
  listSchools,
  monthlyAmount,
  recordPayment,
  removeMember,
  schoolStatus,
  updateSchool,
} from '../../services/schoolService';

interface Props {
  lang: PreferredLanguage;
}

const EMPTY: SchoolInput = {
  name: '',
  contact_name: '',
  contact_phone: '',
  seats: 20,
  price_per_student_gnf: DEFAULT_PRICE_PER_STUDENT_GNF,
  note: '',
};

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900';
const btnCls =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition disabled:opacity-50';

function fmtDate(iso: string | null, fr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Admin : écoles clientes, élèves rattachés, paiements reçus. L'accès des élèves suit « payée jusqu'au ». */
export const SchoolsManager: React.FC<Props> = ({ lang }) => {
  const fr = lang === 'fr';
  const [schools, setSchools] = useState<School[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [formFor, setFormFor] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<SchoolInput>(EMPTY);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([listSchools(), countMembersBySchool()]);
      setSchools(s);
      setCounts(c);
      setLoadError(null);
    } catch {
      setLoadError(
        fr
          ? "La gestion des écoles n'est pas encore activée : exécute supabase/ecoles.sql dans Supabase (SQL Editor), puis recharge."
          : 'School management is not enabled yet: run supabase/ecoles.sql in Supabase (SQL Editor), then reload.'
      );
    } finally {
      setLoading(false);
    }
  }, [fr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wrap = async (okText: string, fn: () => Promise<void>) => {
    setMessage(null);
    try {
      await fn();
      await refresh();
      if (okText) setMessage({ kind: 'ok', text: okText });
      return true;
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
      return false;
    }
  };

  const openForm = (s: School | null) => {
    setMessage(null);
    if (!s) {
      setForm(EMPTY);
      setFormFor('new');
    } else {
      setForm({
        name: s.name,
        contact_name: s.contact_name ?? '',
        contact_phone: s.contact_phone ?? '',
        seats: s.seats,
        price_per_student_gnf: s.price_per_student_gnf,
        note: s.note ?? '',
      });
      setFormFor(s.id);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await wrap(fr ? 'École enregistrée.' : 'School saved.', () =>
      formFor === 'new' ? createSchool(form) : updateSchool(formFor as string, form)
    );
    if (ok) setFormFor(null);
  };

  const statusBadge = (s: School) => {
    const st = schoolStatus(s);
    const map = {
      paid: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', txt: fr ? `Payée jusqu'au ${fmtDate(s.paid_until, fr)}` : `Paid until ${fmtDate(s.paid_until, fr)}` },
      expired: { cls: 'bg-red-50 border-red-200 text-red-700', txt: fr ? `Expirée le ${fmtDate(s.paid_until, fr)}` : `Expired on ${fmtDate(s.paid_until, fr)}` },
      unpaid: { cls: 'bg-amber-50 border-amber-200 text-amber-800', txt: fr ? 'Pas encore payée' : 'Not paid yet' },
    }[st];
    return <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${map.cls}`}>{map.txt}</span>;
  };

  return (
    <div id="schools-manager" className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          {fr ? 'Écoles clientes' : 'School clients'}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr
            ? "Facturation à l'école : tu fixes le nombre de places et le prix par élève, tu rattaches les élèves (déjà inscrits), puis tu enregistres chaque paiement reçu. Tant que l'école est payée, ses élèves ont l'accès complet. L'accès s'applique quand l'accès payant est activé."
            : 'Billed per school: set the number of seats and the price per student, attach students (already registered), then record each payment received. While the school is paid, its students have full access. Access applies once paid access is turned on.'}
        </p>
        <button type="button" className={`${btnCls} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`} onClick={() => openForm(null)}>
          <Plus className="w-3.5 h-3.5" />
          {fr ? 'Nouvelle école' : 'New school'}
        </button>
      </div>

      {message && (
        <div role="status" className={`p-4 rounded-2xl border text-xs leading-relaxed ${message.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}
      {loadError && <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">{loadError}</div>}

      {formFor && !loadError && (
        <form onSubmit={submitForm} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? "Nom de l'école" : 'School name'}</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Responsable' : 'Contact person'}</label>
            <input className={inputCls} value={form.contact_name ?? ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Téléphone' : 'Phone'}</label>
            <input className={inputCls} value={form.contact_phone ?? ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Places (élèves)' : 'Seats (students)'}</label>
            <input type="number" min={1} className={inputCls} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Prix par élève et par mois (GNF)' : 'Price per student per month (GNF)'}</label>
            <input type="number" min={0} step={500} className={inputCls} value={form.price_per_student_gnf} onChange={(e) => setForm({ ...form, price_per_student_gnf: Number(e.target.value) })} />
          </div>
          <p className="sm:col-span-2 text-xs text-slate-500">
            {fr ? 'Facture mensuelle :' : 'Monthly invoice:'} <strong>{formatGnf(monthlyAmount(form))}</strong>
          </p>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Note interne' : 'Internal note'}</label>
            <input className={inputCls} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className={`${btnCls} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}>{fr ? 'Enregistrer' : 'Save'}</button>
            <button type="button" className={btnCls} onClick={() => setFormFor(null)}>{fr ? 'Annuler' : 'Cancel'}</button>
          </div>
        </form>
      )}

      {!loadError && (loading ? (
        <p className="text-sm text-slate-500">…</p>
      ) : schools.length === 0 ? (
        <p className="text-sm text-slate-500">{fr ? "Aucune école pour l'instant." : 'No schools yet.'}</p>
      ) : (
        schools.map((s) => (
          <SchoolCard
            key={s.id}
            school={s}
            used={counts[s.id] || 0}
            fr={fr}
            open={openId === s.id}
            badge={statusBadge(s)}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            onEdit={() => openForm(s)}
            wrap={wrap}
          />
        ))
      ))}
    </div>
  );
};

interface CardProps {
  school: School;
  used: number;
  fr: boolean;
  open: boolean;
  badge: React.ReactNode;
  onToggle: () => void;
  onEdit: () => void;
  wrap: (okText: string, fn: () => Promise<void>) => Promise<boolean>;
}

const SchoolCard: React.FC<CardProps> = ({ school, used, fr, open, badge, onToggle, onEdit, wrap }) => {
  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [payments, setPayments] = useState<SchoolPayment[]>([]);
  const [emails, setEmails] = useState('');
  const [report, setReport] = useState<AddMembersReport | null>(null);
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState<number>(monthlyAmount(school));
  const [reference, setReference] = useState('');

  const loadDetails = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([listMembers(school.id), listPayments(school.id)]);
      setMembers(m);
      setPayments(p);
    } catch {
      // le message d'erreur général est géré par le parent
    }
  }, [school.id]);

  useEffect(() => {
    if (open) loadDetails();
  }, [open, loadDetails, used]);

  useEffect(() => {
    setAmount(monthlyAmount(school) * months);
  }, [school.seats, school.price_per_student_gnf, months]);

  const addMembers = async () => {
    setReport(null);
    await wrap('', async () => {
      const r = await addMembersByEmail(school, emails);
      setReport(r);
      if (r.added.length) setEmails('');
    });
    loadDetails();
  };

  const pay = async () => {
    const { data } = await supabase.auth.getUser();
    const adminId = data?.user?.id;
    if (!adminId) return;
    const ok = await wrap(fr ? 'Paiement enregistré, période prolongée.' : 'Payment recorded, period extended.', async () => {
      await recordPayment(school, { months, amount_gnf: amount, reference, adminId });
    });
    if (ok) {
      setReference('');
      loadDetails();
    }
  };

  const total = payments.reduce((a, p) => a + p.amount_gnf, 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{school.name}</p>
          <p className="text-xs text-slate-500">
            {[school.contact_name, school.contact_phone].filter(Boolean).join(' · ') || (fr ? 'Pas de contact' : 'No contact')}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            <Users className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {used}/{school.seats} {fr ? 'élèves' : 'students'} · {formatGnf(school.price_per_student_gnf)} {fr ? '/ élève / mois' : '/ student / month'} ·{' '}
            <strong>{formatGnf(monthlyAmount(school))}</strong> {fr ? '/ mois' : '/ month'}
          </p>
        </div>
        {badge}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnCls} onClick={onToggle}>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {fr ? 'Élèves et paiements' : 'Students & payments'}
        </button>
        <button type="button" className={btnCls} onClick={onEdit}>{fr ? 'Modifier' : 'Edit'}</button>
        <button
          type="button"
          className={`${btnCls} text-red-700`}
          onClick={() => {
            if (window.confirm(fr ? `Supprimer l'école « ${school.name} » ? Ses élèves perdent l'accès de l'école (leurs comptes restent).` : `Delete "${school.name}"? Its students lose the school's access (their accounts remain).`))
              wrap(fr ? 'École supprimée.' : 'School deleted.', () => deleteSchool(school.id));
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {fr ? 'Supprimer' : 'Delete'}
        </button>
      </div>

      {open && (
        <div className="grid md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{fr ? 'Élèves' : 'Students'}</h3>
            {members.length === 0 ? (
              <p className="text-xs text-slate-500">{fr ? 'Aucun élève rattaché.' : 'No students attached.'}</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-auto">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{m.full_name || '—'} · <span className="text-slate-500">{m.email}</span></span>
                    <button type="button" title={fr ? 'Retirer' : 'Remove'} className="text-slate-400 hover:text-red-600" onClick={() => wrap('', () => removeMember(m.user_id)).then(loadDetails)}>
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              className={`${inputCls} h-24`}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={fr ? 'Colle les e-mails des élèves (un par ligne ou séparés par des virgules). Ils doivent déjà être inscrits.' : 'Paste students\' emails (one per line or comma-separated). They must already be registered.'}
            />
            <button type="button" className={btnCls} onClick={addMembers} disabled={!emails.trim()}>
              <Plus className="w-3.5 h-3.5" />
              {fr ? 'Ajouter ces élèves' : 'Add these students'}
            </button>
            {report && (
              <div className="text-xs space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {report.added.length > 0 && <p className="text-emerald-800">{fr ? `${report.added.length} ajouté(s).` : `${report.added.length} added.`}</p>}
                {report.notRegistered.length > 0 && <p className="text-amber-800">{fr ? 'Pas encore inscrits : ' : 'Not registered yet: '}{report.notRegistered.join(', ')}</p>}
                {report.alreadyElsewhere.length > 0 && <p className="text-amber-800">{fr ? 'Déjà rattachés à une école : ' : 'Already attached to a school: '}{report.alreadyElsewhere.join(', ')}</p>}
                {report.noSeat.length > 0 && <p className="text-red-700">{fr ? 'Plus de places pour : ' : 'No seats left for: '}{report.noSeat.join(', ')}</p>}
                {report.invalid.length > 0 && <p className="text-red-700">{fr ? 'Adresses invalides : ' : 'Invalid addresses: '}{report.invalid.join(', ')}</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Receipt className="w-4 h-4" />{fr ? 'Enregistrer un paiement reçu' : 'Record a payment received'}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{fr ? 'Mois couverts' : 'Months covered'}</label>
                <select className={inputCls} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                  {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{fr ? 'Montant reçu (GNF)' : 'Amount received (GNF)'}</label>
                <input type="number" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
            </div>
            <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={fr ? 'Référence (n° Orange Money, reçu…)' : 'Reference (Orange Money no., receipt…)'} />
            <button type="button" className={`${btnCls} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`} onClick={pay}>
              {fr ? 'Enregistrer le paiement' : 'Record payment'}
            </button>
            {payments.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-slate-700">{fr ? 'Historique' : 'History'} · {fr ? 'total encaissé' : 'total received'} {formatGnf(total)}</p>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {payments.map((p) => (
                    <li key={p.id} className="text-slate-600">
                      {fmtDate(p.paid_at, fr)} · {formatGnf(p.amount_gnf)} · {p.months} {fr ? 'mois' : 'mo.'}{p.reference ? ` · ${p.reference}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
