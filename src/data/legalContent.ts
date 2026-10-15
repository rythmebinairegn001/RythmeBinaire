import { CONTACT, LEGAL_UPDATED, PRICING, gnf } from './pricing';

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}
export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}
type Lang = 'fr' | 'en';
type Kind = 'terms' | 'privacy';

const contactFr = `Écris-nous à ${CONTACT.email} ou par WhatsApp au ${CONTACT.phone}.`;
const contactEn = `Write to us at ${CONTACT.email} or on WhatsApp at ${CONTACT.phone}.`;

const DOCS: Record<Kind, Record<Lang, LegalDoc>> = {
  terms: {
    fr: {
      title: "Conditions d'utilisation",
      intro: `RythmeBinaireGn est une plateforme pour apprendre la technologie à son rythme. En créant un compte ou en utilisant le site, tu acceptes ces conditions. Dernière mise à jour : ${LEGAL_UPDATED.fr}.`,
      sections: [
        {
          title: 'Qui peut créer un compte',
          bullets: [
            "Toute personne de 12 ans ou plus peut créer son propre compte.",
            "Un enfant de moins de 12 ans ne crée pas de compte seul : un adulte responsable crée d'abord son propre compte, puis ajoute l'enfant depuis l'espace « Famille ». L'adulte reste responsable du compte de l'enfant.",
            "À l'inscription, tu déclares avoir 12 ans ou plus. Si nous constatons ou soupçonnons qu'un compte ordinaire appartient à un enfant de moins de 12 ans, nous pouvons le bloquer et demander à un adulte responsable de créer un compte supervisé.",
            "Tu donnes des informations exactes et tu gardes ton mot de passe pour toi. Un compte est personnel : ne le partage pas.",
          ],
        },
        {
          title: 'Accès gratuit et accès payant',
          paragraphs: [
            "Certaines leçons sont en accès libre (« Découverte »). L'accès complet à tous les cours peut être payant ou offert par RythmeBinaireGn.",
            `Tarifs indicatifs : ${gnf(PRICING.individualPerMonth)} par mois pour un apprenant individuel ; ${gnf(PRICING.schoolPerStudentPerMonth)} par élève et par mois pour une école, à partir de ${PRICING.schoolMinStudents} élèves, facturé à l'école. Les tarifs en vigueur sont ceux affichés sur la page Tarifs, où chaque pays a son prix fixe dans sa monnaie.`,
            "Le paiement se fait pour l'instant par Mobile Money (Orange Money). Ton accès est activé par notre équipe après confirmation du paiement, pour la période payée. Il n'y a pas de renouvellement automatique : à la fin de la période, l'accès complet s'arrête tant qu'un nouveau paiement n'est pas fait.",
            "Si ton accès n'est pas activé après un paiement confirmé, contacte-nous : nous corrigeons la situation ou nous te remboursons.",
          ],
        },
        {
          title: 'Utiliser la plateforme correctement',
          bullets: [
            "Utilise les cours pour apprendre. Ne copie pas, ne revends pas et ne republie pas nos contenus sans notre accord écrit.",
            "N'essaie pas de contourner l'accès payant, de perturber le site, d'accéder aux données d'autres personnes ou d'exécuter du code destiné à nuire.",
            "Sois respectueux. Nous pouvons suspendre ou supprimer un compte qui ne respecte pas ces règles.",
            "L'entraide est ouverte aux personnes de 12 ans ou plus (pas aux comptes enfants supervisés). Écris du texte seulement : pas de liens, d'e-mails ni de numéros de téléphone. Les autres membres peuvent signaler un message ; nous pouvons le masquer ou le supprimer et empêcher son auteur d'écrire.",
          ],
        },
        {
          title: 'Ton code et nos contenus',
          paragraphs: [
            "Les cours, exercices et textes appartiennent à RythmeBinaireGn. Le code que tu écris dans les exercices est à toi.",
          ],
        },
        {
          title: 'Le tuteur IA',
          paragraphs: [
            "Le tuteur IA te guide avec des indices progressifs. Il peut se tromper : relis toujours ses indices avec ton esprit critique et vérifie avec les consignes de l'exercice. Il est limité dans le nombre d'indices par exercice et par jour. Pour un enfant, il n'est disponible que si l'adulte responsable l'a activé.",
          ],
        },
        {
          title: 'Disponibilité et responsabilité',
          paragraphs: [
            "Nous faisons de notre mieux pour que le site soit disponible, mais nous ne garantissons pas un service sans interruption, surtout en cas de connexion instable. Nous ne sommes pas responsables des pertes indirectes liées à l'utilisation du site.",
            "Nous pouvons modifier ces conditions, les tarifs ou les cours. Les changements importants sont annoncés sur le site.",
          ],
        },
        { title: 'Contact', paragraphs: [contactFr] },
      ],
    },
    en: {
      title: 'Terms of use',
      intro: `RythmeBinaireGn is a platform for learning technology at your own pace. By creating an account or using the site you accept these terms. Last updated: ${LEGAL_UPDATED.en}.`,
      sections: [
        {
          title: 'Who can create an account',
          bullets: [
            'Anyone aged 12 or older can create their own account.',
            'A child under 12 does not create an account alone: a responsible adult first creates their own account, then adds the child from the "Family" space. The adult remains responsible for the child\'s account.',
            'At sign-up you declare that you are 12 or older. If we find or suspect that a regular account belongs to a child under 12, we may block it and ask a responsible adult to create a supervised account.',
            'You provide accurate information and keep your password private. An account is personal: do not share it.',
          ],
        },
        {
          title: 'Free and paid access',
          paragraphs: [
            'Some lessons are freely accessible ("Discovery"). Full access to all courses may be paid, or granted free of charge by RythmeBinaireGn.',
            `Indicative prices: ${gnf(PRICING.individualPerMonth)} per month for an individual learner; ${gnf(PRICING.schoolPerStudentPerMonth)} per student per month for a school, from ${PRICING.schoolMinStudents} students, invoiced to the school. The prices in force are those shown on the Pricing page, where each country has a fixed price in its own currency.`,
            'Payment is currently made by Mobile Money (Orange Money). Our team activates your access after confirming the payment, for the paid period. There is no automatic renewal: at the end of the period, full access stops until a new payment is made.',
            'If your access is not activated after a confirmed payment, contact us: we will fix it or refund you.',
          ],
        },
        {
          title: 'Using the platform properly',
          bullets: [
            'Use the courses to learn. Do not copy, resell or republish our content without our written permission.',
            'Do not try to bypass paid access, disrupt the site, access other people\'s data or run code meant to cause harm.',
            'Be respectful. We may suspend or delete an account that breaks these rules.',
            'Community help is open to accounts of people aged 12 or older (not to supervised child accounts). Write text only: no links, e-mails or phone numbers. Other members can report a message, and we may hide or delete it and stop an author from writing.',
          ],
        },
        {
          title: 'Your code and our content',
          paragraphs: ['Courses, exercises and texts belong to RythmeBinaireGn. The code you write in exercises is yours.'],
        },
        {
          title: 'The AI tutor',
          paragraphs: [
            'The AI tutor guides you with progressive hints. It can be wrong: always read its hints critically and check them against the exercise instructions. The number of hints is limited per exercise and per day. For a child, it is only available if the responsible adult has turned it on.',
          ],
        },
        {
          title: 'Availability and liability',
          paragraphs: [
            'We do our best to keep the site available but do not guarantee uninterrupted service, especially with an unstable connection. We are not liable for indirect losses related to using the site.',
            'We may change these terms, the prices or the courses. Important changes are announced on the site.',
          ],
        },
        { title: 'Contact', paragraphs: [contactEn] },
      ],
    },
  },
  privacy: {
    fr: {
      title: 'Politique de confidentialité',
      intro: `Nous collectons le minimum de données nécessaires pour te faire apprendre. Nous ne vendons pas tes données et il n'y a pas de publicité. Dernière mise à jour : ${LEGAL_UPDATED.fr}.`,
      sections: [
        {
          title: 'Les données que nous gardons',
          bullets: [
            'Ton compte : adresse e-mail, nom (ou prénom), langue préférée, mot de passe (protégé par notre service d\'authentification, nous ne le voyons pas).',
            'Ton apprentissage : cours suivis, leçons terminées, code que tu soumets dans les exercices, résultats des tests et indices demandés.',
            'Pour un enfant de moins de 12 ans : seulement un prénom, un identifiant de connexion et un mot de passe choisis par l\'adulte. Nous ne demandons ni âge, ni e-mail, ni téléphone pour l\'enfant.',
            'Pour les paiements : nous notons qu\'un paiement a été reçu (montant, période, référence). Nous ne conservons aucun numéro de carte ; le paiement se fait via Mobile Money.',
          ],
        },
        {
          title: 'Pourquoi',
          paragraphs: ['Pour faire fonctionner ton compte, enregistrer ta progression, corriger tes exercices, activer ton accès payant et améliorer les cours.'],
        },
        {
          title: 'Avec qui nous les partageons',
          bullets: [
            'Nos prestataires techniques : Supabase (base de données et connexion) et Vercel (hébergement du site). Ils traitent les données uniquement pour faire fonctionner le service.',
            "Le tuteur IA : quand tu demandes un indice, ton code, la consigne de l'exercice et la dernière sortie de ton programme sont envoyés à un service d'intelligence artificielle (Anthropic) pour produire l'indice. Ton nom et ton e-mail ne sont pas envoyés.",
            'Pour un enfant, l\'adulte responsable peut voir sa progression, le suspendre ou supprimer son compte.',
            "Nous ne communiquons tes données à personne d'autre, sauf si la loi l'exige.",
          ],
        },
        {
          title: 'Stockage dans ton navigateur',
          paragraphs: ['Nous utilisons le stockage de ton navigateur uniquement pour ce qui est nécessaire : garder ta session ouverte, ta langue et ton thème (clair/sombre). Pas de pistage publicitaire.'],
        },
        {
          title: 'Combien de temps',
          paragraphs: ['Tant que ton compte existe. Si ton compte est supprimé (sur ta demande, ou par l\'adulte pour un enfant), ta progression et tes données associées sont supprimées.'],
        },
        {
          title: 'Tes droits',
          paragraphs: ["Tu peux demander à voir, corriger ou supprimer tes données à tout moment. Pour un enfant, c'est l'adulte responsable qui fait la demande. " + contactFr],
        },
        {
          title: 'Sécurité',
          paragraphs: ['Les connexions sont chiffrées, les accès aux données sont limités par des règles strictes (chaque élève ne voit que ses propres données) et seul l\'administrateur peut gérer les accès. Aucun système n\'est parfait : si tu penses qu\'un compte est compromis, préviens-nous tout de suite.'],
        },
      ],
    },
    en: {
      title: 'Privacy policy',
      intro: `We collect the minimum data needed for you to learn. We do not sell your data and there is no advertising. Last updated: ${LEGAL_UPDATED.en}.`,
      sections: [
        {
          title: 'The data we keep',
          bullets: [
            'Your account: email address, name (or first name), preferred language, password (protected by our authentication service; we cannot see it).',
            'Your learning: courses followed, completed lessons, code you submit in exercises, test results and hints requested.',
            'For a child under 12: only a first name, a login username and a password chosen by the adult. We do not ask for age, email or phone number for the child.',
            'For payments: we record that a payment was received (amount, period, reference). We keep no card numbers; payment is made through Mobile Money.',
          ],
        },
        {
          title: 'Why',
          paragraphs: ['To run your account, save your progress, check your exercises, activate your paid access and improve the courses.'],
        },
        {
          title: 'Who we share it with',
          bullets: [
            'Our technical providers: Supabase (database and sign-in) and Vercel (site hosting). They process data only to run the service.',
            'The AI tutor: when you ask for a hint, your code, the exercise instructions and the last output of your program are sent to an artificial intelligence service (Anthropic) to produce the hint. Your name and email are not sent.',
            'For a child, the responsible adult can see their progress, suspend them or delete their account.',
            'We share your data with no one else, unless the law requires it.',
          ],
        },
        {
          title: 'Storage in your browser',
          paragraphs: ['We use your browser storage only for what is necessary: keeping you signed in, your language and your theme (light/dark). No advertising tracking.'],
        },
        {
          title: 'How long',
          paragraphs: ['As long as your account exists. If your account is deleted (at your request, or by the adult for a child), your progress and related data are deleted.'],
        },
        {
          title: 'Your rights',
          paragraphs: ['You may ask to see, correct or delete your data at any time. For a child, the responsible adult makes the request. ' + contactEn],
        },
        {
          title: 'Security',
          paragraphs: ['Connections are encrypted, access to data is limited by strict rules (each student only sees their own data) and only the administrator can manage access. No system is perfect: if you think an account is compromised, tell us right away.'],
        },
      ],
    },
  },
};

export function getLegalDoc(kind: Kind, lang: Lang): LegalDoc {
  return DOCS[kind][lang];
}
