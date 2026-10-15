import React, { useEffect, useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { CONTACT, COUNTRY_PRICES, PRICING, formatMoney, getCountryPrice, loadCountry, saveCountry } from '../../data/pricing';
import { DEFAULT_ACCESS_SETTINGS, loadAccessSettings } from '../../services/accessService';

interface Props {
  lang: PreferredLanguage;
  onNavigate: (view: string) => void;
}

/** Page publique « Tarifs ». Tant que l'accès payant est éteint, un bandeau dit honnêtement que tout est gratuit. */
export const PricingPage: React.FC<Props> = ({ lang, onNavigate }) => {
  const fr = lang === 'fr';
  const [paywallOn, setPaywallOn] = useState(false);
  const [country, setCountry] = useState<string>(() => loadCountry());
  const cp = getCountryPrice(country);
  const [freeLessons, setFreeLessons] = useState(DEFAULT_ACCESS_SETTINGS.freeLessonsPerCourse);

  useEffect(() => {
    let cancelled = false;
    loadAccessSettings().then(({ settings }) => {
      if (cancelled) return;
      setPaywallOn(settings.paywallEnabled);
      setFreeLessons(settings.freeLessonsPerCourse);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const wa = (text: string) => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

  const plans = [
    {
      id: 'discovery',
      name: fr ? 'Découverte' : 'Discovery',
      price: fr ? 'Gratuit' : 'Free',
      unit: '',
      features: [
        fr ? `Les ${freeLessons} premières leçons de chaque cours` : `The first ${freeLessons} lessons of every course`,
        fr ? 'Éditeur de code dans le navigateur' : 'In-browser code editor',
        fr ? 'Exercices corrigés automatiquement' : 'Automatically checked exercises',
      ],
      cta: fr ? 'Créer un compte' : 'Create an account',
      onClick: () => onNavigate('register'),
    },
    {
      id: 'individual',
      name: fr ? 'Individuel' : 'Individual',
      price: formatMoney(cp.individualPerMonth, cp.currency),
      unit: fr ? '/ mois' : '/ month',
      highlight: true,
      features: [
        fr ? 'Tous les cours : Coder et Culture numérique' : 'All courses: Coding and Digital culture',
        fr ? 'Tuteur IA à indices progressifs (il te fait réfléchir, il ne donne pas la solution)' : 'AI tutor with progressive hints (it makes you think, it does not give the answer)',
        fr ? 'Tous les exercices et projets' : 'All exercises and projects',
        fr ? 'Compte enfant supervisé pour les moins de 12 ans' : 'Supervised child account for under-12s',
      ],
      cta: fr ? 'Demander mon accès' : 'Request my access',
      href: wa(fr ? "Bonjour, je souhaite activer l'accès Individuel à RythmeBinaireGn." : 'Hello, I would like to activate Individual access to RythmeBinaireGn.'),
    },
    {
      id: 'school',
      name: fr ? 'Écoles' : 'Schools',
      price: formatMoney(cp.schoolPerStudentPerMonth, cp.currency),
      unit: fr ? '/ élève / mois' : '/ student / month',
      features: [
        fr ? `À partir de ${PRICING.schoolMinStudents} élèves` : `From ${PRICING.schoolMinStudents} students`,
        fr ? "Facture unique à l'école" : 'One invoice to the school',
        fr ? "Tout l'accès Individuel pour chaque élève" : 'Full Individual access for every student',
        fr ? 'Suivi par RythmeBinaireGn' : 'Follow-up by RythmeBinaireGn',
      ],
      cta: fr ? 'Parler à notre équipe' : 'Talk to our team',
      href: wa(fr ? "Bonjour, je représente une école et je souhaite en savoir plus sur l'offre Écoles de RythmeBinaireGn." : 'Hello, I represent a school and would like to know more about the RythmeBinaireGn Schools offer.'),
    },
  ];

  return (
    <div id="pricing-page" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <header className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{fr ? 'Tarifs' : 'Pricing'}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr ? 'Des prix pensés pour l’Afrique, payables par Mobile Money. Pas de carte bancaire, pas de renouvellement automatique.' : 'Prices designed for Africa, payable by Mobile Money. No bank card, no automatic renewal.'}
        </p>
      </header>

      <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-2 text-sm text-slate-700">
        <label htmlFor="pricing-country">{fr ? 'Ton pays :' : 'Your country:'}</label>
        <select
          id="pricing-country"
          className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          value={country}
          onChange={(e) => { setCountry(e.target.value); saveCountry(e.target.value); }}
        >
          {COUNTRY_PRICES.map((c) => (
            <option key={c.code} value={c.code}>{fr ? c.fr : c.en}</option>
          ))}
        </select>
        <span className="w-full text-center text-xs text-slate-500">
          {fr ? 'Prix fixes dans la monnaie de ton pays, sans frais cachés ni conversion.' : 'Fixed prices in your country’s currency, no hidden fees or conversion.'}
        </span>
      </div>

      {!paywallOn && (
        <div role="status" className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 text-center leading-relaxed">
          {fr
            ? "Phase pilote : l'accès est gratuit pour le moment. Les tarifs ci-dessous s'appliqueront à l'ouverture de l'accès payant, et nous préviendrons à l'avance."
            : 'Pilot phase: access is free for now. The prices below will apply when paid access opens, and we will tell you in advance.'}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className={`rounded-3xl p-6 border shadow-sm bg-white flex flex-col ${p.highlight ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200'}`}>
            <h2 className="font-display text-lg font-bold text-slate-900">{p.name}</h2>
            <p className="mt-3 text-3xl font-bold font-display text-slate-900">
              {p.price} <span className="text-sm font-medium text-slate-500">{p.unit}</span>
            </p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {p.href ? (
              <a href={p.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition">
                <MessageCircle className="w-4 h-4" />
                {p.cta}
              </a>
            ) : (
              <button type="button" onClick={p.onClick} className="mt-6 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition">
                {p.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="max-w-2xl mx-auto space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Comment payer' : 'How to pay'}</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed">
          <li>{fr ? 'Crée ton compte gratuitement.' : 'Create your free account.'}</li>
          <li>{cp.code === 'GN'
            ? fr ? "Écris-nous sur WhatsApp : nous t'indiquons le numéro Orange Money et le montant." : 'Message us on WhatsApp: we give you the Orange Money number and the amount.'
            : fr ? "Écris-nous sur WhatsApp : nous t'indiquons le moyen de paiement mobile disponible dans ton pays et le montant." : 'Message us on WhatsApp: we tell you which mobile payment method is available in your country, and the amount.'}</li>
          <li>{fr ? 'Fais le paiement et envoie-nous la confirmation.' : 'Make the payment and send us the confirmation.'}</li>
          <li>{fr ? "Nous activons ton accès complet pour la période payée." : 'We activate your full access for the paid period.'}</li>
        </ol>
        <p className="text-xs text-slate-500">
          {fr ? 'Questions : ' : 'Questions: '}
          {CONTACT.email} · {CONTACT.phone}.{' '}
          <button type="button" className="underline hover:text-slate-900" onClick={() => onNavigate('terms')}>
            {fr ? "Conditions d'utilisation" : 'Terms of use'}
          </button>
        </p>
      </section>
    </div>
  );
};
