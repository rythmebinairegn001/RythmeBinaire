import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { UserProfile, PreferredLanguage, CourseTrack } from './types/database';
import { PublicCourseItem, INITIAL_COURSES } from './data/coursesData';
import { fetchPublishedCourses } from './services/courseService';
import { ThemeMode, getInitialTheme, applyTheme } from './lib/theme';

// Layout & Public Components
import { PublicHeader } from './components/public/PublicHeader';
import { HomePage } from './components/public/HomePage';
import { CourseCatalogPage } from './components/public/CourseCatalogPage';
import { CourseDetailModal } from './components/public/CourseDetailModal';

// Auth Components
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { AuthWaitingScreen } from './components/auth/AuthWaitingScreen';

// Student Space Components




import { StudentAccessDenied } from './components/student/StudentAccessDenied';
import { LockedLesson } from './components/student/LockedLesson';




import { loadMyChildLink } from './services/familyService';

import { loadIsTeacher } from './services/teacherService';

import {
  AccessGrant,
  AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
  isLessonLocked,
  loadMyAccess,
} from './services/accessService';

// Admin Space Components

import {
  getStudentCoursesProgress,
  enrollStudentInCourse,
  markLessonCompleted,
  StudentCourseProgress,
} from './services/studentService';
import { getCourseLessonsList } from './data/lessonsData';

// Modals

import { OfflineBanner } from './components/student/OfflinePanel';
import { saveProfile, loadProfile, clearProfile } from './lib/offlineStore';
import { initOffline, isDisabled, swSupported } from './lib/offline';
import { initInstall } from './lib/install';



