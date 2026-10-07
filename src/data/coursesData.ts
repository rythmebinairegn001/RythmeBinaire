import { CourseTrack, CourseStatus, PreferredLanguage } from '../types/database';

export interface PublicCourseItem {
  id: string;
  track: CourseTrack;
  level: string; // 'debutant' | 'intermediaire' | 'avance'
  status: CourseStatus;
  created_at: string;
  estimated_hours: number;
  // Translations
  translations: {
    [key in PreferredLanguage]: {
      title: string;
      summary: string;
      description: string;
    };
  };
  // Modules
  modules: Array<{
    id: string;
    position: number;
    translations: {
      [key in PreferredLanguage]: {
        title: string;
      };
    };
    lessonCount: number;
  }>;
}

export const INITIAL_COURSES: PublicCourseItem[] = [
  // TRACK: CODER
  {
    id: 'course-scratch-01',
    track: 'coder',
    level: 'debutant',
    status: 'published',
    created_at: '2026-01-15T10:00:00Z',
    estimated_hours: 8,
    translations: {
      fr: {
        title: 'Scratch : Premiers pas dans la pensée algorithmique',
        summary: 'Créez vos premières animations et mini-jeux interactifs grâce à la programmation visuelle par blocs.',
        description: 'Ce cours d’initiation est conçu pour faire découvrir les logiques fondamentales du code sans la barrière de la syntaxe textuelle. Vous apprendrez à manipuler des séquences d’instructions, des répétitions, des conditions et des coordonnées géométriques pour donner vie à vos personnages.',
      },
      en: {
        title: 'Scratch: First Steps in Computational Thinking',
        summary: 'Create your first animations and interactive mini-games through visual block-based programming.',
        description: 'This beginner course introduces the fundamental logic of coding without syntax hurdles. You will learn to manipulate sequences of instructions, loops, conditions, and coordinates to animate characters.',
      },
    },
    modules: [
      {
        id: 'mod-sc-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Découverte de l’interface, des lutins et de la scène' },
          en: { title: 'Exploring the interface, sprites, and stage' },
        },
      },
      {
        id: 'mod-sc-2',
        position: 2,
        lessonCount: 5,
        translations: {
          fr: { title: 'Événements, mouvements et interactions clavier' },
          en: { title: 'Events, motions, and keyboard interactions' },
        },
      },
      {
        id: 'mod-sc-3',
        position: 3,
        lessonCount: 4,
        translations: {
          fr: { title: 'Les boucles (répéter) et les conditions (si... alors)' },
          en: { title: 'Loops (repeat) and conditions (if... then)' },
        },
      },
      {
        id: 'mod-sc-4',
        position: 4,
        lessonCount: 5,
        translations: {
          fr: { title: 'Projet final : Concevoir un mini-jeu d’arcade' },
          en: { title: 'Final Project: Building an arcade mini-game' },
        },
      },
    ],
  },
  {
    id: 'course-python-02',
    track: 'coder',
    level: 'debutant',
    status: 'published',
    created_at: '2026-02-01T10:00:00Z',
    estimated_hours: 14,
    translations: {
      fr: {
        title: 'Python Fondamentaux : De zéro à votre premier script',
        summary: 'Maîtrisez le langage le plus polyvalent au monde pour automatiser des tâches et résoudre des problèmes concrets.',
        description: 'Python est réputé pour sa syntaxe claire et élégante. À travers des exercices pratiques guidés par notre tuteur IA, vous apprendrez à déclarer des variables, structurer vos flux d’exécution, définir des fonctions réutilisables et manipuler des listes et dictionnaires.',
      },
      en: {
        title: 'Python Fundamentals: Zero to Your First Script',
        summary: 'Master the world’s most versatile programming language to automate tasks and solve real-world problems.',
        description: 'Python is renowned for its clean syntax. Through hands-on exercises guided by our AI tutor, you will learn variables, control flows, functions, lists, and dictionaries.',
      },
    },
    modules: [
      {
        id: 'mod-py-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Variables, types de données et opérations arithmétiques' },
          en: { title: 'Variables, data types, and arithmetic operations' },
        },
      },
      {
        id: 'mod-py-2',
        position: 2,
        lessonCount: 6,
        translations: {
          fr: { title: 'Structures conditionnelles (if, elif, else) et logique booléenne' },
          en: { title: 'Conditional structures (if, elif, else) and boolean logic' },
        },
      },
      {
        id: 'mod-py-3',
        position: 3,
        lessonCount: 5,
        translations: {
          fr: { title: 'Boucles for, boucles while et itérations sur listes' },
          en: { title: 'For and while loops, iterations over lists' },
        },
      },
      {
        id: 'mod-py-4',
        position: 4,
        lessonCount: 5,
        translations: {
          fr: { title: 'Définition de fonctions, paramètres et gestion d’erreurs' },
          en: { title: 'Function definitions, arguments, and error handling' },
        },
      },
    ],
  },
  {
    id: 'course-web-03',
    track: 'coder',
    level: 'debutant',
    status: 'published',
    created_at: '2026-02-10T10:00:00Z',
    estimated_hours: 12,
    translations: {
      fr: {
        title: 'Développement Web : HTML5 & CSS3 Moderne',
        summary: 'Construisez des sites web élégants, sémantiques et parfaitement adaptés aux écrans mobiles.',
        description: 'Découvrez les deux piliers indispensables du Web. Vous découvrirez comment structurer le contenu avec les balises HTML sémantiques, puis comment transformer l’apparence visuelle grâce à CSS, Flexbox et les media queries pour un rendu responsive impeccable.',
      },
      en: {
        title: 'Web Development: Modern HTML5 & CSS3',
        summary: 'Build clean, semantic web pages crafted for modern mobile and desktop screens.',
        description: 'Learn the two foundational pillars of the Web: structuring content with semantic HTML tags and styling it with modern CSS, Flexbox, and responsive design techniques.',
      },
    },
    modules: [
      {
        id: 'mod-web-1',
        position: 1,
        lessonCount: 5,
        translations: {
          fr: { title: 'Sémantique HTML, texte, liens, images et formulaires' },
          en: { title: 'HTML semantics, text, links, media, and forms' },
        },
      },
      {
        id: 'mod-web-2',
        position: 2,
        lessonCount: 5,
        translations: {
          fr: { title: 'Sélecteurs CSS, modèle de boîte (box model) et typographie' },
          en: { title: 'CSS selectors, box model, colors, and typography' },
        },
      },
      {
        id: 'mod-web-3',
        position: 3,
        lessonCount: 4,
        translations: {
          fr: { title: 'Mise en page moderne avec Flexbox et Grid' },
          en: { title: 'Modern layout with Flexbox and CSS Grid' },
        },
      },
      {
        id: 'mod-web-4',
        position: 4,
        lessonCount: 4,
        translations: {
          fr: { title: 'Design responsive et publication de votre premier site' },
          en: { title: 'Responsive design and publishing your first website' },
        },
      },
    ],
  },
  {
    id: 'course-js-04',
    track: 'coder',
    level: 'intermediaire',
    status: 'published',
    created_at: '2026-02-20T10:00:00Z',
    estimated_hours: 16,
    translations: {
      fr: {
        title: 'JavaScript : Rendre les pages web interactives et dynamiques',
        summary: 'Animez vos pages, gérez les événements utilisateur et communiquez avec des serveurs en direct.',
        description: 'Donnez vie à vos interfaces statiques avec JavaScript. Vous apprendrez à manipuler le DOM, réagir aux clics et formulaires, gérer le stockage local et appeler des API externes pour concevoir de véritables applications web interactives.',
      },
      en: {
        title: 'JavaScript: Dynamic & Interactive Web Applications',
        summary: 'Bring your pages to life, handle user events, and connect to remote APIs.',
        description: 'Transform static HTML into interactive experiences. Learn DOM manipulation, event handling, asynchronous JavaScript, and REST APIs.',
      },
    },
    modules: [
      {
        id: 'mod-js-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Sélection et manipulation des éléments du DOM' },
          en: { title: 'DOM elements selection and manipulation' },
        },
      },
      {
        id: 'mod-js-2',
        position: 2,
        lessonCount: 5,
        translations: {
          fr: { title: 'Événements utilisateurs, formulaires et validation' },
          en: { title: 'User events, interactive forms, and validation' },
        },
      },
      {
        id: 'mod-js-3',
        position: 3,
        lessonCount: 5,
        translations: {
          fr: { title: 'Données JSON, requêtes Fetch et API asynchrones' },
          en: { title: 'JSON data, Fetch requests, and async/await' },
        },
      },
      {
        id: 'mod-js-4',
        position: 4,
        lessonCount: 4,
        translations: {
          fr: { title: 'Projet complet : Application de gestion de tâches dynamique' },
          en: { title: 'Full Project: Interactive task management app' },
        },
      },
    ],
  },

  // TRACK: CULTURE NUMÉRIQUE
  {
    id: 'course-office-05',
    track: 'culture_numerique',
    level: 'debutant',
    status: 'published',
    created_at: '2026-01-20T10:00:00Z',
    estimated_hours: 10,
    translations: {
      fr: {
        title: 'Bureautique Essentielle : Traitement de texte & Tableur',
        summary: 'Rédigez des documents professionnels percutants et dominez les calculs fondamentaux sur tableur.',
        description: 'La maîtrise des outils bureautiques est le socle de toute insertion professionnelle moderne. Apprenez à concevoir des CV, rapports officiels, devis et tableaux de calcul avec formules automatiques et graphiques clairs.',
      },
      en: {
        title: 'Essential Office Suite: Word Processing & Spreadsheets',
        summary: 'Draft polished documents and master fundamental calculations on spreadsheets.',
        description: 'Office productivity tools are essential in today’s workspace. Learn how to format professional reports, manage budgets, and analyze data with formulas.',
      },
    },
    modules: [
      {
        id: 'mod-off-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Mise en page, styles et structuration d’un document formel' },
          en: { title: 'Formatting, styles, and structuring formal documents' },
        },
      },
      {
        id: 'mod-off-2',
        position: 2,
        lessonCount: 5,
        translations: {
          fr: { title: 'Feuilles de calcul, formules de base (SOMME, MOYENNE, SI)' },
          en: { title: 'Spreadsheet basics and key formulas (SUM, AVERAGE, IF)' },
        },
      },
      {
        id: 'mod-off-3',
        position: 3,
        lessonCount: 4,
        translations: {
          fr: { title: 'Visualisation de données : création de graphiques lisibles' },
          en: { title: 'Data visualization: creating clear charts and graphs' },
        },
      },
      {
        id: 'mod-off-4',
        position: 4,
        lessonCount: 3,
        translations: {
          fr: { title: 'Organisation des fichiers, sauvegarde et travail collaboratif dans le cloud' },
          en: { title: 'File management, backup, and cloud collaboration' },
        },
      },
    ],
  },
  {
    id: 'course-security-06',
    track: 'culture_numerique',
    level: 'debutant',
    status: 'published',
    created_at: '2026-02-05T10:00:00Z',
    estimated_hours: 8,
    translations: {
      fr: {
        title: 'Sécurité et Hygiène Numérique sur Internet',
        summary: 'Protégez vos comptes, vos données personnelles et déjouez les arnaques et le phishing.',
        description: 'Internet offre d’immenses opportunités mais comporte aussi des risques quotidiens. Ce module vous donne les réflexes concrets pour naviguer en toute sécurité, sécuriser vos smartphones, reconnaître les tentatives d’escroquerie et préserver votre vie privée en ligne.',
      },
      en: {
        title: 'Internet Security & Digital Hygiene',
        summary: 'Safeguard your accounts, personal data, and identify scams and phishing attempts.',
        description: 'Navigate the web safely with practical security hygiene: managing robust passwords, multi-factor authentication, privacy protection, and detecting online fraud.',
      },
    },
    modules: [
      {
        id: 'mod-sec-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Gestionnaires de mots de passe et double authentification (2FA)' },
          en: { title: 'Password managers and two-factor authentication (2FA)' },
        },
      },
      {
        id: 'mod-sec-2',
        position: 2,
        lessonCount: 4,
        translations: {
          fr: { title: 'Repérer le phishing, les faux messages et les liens suspects' },
          en: { title: 'Recognizing phishing, scam messages, and suspicious links' },
        },
      },
      {
        id: 'mod-sec-3',
        position: 3,
        lessonCount: 3,
        translations: {
          fr: { title: 'Sécuriser son smartphone, ses réseaux Wi-Fi et ses données' },
          en: { title: 'Securing mobile devices, Wi-Fi connections, and backups' },
        },
      },
      {
        id: 'mod-sec-4',
        position: 4,
        lessonCount: 4,
        translations: {
          fr: { title: 'Vie privée, traces numériques et réputation en ligne' },
          en: { title: 'Privacy, digital footprints, and online reputation' },
        },
      },
    ],
  },
  {
    id: 'course-ai-07',
    track: 'culture_numerique',
    level: 'intermediaire',
    status: 'published',
    created_at: '2026-02-18T10:00:00Z',
    estimated_hours: 10,
    translations: {
      fr: {
        title: 'Comprendre et Utiliser l’Intelligence Artificielle',
        summary: 'Démystifiez le fonctionnement de l’IA générative et apprenez à formuler des requêtes efficaces au quotidien.',
        description: 'L’intelligence artificielle transforme tous les secteurs d’activité. Découvrez comment fonctionnent les modèles de langage modernes, comment structurer des prompts efficaces pour le travail et les études, tout en gardant un esprit critique face aux hallucinations et aux enjeux éthiques.',
      },
      en: {
        title: 'Understanding & Leveraging Artificial Intelligence',
        summary: 'Demystify generative AI and master effective prompting for work and study.',
        description: 'Explore generative AI fundamentals, effective prompt engineering techniques, ethical considerations, and critical thinking when evaluating AI-generated outputs.',
      },
    },
    modules: [
      {
        id: 'mod-ai-1',
        position: 1,
        lessonCount: 4,
        translations: {
          fr: { title: 'Qu’est-ce que l’IA ? Des algorithmes aux modèles génératifs' },
          en: { title: 'What is AI? From algorithms to generative models' },
        },
      },
      {
        id: 'mod-ai-2',
        position: 2,
        lessonCount: 5,
        translations: {
          fr: { title: 'L’art du prompt : donner des instructions claires et contextualisées' },
          en: { title: 'Prompt engineering: crafting clear, contextual instructions' },
        },
      },
      {
        id: 'mod-ai-3',
        position: 3,
        lessonCount: 4,
        translations: {
          fr: { title: 'Applications pratiques : rédaction, synthèse, recherche et aide au code' },
          en: { title: 'Practical applications: writing, summarization, research, and coding' },
        },
      },
      {
        id: 'mod-ai-4',
        position: 4,
        lessonCount: 4,
        translations: {
          fr: { title: 'Éthique, biais, protection des données et esprit critique' },
          en: { title: 'Ethics, biases, data privacy, and critical thinking' },
        },
      },
    ],
  },
];
