import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Offre écoles — facturation à l'école (voir supabase/ecoles.sql).
 * L'admin enregistre une école, y rattache des élèves et la marque « payée jusqu'au … ».
 * Tant qu'elle est payée, ses élèves ont l'accès complet (calculé dans accessService.loadMyAccess).
 */

export interface School {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  seats: number;
  price_per_student_gnf: number;
  paid_until: string | null;
  note: string | null;
  created_at: string;
}

export interface SchoolMember {
  user_id: string;
  email: string;
  full_name: string | null;
}

export interface SchoolPayment {
  id: string;
  school_id: string;
  amount_gnf: number;
  months: number;
  reference: string | null;
  paid_at: string;
}

export const DEFAULT_PRICE_PER_STUDENT_GNF = 25000;

export type SchoolStatus = 'paid' | 'expired' | 'unpaid';

export function schoolStatus(school: Pick<School, 'paid_until'>, now: Date = new Date()): SchoolStatus {
  if (!school.paid_until) return 'unpaid';
  return new Date(school.paid_until).getTime() > now.getTime() ? 'paid' : 'expired';
}

/** Montant d'un mois de facturation : places × prix par élève. */
export function monthlyAmount(school: Pick<School, 'seats' | 'price_per_student_gnf'>): number {
  return school.seats * school.price_per_student_gnf;
}

/**
 * Nouvelle date de fin après un paiement : on prolonge à partir de la fin actuelle si l'école est encore
 * payée (pas de jours perdus en payant en avance), sinon à partir d'aujourd'hui.
 */
export function extendPaidUntil(current: string | null, months: number, now: Date = new Date()): string {
  const base = current && new Date(current).getTime() > now.getTime() ? new Date(current) : new Date(now.getTime());
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

/** « 1 250 000 GNF » */
export function formatGnf(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} GNF`;
}

/** Extrait des adresses e-mail d'un texte collé (virgules, espaces, retours à la ligne, points-virgules). */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p) ? valid : invalid).push(p);
  }
  return { valid, invalid };
}

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label} : ${error.message}`);
}

export async function listSchools(): Promise<School[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: true });
  fail('Lecture des écoles', error);
  return (data || []) as School[];
}

export type SchoolInput = Pick<School, 'name' | 'contact_name' | 'contact_phone' | 'seats' | 'price_per_student_gnf' | 'note'>;

export function validateSchoolInput(i: SchoolInput): string | null {
  if (!i.name.trim()) return "Indique le nom de l'école.";
  if (!Number.isInteger(i.seats) || i.seats < 1) return 'Le nombre de places doit être au moins 1.';
  if (!Number.isInteger(i.price_per_student_gnf) || i.price_per_student_gnf < 0) return 'Le prix par élève est invalide.';
  return null;
}

export async function createSchool(input: SchoolInput): Promise<void> {
  const problem = validateSchoolInput(input);
  if (problem) throw new Error(problem);
  const { error } = await supabase.from('schools').insert({
    name: input.name.trim(),
    contact_name: input.contact_name?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    seats: input.seats,
    price_per_student_gnf: input.price_per_student_gnf,
    note: input.note?.trim() || null,
  });
  fail("Création de l'école", error);
}

export async function updateSchool(id: string, input: SchoolInput): Promise<void> {
  const problem = validateSchoolInput(input);
  if (problem) throw new Error(problem);
  const { count } = await supabase.from('school_members').select('user_id', { count: 'exact', head: true }).eq('school_id', id);
  if (typeof count === 'number' && input.seats < count) {
    throw new Error(`Cette école a déjà ${count} élèves : le nombre de places ne peut pas être inférieur.`);
  }
  const { error } = await supabase
    .from('schools')
    .update({
      name: input.name.trim(),
      contact_name: input.contact_name?.trim() || null,
      contact_phone: input.contact_phone?.trim() || null,
      seats: input.seats,
      price_per_student_gnf: input.price_per_student_gnf,
      note: input.note?.trim() || null,
    })
    .eq('id', id);
  fail("Modification de l'école", error);
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase.from('schools').delete().eq('id', id);
  fail("Suppression de l'école", error);
}