// Écrans chargés à la demande : la page d'accueil reste légère sur les connexions lentes.
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const StudentCoursePage = lazy(() => import('./components/student/StudentCoursePage').then((m) => ({ default: m.StudentCoursePage })));
const StudentLessonPage = lazy(() => import('./components/student/StudentLessonPage').then((m) => ({ default: m.StudentLessonPage })));
const StudentExercisePage = lazy(() => import('./components/student/StudentExercisePage').then((m) => ({ default: m.StudentExercisePage })));
const FamilyPage = lazy(() => import('./components/student/FamilyPage').then((m) => ({ default: m.FamilyPage })));
const CommunityPage = lazy(() => import('./components/community/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const LegalPage = lazy(() => import('./components/public/LegalPage').then((m) => ({ default: m.LegalPage })));
const PricingPage = lazy(() => import('./components/public/PricingPage').then((m) => ({ default: m.PricingPage })));
const VerifyCertificatePage = lazy(() => import('./components/public/VerifyCertificatePage').then((m) => ({ default: m.VerifyCertificatePage })));
const TeacherSpace = lazy(() => import('./components/teacher/TeacherSpace').then((m) => ({ default: m.TeacherSpace })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const SqlSchemaViewerModal = lazy(() => import('./components/modals/SqlSchemaViewerModal').then((m) => ({ default: m.SqlSchemaViewerModal })));
const SupabaseConfigModal = lazy(() => import('./components/modals/SupabaseConfigModal').then((m) => ({ default: m.SupabaseConfigModal })));

type AppView =
  | 'home'
  | 'catalog'
  | 'pricing'
  | 'terms'
  | 'privacy'
  | 'login'
  | 'register'
  | 'forgot'
  | 'reset'
  | 'dashboard'
  | 'student-dashboard'
  | 'student-course'
  | 'student-lesson'
  | 'student-exercise'
  | 'family'
  | 'community'
  | 'teacher'
  | 'verify'
  | 'admin-dashboard';

export default function App() {
  const [lang, setLang] = useState<PreferredLanguage>(() => {
    const saved = localStorage.getItem('rythmebinaire_lang') as PreferredLanguage;
    return saved === 'en' ? 'en' : 'fr';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Lien de vérification d'un certificat : /?verif=RB-XXXXXXXX
  const [verifyCode] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('verif') || '';
    } catch {
      return '';
    }
  });
  const [currentView, setCurrentView] = useState<AppView>(verifyCode ? 'verify' : 'home');
  // Vrai quand l'utilisateur arrive depuis le lien de confirmation de l'e-mail
  const confirmedFromEmailRef = useRef(false);
  // Code d'un problème de lien e-mail (ex : lien expiré), affiché sur la page de connexion
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [catalogTrackFilter, setCatalogTrackFilter] = useState<CourseTrack | 'all'>('all');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<PublicCourseItem | null>(null);

  const [courses, setCourses] = useState<PublicCourseItem[]>(INITIAL_COURSES);
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
  // Accès payant / offert : lu à chaque entrée dans un cours, une leçon ou un exercice
  const [myAccess, setMyAccess] = useState<{ loaded: boolean; settings: AccessSettings; grant: AccessGrant | null }>({
    loaded: false,
    settings: DEFAULT_ACCESS_SETTINGS,
    grant: null,
  });
  // Compte enfant supervisé ? (un enfant n'a pas d'espace Famille). null = pas encore connu.
  const [isChildAccount, setIsChildAccount] = useState<boolean | null>(null);
  // Droit « professeur » (donné par l'admin) : affiche le bouton Espace professeur
  const [isTeacher, setIsTeacher] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Student Space State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>('course-python-02');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [enrollmentsProgress, setEnrollmentsProgress] = useState<StudentCourseProgress[]>([]);

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleLanguageChange = (newLang: PreferredLanguage) => {
    setLang(newLang);
    localStorage.setItem('rythmebinaire_lang', newLang);
    if (sessionUser) {
      setSessionUser({
        ...sessionUser,
        preferred_language: newLang,
      });
    }
  };

  const refreshEnrollmentsProgress = async (userId: string) => {
    try {
      const data = await getStudentCoursesProgress(userId);
      setEnrollmentsProgress(data);
    } catch (err) {
      console.warn('Error loading student progress:', err);
    }
  };

  // Recharge l'accès de l'élève quand il ouvre un cours, une leçon ou un exercice
  useEffect(() => {
    if (!sessionUser || sessionUser.role !== 'eleve') return;
    if (!['student-course', 'student-lesson', 'student-exercise'].includes(currentView)) return;
    let cancelled = false;
    setMyAccess((a) => ({ ...a, loaded: false }));
    loadMyAccess(sessionUser.id).then((res) => {
      if (!cancelled) setMyAccess({ loaded: true, ...res });
    });
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, sessionUser?.role, currentView]);

  // Savoir si ce compte est un compte enfant (pour cacher l'espace Famille)
  useEffect(() => {
    if (!sessionUser || sessionUser.role !== 'eleve') {
      setIsChildAccount(null);
      return;
    }
    let cancelled = false;
    loadMyChildLink(sessionUser.id).then((link) => {
      if (!cancelled) setIsChildAccount(!!link);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, sessionUser?.role]);

  // Savoir si ce compte est professeur
  useEffect(() => {
    if (!sessionUser || sessionUser.role !== 'eleve') {
      setIsTeacher(false);
      return;
    }
    let cancelled = false;
    loadIsTeacher(sessionUser.id).then((v) => {
      if (!cancelled) setIsTeacher(v);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id, sessionUser?.role]);

  // Re-fetch progress whenever sessionUser changes
  useEffect(() => {
    if (sessionUser && sessionUser.role === 'eleve') {
      refreshEnrollmentsProgress(sessionUser.id);
    }
  }, [sessionUser, courses]);

  // Fetch courses from Supabase or fallback
  useEffect(() => {
    let isMounted = true;
    fetchPublishedCourses(lang).then((data) => {
      if (isMounted && data) {
        setCourses(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [lang]);

  // Fetch or construct user profile from public.users table
  const fetchUserProfile = async (userId: string, authEmail: string, metadata: Record<string, unknown> = {}) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', error.message);
      }

      if (!data && error) {
        // Base injoignable (pas d'internet) : on reprend le dernier profil connu de ce compte
        const cached = loadProfile();
        if (cached && cached.id === userId) {
          setSessionUser(cached as UserProfile);
          return;
        }
      }

      if (data) {
        saveProfile(data as UserProfile);
        setSessionUser(data as UserProfile);
        if (data.preferred_language) {
          handleLanguageChange(data.preferred_language as PreferredLanguage);
        }
      } else {
        // Fallback using auth user metadata with strict default role 'eleve'
        const fallbackProfile: UserProfile = {
          id: userId,
          email: authEmail,
          full_name: (metadata.full_name as string) || authEmail.split('@')[0],
          role: (metadata.role as 'eleve' | 'admin') || 'eleve',
          preferred_language: (metadata.preferred_language as PreferredLanguage) || 'fr',
          created_at: new Date().toISOString(),
          status: 'active',
        };
        setSessionUser(fallbackProfile);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {
    void initOffline();
    initInstall();
  }, []);

  // Hors connexion : une fois l'élève connecté, on télécharge discrètement (en temps libre) les écrans
  // dont il aura besoin sans internet. Sinon ils ne seraient jamais gardés s'il ne les a pas déjà ouverts.
  useEffect(() => {
    if (sessionUser?.role !== 'eleve' || !swSupported() || isDisabled() || !navigator.onLine) return;
    const warm = () => {
      void import('./components/student/StudentCoursePage');
      void import('./components/student/StudentLessonPage');
      void import('./components/student/StudentExercisePage');
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(warm) : window.setTimeout(warm, 4000);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, [sessionUser?.id, sessionUser?.role]);

  useEffect(() => {
    // Lecture du lien reçu par e-mail (Supabase place les infos après le # de l'adresse)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const cleanUrl = () =>
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (hash.includes('type=recovery')) {
      // Lien « mot de passe oublié » → formulaire de nouveau mot de passe
      setCurrentView('reset');
    } else if (hashParams.get('error')) {
      // Lien de confirmation expiré ou déjà utilisé
      setAuthNotice(hashParams.get('error_code') || 'link-error');
      setCurrentView('login');
      cleanUrl();
    } else if (hashParams.get('access_token')) {
      // Lien « confirmer mon compte » : la session est créée automatiquement
      // par Supabase, on enverra ensuite l'élève directement sur son tableau de bord.
      confirmedFromEmailRef.current = true;
    }

    // Une fois le compte confirmé par e-mail, on connecte directement l'élève
    const goToDashboardIfConfirmedByEmail = () => {
      if (!confirmedFromEmailRef.current) return;
      confirmedFromEmailRef.current = false;
      cleanUrl();
      setCurrentView('student-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Nettoyage : supprime d'anciens comptes « démo » restés dans le navigateur
    try {
      localStorage.removeItem('rythmebinaire_demo_user');
    } catch {
      // sans importance
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || null);
        fetchUserProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata || {}
        );
        goToDashboardIfConfirmedByEmail();
      }
      else if (!navigator.onLine) {
        // Session illisible hors connexion : on rouvre l'espace élève avec le dernier profil connu
        const cached = loadProfile();
        if (cached) {
          setUserEmail(cached.email);
          setSessionUser(cached as UserProfile);
        }
      }
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setCurrentView('reset');
        } else if (session?.user) {
          setUserEmail(session.user.email || null);
          await fetchUserProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata || {}
          );
          goToDashboardIfConfirmedByEmail();
        } else if (event === 'SIGNED_OUT') {
          clearProfile();
          setSessionUser(null);
          setUserEmail(null);
        } else if (navigator.onLine) {
          setSessionUser(null);
          setUserEmail(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    }
    clearProfile();
    setSessionUser(null);
    setUserEmail(null);
    setCurrentView('home');
  };

  const handleContinueCourse = (courseId: string, targetLessonId?: string) => {
    setSelectedCourseId(courseId);
    if (targetLessonId) {
      setSelectedLessonId(targetLessonId);
    } else {
      const allLessons = getCourseLessonsList(courseId);
      setSelectedLessonId(allLessons[0]?.id || null);
    }
    setCurrentView('student-lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentView('student-course');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLesson = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setCurrentView('student-lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenExercise = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setCurrentView('student-exercise');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextLessonFromExercise = (courseId: string, currentLessonId: string) => {
    const allLessons = getCourseLessonsList(courseId);
    const idx = allLessons.findIndex((l) => l.id === currentLessonId);
    if (idx >= 0 && idx < allLessons.length - 1) {
      const nextLes = allLessons[idx + 1];
      setSelectedLessonId(nextLes.id);
      setCurrentView('student-lesson');
    } else {
      setCurrentView('student-course');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnrollCourse = async (courseId: string) => {
    if (!sessionUser) return;
    await enrollStudentInCourse(sessionUser.id, courseId);
    await refreshEnrollmentsProgress(sessionUser.id);
  };

  const handleMarkCompleted = async (courseId: string, lessonId: string) => {
    if (!sessionUser) return;
    await markLessonCompleted(sessionUser.id, courseId, lessonId);
    await refreshEnrollmentsProgress(sessionUser.id);
  };

  const handleNavigate = (view: string, filter?: CourseTrack) => {
    if (filter) {
      setCatalogTrackFilter(filter);
    } else if (view === 'catalog') {
      setCatalogTrackFilter('all');
    }
    setCurrentView(view as AppView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text-main)] flex flex-col font-sans antialiased transition-colors duration-200 selection:bg-[#BEF264] selection:text-[#070D1E]">
      {/* Universal Dark Navy Header with Neon Yellow/Green Accent strictly for logo/header */}
      <PublicHeader
        currentView={currentView}
        onNavigate={handleNavigate}
        currentLang={lang}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={sessionUser}
        onLogout={handleLogout}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
      />

      <OfflineBanner lang={lang} />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24" role="status">
              <span className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-500">{lang === 'fr' ? 'Chargement…' : 'Loading…'}</span>
            </div>
          }
        >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
            <span className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Chargement de RythmeBinaireGn...</span>
          </div>
        ) : (
          <>
            {/* 1. PUBLIC HOME PAGE */}
            {currentView === 'home' && (
              <HomePage
                lang={lang}
                onNavigate={handleNavigate}
                onSelectCourse={(course) => setSelectedCourseForDetail(course)}
                featuredCourses={courses}
              />
            )}

            {/* 2. PUBLIC COURSE CATALOG PAGE */}
            {currentView === 'catalog' && (
              <CourseCatalogPage
                courses={courses}
                lang={lang}
                initialTrackFilter={catalogTrackFilter}
                onSelectCourse={(course) => setSelectedCourseForDetail(course)}
              />
            )}

            {/* 2b. PAGES PUBLIQUES : tarifs, conditions, confidentialité */}
            {currentView === 'pricing' && <PricingPage lang={lang} onNavigate={handleNavigate} />}
            {currentView === 'verify' && <VerifyCertificatePage lang={lang} initialCode={verifyCode} />}
            {currentView === 'terms' && <LegalPage kind="terms" lang={lang} onNavigate={handleNavigate} />}
            {currentView === 'privacy' && <LegalPage kind="privacy" lang={lang} onNavigate={handleNavigate} />}

            {/* 3. AUTHENTICATION PAGES (Login, Register, Forgot, Reset) */}
            {(currentView === 'login' ||
              currentView === 'register' ||
              currentView === 'forgot' ||
              currentView === 'reset') && (
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-md my-auto py-6">
                  {currentView === 'login' && (
                    <LoginForm
                      lang={lang}
                      onNavigate={(view) => setCurrentView(view as AppView)}
                      onLoginSuccess={() => {
                        setAuthNotice(null);
                        setCurrentView('student-dashboard');
                      }}
                      notice={
                        authNotice
                          ? lang === 'fr'
                            ? "Ce lien de confirmation a expiré ou a déjà été utilisé. Si vous avez déjà confirmé votre e-mail, connectez-vous simplement. Sinon, recréez votre compte pour recevoir un nouveau lien."
                            : 'This confirmation link has expired or was already used. If you already confirmed your email, just sign in. Otherwise, sign up again to get a new link.'
                          : undefined
                      }
                      onBackToHome={() => setCurrentView('home')}
                    />
                  )}

                  {currentView === 'register' && (
                    <RegisterForm
                      lang={lang}
                      onNavigate={(view) => setCurrentView(view as AppView)}
                      onRegisterSuccess={() => {
                        setCurrentView('login');
                      }}
                      onAuthenticated={() => {
                        setCurrentView('student-dashboard');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onBackToHome={() => setCurrentView('home')}
                    />
                  )}

                  {currentView === 'forgot' && (
                    <ForgotPasswordForm
                      lang={lang}
                      onNavigate={(view) => setCurrentView(view as AppView)}
                    />
                  )}

                  {currentView === 'reset' && (
                    <ResetPasswordForm
                      lang={lang}
                      onSuccess={() => {
                        setCurrentView('login');
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 4. STUDENT DASHBOARD (Accessible only to role = 'eleve') */}
            {(currentView === 'student-dashboard' || (currentView === 'dashboard' && sessionUser?.role === 'eleve')) && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' ? (
                  <StudentDashboard
                    user={sessionUser}
                    lang={lang}
                    courses={courses}
                    enrollmentsProgress={enrollmentsProgress}
                    onContinueCourse={handleContinueCourse}
                    onOpenCourse={handleOpenCourse}
                    onBrowseCatalog={() => handleNavigate('catalog')}
                    onOpenFamily={isChildAccount === false ? () => setCurrentView('family') : undefined}
                    onOpenCommunity={isChildAccount === false ? () => setCurrentView('community') : undefined}
                    onOpenTeacher={isTeacher ? () => setCurrentView('teacher') : undefined}
                    isChildAccount={isChildAccount !== false}
                  />
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 4b. FAMILLE : l'adulte gère les comptes de ses enfants (jamais accessible à un compte enfant) */}
            {currentView === 'family' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' && isChildAccount === false ? (
                  <FamilyPage
                    user={sessionUser}
                    lang={lang}
                    onBack={() => setCurrentView('student-dashboard')}
                    courseTitles={Object.fromEntries(courses.map((c) => [c.id, c.translations[lang].title]))}
                  />
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 4c. ENTRAIDE : questions/réponses (jamais pour un compte enfant, vérifié aussi côté base) */}
            {currentView === 'community' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && isChildAccount === false ? (
                  <CommunityPage
                    lang={lang}
                    courses={courses.map((c) => ({ id: c.id, title: c.translations[lang].title }))}
                    onBack={() => setCurrentView('student-dashboard')}
                  />
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 5. STUDENT COURSE PAGE (Modules and lessons list in order) */}
            {currentView === 'student-course' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' ? (
                  (() => {
                    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
                    const activeProgress = enrollmentsProgress.find((p) => p.courseId === activeCourse.id) || null;
                    return (
                      <StudentCoursePage
                        course={activeCourse}
                        user={sessionUser}
                        lang={lang}
                        progress={activeProgress}
                        onBack={() => setCurrentView('student-dashboard')}
                        onEnroll={handleEnrollCourse}
                        onSelectLesson={handleSelectLesson}
                        onOpenExercise={handleOpenExercise}
                        lockedLessonIds={
                          new Set(
                            getCourseLessonsList(activeCourse.id)
                              .filter((l, idx) => isLessonLocked(myAccess.settings, myAccess.grant, idx))
                              .map((l) => l.id)
                          )
                        }
                      />
                    );
                  })()
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 6. STUDENT LESSON PAGE (Markdown reader, completion button, prev/next) */}
            {currentView === 'student-lesson' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' ? (
                  (() => {
                    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
                    const allLessons = getCourseLessonsList(activeCourse.id);
                    const activeLesson = allLessons.find((l) => l.id === selectedLessonId) || allLessons[0];
                    const activeProgress = enrollmentsProgress.find((p) => p.courseId === activeCourse.id) || null;
                    if (!activeLesson) {
                      return (
                        <div className="p-8 text-center text-slate-500">
                          Leçon introuvable.
                        </div>
                      );
                    }
                    if (!myAccess.loaded) {
                      return <div className="p-8 text-center text-slate-500 text-sm">…</div>;
                    }
                    if (isLessonLocked(myAccess.settings, myAccess.grant, allLessons.findIndex((l) => l.id === activeLesson.id))) {
                      return <LockedLesson lang={lang} settings={myAccess.settings} onBack={() => setCurrentView('student-course')} />;
                    }
                    return (
                      <StudentLessonPage
                        course={activeCourse}
                        lesson={activeLesson}
                        user={sessionUser}
                        lang={lang}
                        progress={activeProgress}
                        onBackToCourse={() => setCurrentView('student-course')}
                        onNavigateLesson={handleSelectLesson}
                        onMarkCompleted={handleMarkCompleted}
                        onOpenExercise={handleOpenExercise}
                      />
                    );
                  })()
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 7. STUDENT CODE EXERCISE VIEW (CodeMirror, Sandbox execution, AI Hint tutor) */}
            {currentView === 'student-exercise' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' ? (
                  (() => {
                    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
                    const allLessons = getCourseLessonsList(activeCourse.id);
                    const activeLesson = allLessons.find((l) => l.id === selectedLessonId) || allLessons[0];
                    if (!activeLesson) {
                      return (
                        <div className="p-8 text-center text-slate-500">
                          Exercice introuvable.
                        </div>
                      );
                    }
                    if (!myAccess.loaded) {
                      return <div className="p-8 text-center text-slate-500 text-sm">…</div>;
                    }
                    if (isLessonLocked(myAccess.settings, myAccess.grant, allLessons.findIndex((l) => l.id === activeLesson.id))) {
                      return <LockedLesson lang={lang} settings={myAccess.settings} onBack={() => setCurrentView('student-course')} />;
                    }
                    return (
                      <StudentExercisePage
                        course={activeCourse}
                        lesson={activeLesson}
                        user={sessionUser}
                        lang={lang}
                        onBackToLesson={() => setCurrentView('student-lesson')}
                        onLessonCompleted={handleMarkCompleted}
                        onNextLesson={() =>
                          handleNextLessonFromExercise(activeCourse.id, activeLesson.id)
                        }
                      />
                    );
                  })()
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 8. ADMIN / GENERAL PROFILE SCREEN */}
            {currentView === 'dashboard' && sessionUser?.role !== 'eleve' && (
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                {sessionUser ? (
                  sessionUser.role === 'admin' ? (
                    <div className="w-full">
                      <AdminDashboard
                        user={sessionUser}
                        lang={lang}
                        onNavigate={(v) => setCurrentView(v as AppView)}
                        onLoginClick={() => setCurrentView('login')}
                        onBackToHome={() => setCurrentView('home')}
                      />
                    </div>
                  ) : (
                    <AuthWaitingScreen
                      user={sessionUser}
                      email={userEmail}
                      lang={lang}
                      onLogout={handleLogout}
                      onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
                      onOpenConfigModal={() => setIsConfigModalOpen(true)}
                    />
                  )
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Vous n'êtes pas connecté.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentView('login')}
                      className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold"
                    >
                      Se connecter
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Espace professeur */}
            {currentView === 'teacher' && (
              <div className="flex-1 flex flex-col">
                {sessionUser && sessionUser.role === 'eleve' && isTeacher ? (
                  <TeacherSpace user={sessionUser} lang={lang} courses={courses} onBack={() => setCurrentView('student-dashboard')} />
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onBackToHome={() => setCurrentView('home')}
                  />
                )}
              </div>
            )}

            {/* 9. ADMIN DASHBOARD SCREEN */}
            {currentView === 'admin-dashboard' && (
              <div className="flex-1 flex flex-col">
                <AdminDashboard
                  user={sessionUser}
                  lang={lang}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                  onLoginClick={() => setCurrentView('login')}
                  onBackToHome={() => setCurrentView('home')}
                />
              </div>
            )}
          </>
        )}
        </Suspense>
      </main>

      {/* Course Detail Modal (Accessible from anywhere without page reload) */}
      <CourseDetailModal
        course={selectedCourseForDetail}
        isOpen={Boolean(selectedCourseForDetail)}
        onClose={() => setSelectedCourseForDetail(null)}
        lang={lang}
        isStudent={sessionUser?.role === 'eleve'}
        onOpenStudentCourse={(courseId) => {
          setSelectedCourseForDetail(null);
          handleOpenCourse(courseId);
        }}
        onSelectRegister={() => {
          setSelectedCourseForDetail(null);
          setCurrentView('register');
        }}
        onSelectLogin={() => {
          setSelectedCourseForDetail(null);
          setCurrentView('login');
        }}
      />

      {/* Database & System Modals */}
      <Suspense fallback={null}>
        {isSchemaModalOpen && (
          <SqlSchemaViewerModal
            isOpen={isSchemaModalOpen}
            onClose={() => setIsSchemaModalOpen(false)}
            lang={lang}
          />
        )}
        {isConfigModalOpen && (
          <SupabaseConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            lang={lang}
          />
        )}
      </Suspense>
    </div>
  );
}
