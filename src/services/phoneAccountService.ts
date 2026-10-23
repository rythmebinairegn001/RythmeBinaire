import { getSupabaseConfig } from '../lib/supabase';
import { PreferredLanguage } from '../types/database';

/**
 * Comptes par numéro de téléphone : appelle la fonction serveur « phone-account » (voir supabase/functions/phone-account).
 * Pas de session : c'est pour s'inscrire ou récupérer un mot de passe, donc on utilise seulement la clé publique.
 */

export const PHONE_MIN_PASSWORD = 8;

export interface PhoneAccountResult {
  recovery_code: string;
}

async function call(body: Record<string, unknown>, lang: PreferredLanguage): Promise<PhoneAccountResult> {
  const { url, anonKey } = getSupabaseConfig();
  let resp: Response;
  try {
    resp = await fetch(`${url.replace(/\/$/, '')}/functions/v1/phone-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ ...body, language: lang }),
    });
  } catch {
    throw new Error(lang === 'fr' ? 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.' : 'Cannot reach the server. Check your connection and try again.');
  }
  const payload = (await resp.json().catch(() => null)) as { error?: string; recovery_code?: string } | null;
  if (!resp.ok || !payload?.recovery_code) {
    if (resp.status === 404 && !payload)
      throw new Error(lang === 'fr' ? 'Le compte par téléphone n’est pas encore activé sur la plateforme. Utilise ton e-mail.' : 'Phone accounts are not enabled yet. Use your email.');
    throw new Error(payload?.error || (lang === 'fr' ? 'Une erreur est survenue. Réessaie dans un instant.' : 'Something went wrong. Please try again.'));
  }
  return { recovery_code: payload.recovery_code };
}

export const signupWithPhone = (p: { phone: string; password: string; fullName: string; lang: PreferredLanguage }) =>
  call({ action: 'signup', phone: p.phone, password: p.password, full_name: p.fullName, age_confirmed: true }, p.lang);

export const recoverWithPhone = (p: { phone: string; code: string; newPassword: string; lang: PreferredLanguage }) =>
  call({ action: 'recover', phone: p.phone, code: p.code, password: p.newPassword }, p.lang);
