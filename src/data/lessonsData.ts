import { PreferredLanguage } from '../types/database';

export interface DetailedLesson {
  id: string;
  moduleId: string;
  courseId: string;
  position: number;
  translations: {
    fr: {
      title: string;
      content: string;
    };
    en?: {
      title: string;
      content: string;
    };
  };
  exercise?: {
    id: string;
    type: string;
    language: string;
    starter_code: string;
    instructions: {
      fr: string;
      en?: string;
    };
    hint_level_1?: {
      fr?: string;
      en?: string;
    };
    hint_level_2?: {
      fr?: string;
      en?: string;
    };
  };
}

export interface DetailedModule {
  id: string;
  courseId: string;
  position: number;
  translations: {
    fr: { title: string };
    en?: { title: string };
  };
  lessons: DetailedLesson[];
}

export const DETAILED_COURSE_MODULES: Record<string, DetailedModule[]> = {
  'course-python-02': [
    {
      id: 'mod-py-1',
      courseId: 'course-python-02',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Variables, Types et Entrées/Sorties' },
        en: { title: 'Module 1: Variables, Types, and I/O' },
      },
      lessons: [
        {
          id: 'les-py-101',
          moduleId: 'mod-py-1',
          courseId: 'course-python-02',
          position: 1,
          translations: {
            fr: {
              title: 'Introduction à Python et premier affichage avec print()',
              content: `### Bienvenue dans le monde de Python !

Python est l'un des langages de programmation les plus populaires, réputé pour sa **syntaxe épurée**, proche de l'anglais naturel, et son immense communauté à travers le monde et en Afrique.

---

#### 1. Pourquoi apprendre Python ?
- **Polyvalence absolue** : Développement web (Django, FastAPI), intelligence artificielle (PyTorch, TensorFlow), automatisation de tâches et analyse de données.
- **Lisibilité optimale** : Pas d'accolades obligatoires pour les blocs de code, l'indentation (les espaces) structure le programme de façon claire.
- **Idéal pour débuter** : Vous pouvez vous concentrer sur la logique algorithmique sans vous perdre dans la complexité de bas niveau.

---

#### 2. La fonction essentielle : \`print()\`

Pour afficher un message à l'écran dans la console d'exécution, on utilise l'instruction intégrée \`print()\`.

\`\`\`python
# Affichage d'un texte simple (chaîne de caractères / String)
print("Bonjour Conakry et le monde de la tech !")

# Affichage de calculs arithmétiques
print(2026 + 10)

# Affichage multiple avec séparateur automatique
print("Année de lancement :", 2026, "| Plateforme : RythmeBinaireGn")
\`\`\`

---

#### 3. Règle clé : Les guillemets pour le texte

En Python, toute chaîne de caractères (**String**) doit obligatoirement être entourée de guillemets doubles \`"..."\` ou simples \`'...' \`. Les nombres, eux, s'écrivent sans guillemets.

- \`print("42")\` affiche le texte *42*.
- \`print(42)\` manipule le nombre entier *42*.
- \`print(40 + 2)\` calcule d'abord l'addition et affiche *42*.

Dans la leçon suivante, nous verrons comment conserver ces valeurs en mémoire grâce aux **variables**.`,
            },
            en: {
              title: 'Introduction to Python and First Output with print()',
              content: `### Welcome to the World of Python!

Python is one of the most widely used programming languages, celebrated for its **clean syntax**, natural readability, and vibrant global community.

---

#### 1. Why learn Python?
- **Versatility**: Web development, artificial intelligence, scripting, and data analysis.
- **High Readability**: Uses indentation instead of curly brackets.
- **Great for beginners**: Allows you to focus on algorithmic thinking.

---

#### 2. The Core Function: \`print()\`

To display messages on the console screen, Python provides the built-in \`print()\` function:

\`\`\`python
# Displaying simple text
print("Hello Conakry and the tech world!")

# Math evaluation
print(2026 + 10)
\`\`\`

In the next lesson, we will learn how to store values in memory using **variables**!`,
            },
          },
          exercise: {
            id: 'ex-py-101',
            type: 'code_completion',
            language: 'python',
            starter_code: '# Écris une instruction print() affichant "Hello RythmeBinaireGn"\n',
            instructions: {
              fr: 'Utilise la fonction print() pour afficher exactement la chaîne "Hello RythmeBinaireGn".',
              en: 'Use the print() function to output the exact string "Hello RythmeBinaireGn".',
            },
          },
        },
        {
          id: 'les-py-102',
          moduleId: 'mod-py-1',
          courseId: 'course-python-02',
          position: 2,
          translations: {
            fr: {
              title: 'Déclarer des variables et manipuler les types de base',
              content: `### Les Variables en Python

Une variable est comme une boîte étiquetée dans la mémoire de l'ordinateur où vous stockez une information pour pouvoir la réutiliser plus tard.

---

#### 1. Déclaration simple et typage dynamique
En Python, vous n'avez pas besoin d'indiquer le type de la variable à l'avance. Le langage le déduit automatiquement :

\`\`\`python
# Une chaîne de caractères (str)
nom_apprenant = "Amina Diallo"

# Un entier (int)
age = 22

# Un nombre à virgule (float)
note_moyenne = 18.5

# Un booléen (bool: True ou False)
est_inscrit = True
\`\`\`

---

#### 2. Bonnes pratiques de nommage (PEP 8)
- Utilisez des lettres minuscules avec des tirets bas : \`snake_case\` (ex: \`taux_reussite\`, \`ville_residence\`).
- Donnez des noms descriptifs : préférez \`duree_cours_heures\` à une lettre seule comme \`d\`.
- Python est sensible à la casse : \`score\` et \`Score\` sont deux variables totalement distinctes.

---

#### 3. Concaténation et f-strings modernes
Pour combiner du texte et des variables de manière élégante, utilisez les **f-strings** (introduites avec Python 3.6+) :

\`\`\`python
prenom = "Mamadou"
parcours = "Coder en Python"
progression = 45

# Utilisation d'une f-string avec f"..." et {variable}
message = f"Félicitations {prenom}, votre progression sur {parcours} est de {progression}% !"
print(message)
\`\`\``,
            },
            en: {
              title: 'Declaring Variables and Basic Data Types',
              content: `### Variables in Python

A variable is a named storage location in your computer's memory holding data you can reuse and manipulate.

---

#### 1. Declaration and Dynamic Typing
Python automatically detects the variable type:

\`\`\`python
student_name = "Amina Diallo"  # String (str)
age = 22                       # Integer (int)
score = 18.5                   # Float (float)
is_enrolled = True             # Boolean (bool)
\`\`\`

---

#### 2. Modern f-strings
Combine text and variables cleanly using formatted strings:

\`\`\`python
student = "Mamadou"
points = 85
print(f"Great job {student}, you reached {points} points!")
\`\`\``,
            },
          },
          exercise: {
            id: 'ex-py-102',
            type: 'code_completion',
            language: 'python',
            starter_code: 'ville = "Conakry"\npays = "Guinée"\n# Crée la variable message utilisant une f-string\n',
            instructions: {
              fr: 'Définis une variable message valant f"Bienvenue à {ville}, en {pays} !" puis affiche-la.',
              en: 'Define a variable message equal to f"Welcome to {ville}, {pays}!" then print it.',
            },
          },
        },
        {
          id: 'les-py-103',
          moduleId: 'mod-py-1',
          courseId: 'course-python-02',
          position: 3,
          translations: {
            fr: {
              title: 'Opérations arithmétiques et opérateurs en Python',
              content: `### Le Calcul Arithmétique avec Python

Python fait office de puissante calculatrice scientifique.

---

#### 1. Les opérateurs fondamentaux
| Opérateur | Signification | Exemple | Résultat |
| :--- | :--- | :--- | :--- |
| \`+\` | Addition | \`10 + 5\` | \`15\` |
| \`-\` | Soustraction | \`20 - 8\` | \`12\` |
| \`*\` | Multiplication | \`6 * 7\` | \`42\` |
| \`/\` | Division réelle | \`15 / 2\` | \`7.5\` |
| \`//\` | Division entière | \`15 // 2\` | \`7\` |
| \`%\` | Modulo (reste de division) | \`15 % 2\` | \`1\` |
| \`**\` | Puissance | \`2 ** 3\` | \`8\` |

---

#### 2. Exemple de calcul concret
Calculons le coût d'une connexion internet en francs guinéens (GNF) :

\`\`\`python
prix_forfait_mensuel = 150000  # GNF
nombre_mois = 3
reduction_etudiant = 0.15      # 15% de réduction

total_brut = prix_forfait_mensuel * nombre_mois
montant_reduction = total_brut * reduction_etudiant
total_net = total_brut - montant_reduction

print(f"Total à payer après réduction : {int(total_net)} GNF")
\`\`\``,
            },
          },
        },
      ],
    },
    {
      id: 'mod-py-2',
      courseId: 'course-python-02',
      position: 2,
      translations: {
        fr: { title: 'Module 2 : Conditions (if, elif, else) et Logique' },
        en: { title: 'Module 2: Conditionals (if, elif, else) and Logic' },
      },
      lessons: [
        {
          id: 'les-py-201',
          moduleId: 'mod-py-2',
          courseId: 'course-python-02',
          position: 1,
          translations: {
            fr: {
              title: 'Prendre des décisions avec if, elif et else',
              content: `### Les Structures Conditionnelles

Dans tout programme informatique, l'ordinateur doit être capable de prendre des décisions selon la situation :
- *Si* la note est supérieure ou égale à 10, l'élève est admis.
- *Sinon*, il passe le rattrapage.

---

#### 1. Syntaxe de base

\`\`\`python
note = 14

if note >= 10:
    print("Félicitations, vous avez validé le module !")
else:
    print("Courage, révisez la leçon et réessayez !")
\`\`\`

> **Attention à l'indentation !** Les instructions à l'intérieur du bloc \`if\` doivent être décalées de 4 espaces vers la droite.

---

#### 2. Conditions multiples avec \`elif\`

\`\`\`python
score = 85

if score >= 90:
    mention = "Excellente"
elif score >= 75:
    mention = "Très Bien"
elif score >= 50:
    mention = "Bien"
else:
    mention = "À perfectionner"

print(f"Mention obtenue : {mention}")
\`\`\``,
            },
            en: {
              title: 'Making Decisions with if, elif, and else',
              content: `### Conditional Statements

Programs need to make decisions based on runtime conditions:

\`\`\`python
score = 85

if score >= 90:
    print("Grade: A")
elif score >= 75:
    print("Grade: B")
else:
    print("Grade: C")
\`\`\`

Remember to indent blocks by 4 spaces!`,
            },
          },
          exercise: {
            id: 'ex-py-201',
            type: 'code_completion',
            language: 'python',
            starter_code: 'age = 18\n# Écris la condition if/else vérifiant si age >= 18\n',
            instructions: {
              fr: 'Affiche "Majeur" si l\'âge est >= 18, sinon affiche "Mineur".',
              en: 'Print "Adult" if age >= 18, otherwise print "Minor".',
            },
          },
        },
        {
          id: 'les-py-202',
          moduleId: 'mod-py-2',
          courseId: 'course-python-02',
          position: 2,
          translations: {
            fr: {
              title: 'Opérateurs logiques : and, or, not',
              content: `### Combiner plusieurs conditions

Pour exprimer des règles complexes, Python propose les opérateurs logiques en toutes lettres : \`and\`, \`or\`, \`not\`.

\`\`\`python
age = 20
a_carte_etudiant = True

# Opérateur AND : les deux conditions doivent être vraies
if age < 25 and a_carte_etudiant:
    print("Tarif étudiant accordé : 50% de réduction !")

# Opérateur OR : au moins l'une des conditions est vraie
est_weekend = False
est_jour_ferie = True
if est_weekend or est_jour_ferie:
    print("Journée de repos, consacrée aux projets de code perso !")
\`\`\``,
            },
          },
        },
      ],
    },
  ],

  'course-scratch-01': [
    {
      id: 'mod-sc-1',
      courseId: 'course-scratch-01',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Découverte de l’interface et des lutins' },
        en: { title: 'Module 1: Interface, Sprites and Stage' },
      },
      lessons: [
        {
          id: 'les-sc-101',
          moduleId: 'mod-sc-1',
          courseId: 'course-scratch-01',
          position: 1,
          translations: {
            fr: {
              title: 'Prise en main de la scène Scratch et du premier lutin',
              content: `### Bienvenue dans Scratch !

Scratch est un environnement d'apprentissage créé par le MIT pour apprendre à coder visuellement, sans fautes de syntaxe.

#### Les 3 zones clés de l'écran :
1. **La scène (à droite)** : L'espace où vos personnages (lutins) s'animent et où votre jeu se déroule.
2. **La palette des blocs (à gauche)** : Les instructions classées par couleurs (Mouvement en bleu, Apparence en violet, Sons en rose, Événements en jaune).
3. **La zone de script (au centre)** : L'espace où vous assemblez vos blocs comme des pièces de puzzle.`,
            },
            en: {
              title: 'Getting started with Scratch stage and first sprite',
              content: `### Welcome to Scratch!

Scratch was developed by MIT to teach computational concepts through intuitive visual blocks.

#### 3 key areas:
1. **The Stage**: Where sprites move and animations run.
2. **Block Palette**: Color-coded instruction blocks.
3. **Script Area**: Where you snap blocks together like LEGO.`,
            },
          },
        },
        {
          id: 'les-sc-102',
          moduleId: 'mod-sc-1',
          courseId: 'course-scratch-01',
          position: 2,
          translations: {
            fr: {
              title: 'Faire bouger et parler un personnage',
              content: `### Animer un lutin avec des blocs

Pour faire bouger un lutin lorsque l'utilisateur clique sur le drapeau vert :
1. Prenez le bloc \`quand [drapeau vert] est cliqué\` (catégorie Événements).
2. Emboîtez en dessous \`avancer de 50 pas\` (catégorie Mouvement).
3. Ajoutez \`dire "Bonjour RythmeBinaireGn !" pendant 2 secondes\` (catégorie Apparence).`,
            },
          },
        },
      ],
    },
  ],

  'course-web-03': [
    {
      id: 'mod-web-1',
      courseId: 'course-web-03',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Structure Sémantique HTML5' },
        en: { title: 'Module 1: Semantic HTML5 Structure' },
      },
      lessons: [
        {
          id: 'les-web-101',
          moduleId: 'mod-web-1',
          courseId: 'course-web-03',
          position: 1,
          translations: {
            fr: {
              title: 'Anatomie d’un document HTML5 moderne',
              content: `### Structure d'une page Web

Tout site web s'appuie sur le langage **HTML** (*HyperText Markup Language*).

\`\`\`html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ma Première Page Web</title>
</head>
<body>
  <header>
    <h1>RythmeBinaireGn</h1>
    <p>La tech au rythme de l'Afrique</p>
  </header>
  <main>
    <article>
      <h2>Bienvenue aux futurs développeurs</h2>
      <p>Apprenez à concevoir des applications web réactives.</p>
    </article>
  </main>
</body>
</html>
\`\`\`

#### Les balises sémantiques indispensables :
- \`<header>\` : En-tête de site ou d'article.
- \`<nav>\` : Menu de navigation principal.
- \`<main>\` : Cœur du contenu de la page.
- \`<footer>\` : Pied de page (droits d'auteur, mentions).`,
            },
            en: {
              title: 'Anatomy of a Modern HTML5 Document',
              content: `### Structure of a Web Page

Every website relies on **HTML** (*HyperText Markup Language*).

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My First Web Page</title>
</head>
<body>
  <h1>Welcome to RythmeBinaireGn</h1>
  <p>Learn web development step by step.</p>
</body>
</html>
\`\`\``,
            },
          },
          exercise: {
            id: 'ex-web-101',
            type: 'code_completion',
            language: 'html',
            starter_code: '<!-- Ajoute une balise <h1> avec le texte "Hello World" -->\n',
            instructions: {
              fr: 'Crée un titre de niveau 1 contenant exactement "Hello World".',
              en: 'Create an h1 heading containing exactly "Hello World".',
            },
          },
        },
      ],
    },
  ],

  'course-bureau-04': [
    {
      id: 'mod-bur-1',
      courseId: 'course-bureau-04',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Traitement de texte professionnel et mise en page' },
        en: { title: 'Module 1: Professional Word Processing' },
      },
      lessons: [
        {
          id: 'les-bur-101',
          moduleId: 'mod-bur-1',
          courseId: 'course-bureau-04',
          position: 1,
          translations: {
            fr: {
              title: 'Rédiger et structurer un document bureautique professionnel',
              content: `### Structurer un document d'entreprise

Que ce soit sur **Google Docs**, **Microsoft Word** ou **LibreOffice**, la maîtrise des styles typographiques garantit des documents soignés et lisibles.

#### Les règles d'or :
- **Utilisez toujours les Titres 1, Titres 2 et Titres 3** au lieu d'augmenter manuellement la taille de la police. Cela permet de générer la table des matières en un clic.
- **Interlignage** : Un interligne de 1,15 à 1,5 avec un espacement après les paragraphes évite de devoir sauter des lignes avec la touche Entrée.
- **Police lisible** : Privilégiez des polices modernes et neutres comme Calibri, Arial ou Inter.`,
            },
          },
        },
      ],
    },
  ],

  'course-securite-05': [
    {
      id: 'mod-sec-1',
      courseId: 'course-securite-05',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Hygiène numérique et protection des comptes' },
        en: { title: 'Module 1: Digital Hygiene and Account Protection' },
      },
      lessons: [
        {
          id: 'les-sec-101',
          moduleId: 'mod-sec-1',
          courseId: 'course-securite-05',
          position: 1,
          translations: {
            fr: {
              title: 'Mots de passe robustes et authentification à deux facteurs (2FA)',
              content: `### Protéger vos accès numériques

80% des piratages de comptes proviennent de mots de passe trop simples ou réutilisés sur plusieurs sites.

#### 1. Qu'est-ce qu'une phrase de passe robuste ?
Au lieu d'un mot court complexe (ex: \`P@ss1\`), préférez une **phrase de passe** d'au moins 16 caractères :
> Exemple : \`Mangue-Fouta-Djoliba-2026!\`

#### 2. L'authentification à deux facteurs (2FA)
Même si un pirate découvre votre mot de passe, l'activation du 2FA (via une application comme Google Authenticator ou une notification sur votre smartphone) bloque toute tentative d'accès frauduleuse.`,
            },
          },
        },
      ],
    },
  ],

  'course-ia-06': [
    {
      id: 'mod-ia-1',
      courseId: 'course-ia-06',
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Les bases de l’Intelligence Artificielle générative' },
        en: { title: 'Module 1: Fundamentals of Generative AI' },
      },
      lessons: [
        {
          id: 'les-ia-101',
          moduleId: 'mod-ia-1',
          courseId: 'course-ia-06',
          position: 1,
          translations: {
            fr: {
              title: 'Comprendre les modèles de langage (LLM) et le Prompt Engineering',
              content: `### Qu'est-ce qu'un Grand Modèle de Langage (LLM) ?

Les modèles d'IA comme Gemini ou GPT ont été entraînés sur d'immenses corpus de textes pour prédire la suite logique des mots en fonction du contexte fourni.

#### Les 4 piliers d'un prompt efficace :
1. **Rôle** : "Agis en tant que développeur senior Python et tuteur pédagogique..."
2. **Tâche** : "Explique-moi la différence entre une liste et un dictionnaire..."
3. **Contexte** : "Je suis un élève débutant vivant en Guinée..."
4. **Format de sortie attendu** : "Donne-moi 2 exemples concrets avec du code commenté et un tableau récapitulatif."`,
            },
          },
        },
      ],
    },
  ],
};

// Helper: retrieve all lessons of a course in sequential order
export function getCourseLessonsList(courseId: string): DetailedLesson[] {
  const modules = DETAILED_COURSE_MODULES[courseId] || [];
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);
  const lessons: DetailedLesson[] = [];
  for (const m of sortedModules) {
    const sortedLessons = [...m.lessons].sort((a, b) => a.position - b.position);
    lessons.push(...sortedLessons);
  }
  return lessons;
}