export async function listMembers(schoolId: string): Promise<SchoolMember[]> {
  const { data: rows, error } = await supabase.from('school_members').select('user_id').eq('school_id', schoolId);
  fail('Lecture des élèves', error);
  const ids = ((rows || []) as { user_id: string }[]).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: users, error: e2 } = await supabase.from('users').select('id, email, full_name').in('id', ids);
  fail('Lecture des élèves', e2);
  return ((users || []) as { id: string; email: string; full_name: string | null }[])
    .map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function countMembersBySchool(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('school_members').select('school_id');
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const r of data as { school_id: string }[]) out[r.school_id] = (out[r.school_id] || 0) + 1;
  return out;
}

export interface AddMembersReport {
  added: string[];
  notRegistered: string[]; // pas de compte avec cet e-mail
  alreadyElsewhere: string[]; // déjà rattaché à une autre école (ou à celle-ci)
  noSeat: string[]; // plus de places
  invalid: string[];
}

/** Rattache des élèves (déjà inscrits sur la plateforme) à une école, dans la limite des places. */
export async function addMembersByEmail(school: School, rawText: string): Promise<AddMembersReport> {
  const { valid, invalid } = parseEmails(rawText);
  const report: AddMembersReport = { added: [], notRegistered: [], alreadyElsewhere: [], noSeat: [], invalid };
  if (valid.length === 0) return report;

  const { data: users, error } = await supabase.from('users').select('id, email').in('email', valid);
  fail('Recherche des élèves', error);
  const byEmail = new Map<string, string>(((users || []) as { id: string; email: string }[]).map((u) => [u.email.toLowerCase(), u.id]));

  const ids = [...byEmail.values()];
  const { data: existing } = ids.length
    ? await supabase.from('school_members').select('user_id').in('user_id', ids)
    : { data: [] as { user_id: string }[] };
  const taken = new Set(((existing || []) as { user_id: string }[]).map((r) => r.user_id));

  const { data: mine } = await supabase.from('school_members').select('user_id').eq('school_id', school.id);
  let free = school.seats - ((mine || []) as unknown[]).length;

  for (const email of valid) {
    const id = byEmail.get(email);
    if (!id) {
      report.notRegistered.push(email);
    } else if (taken.has(id)) {
      report.alreadyElsewhere.push(email);
    } else if (free <= 0) {
      report.noSeat.push(email);
    } else {
      const { error: e } = await supabase.from('school_members').insert({ user_id: id, school_id: school.id });
      if (e) {
        report.alreadyElsewhere.push(email);
      } else {
        report.added.push(email);
        free--;
      }
    }
  }
  return report;
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await supabase.from('school_members').delete().eq('user_id', userId);
  fail("Retrait de l'élève", error);
}

export async function listPayments(schoolId: string): Promise<SchoolPayment[]> {
  const { data, error } = await supabase
    .from('school_payments')
    .select('*')
    .eq('school_id', schoolId)
    .order('paid_at', { ascending: false });
  fail('Lecture des paiements', error);
  return (data || []) as SchoolPayment[];
}

/** Enregistre un paiement reçu ET prolonge la période payée. */
export async function recordPayment(
  school: School,
  p: { months: number; amount_gnf: number; reference: string; adminId: string },
  now: Date = new Date()
): Promise<string> {
  if (!Number.isInteger(p.months) || p.months < 1) throw new Error('La durée doit être d’au moins 1 mois.');
  if (!Number.isFinite(p.amount_gnf) || p.amount_gnf < 0) throw new Error('Le montant est invalide.');
  const newEnd = extendPaidUntil(school.paid_until, p.months, now);
  // 1) le paiement d'abord (la trace comptable ne doit jamais manquer), 2) puis la prolongation
  const ins = await supabase.from('school_payments').insert({
    school_id: school.id,
    amount_gnf: Math.round(p.amount_gnf),
    months: p.months,
    reference: p.reference.trim() || null,
    paid_at: now.toISOString(),
    recorded_by: p.adminId,
  });
  fail('Enregistrement du paiement', ins.error);
  const up = await supabase.from('schools').update({ paid_until: newEnd }).eq('id', school.id);
  fail('Prolongation de la période payée', up.error);
  return newEnd;
}
