import { useState, useEffect } from 'react';
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
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentCoursePage } from './components/student/StudentCoursePage';
import { StudentLessonPage } from './components/student/StudentLessonPage';
import { StudentExercisePage } from './components/student/StudentExercisePage';
import { StudentAccessDenied } from './components/student/StudentAccessDenied';

// Admin Space Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import {
  getStudentCoursesProgress,
  enrollStudentInCourse,
  markLessonCompleted,
  StudentCourseProgress,
} from './services/studentService';
import { getCourseLessonsList } from './data/lessonsData';

// Modals
import { SqlSchemaViewerModal } from './components/modals/SqlSchemaViewerModal';
import { SupabaseConfigModal } from './components/modals/SupabaseConfigModal';

type AppView =
  | 'home'
  | 'catalog'
  | 'login'
  | 'register'
  | 'forgot'
  | 'reset'
  | 'dashboard'
  | 'student-dashboard'
  | 'student-course'
  | 'student-lesson'
  | 'student-exercise'
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

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [catalogTrackFilter, setCatalogTrackFilter] = useState<CourseTrack | 'all'>('all');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<PublicCourseItem | null>(null);

  const [courses, setCourses] = useState<PublicCourseItem[]>(INITIAL_COURSES);
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
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

  // Re-fetch progress whenever sessionUser changes
  useEffect(() => {
    if (sessionUser && sessionUser.role === 'eleve') {
      refreshEnrollmentsProgress(sessionUser.id);
    }
  }, [sessionUser]);

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

      if (data) {
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
    // Check if recovery link was clicked
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setCurrentView('reset');
    }

    // Check if a demo student was previously signed in
    try {
      const storedDemo = localStorage.getItem('rythmebinaire_demo_user');
      if (storedDemo) {
        const parsed = JSON.parse(storedDemo) as UserProfile;
        setSessionUser(parsed);
        setUserEmail(parsed.email);
        if (parsed.preferred_language) {
          setLang(parsed.preferred_language);
        }
      }
    } catch (e) {
      console.warn('Demo user load error', e);
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
        } else {
          // If no supabase session, keep demo user if present, or clear
          const storedDemo = localStorage.getItem('rythmebinaire_demo_user');
          if (!storedDemo) {
            setSessionUser(null);
            setUserEmail(null);
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleEnableDemoStudent = () => {
    const demoStudent: UserProfile = {
      id: 'usr-demo-eleve-amina',
      email: 'amina.diallo@rythmebinaire.gn',
      full_name: 'Amina Diallo',
      role: 'eleve',
      preferred_language: lang,
      created_at: '2026-02-15T09:00:00Z',
      status: 'active',
    };
    localStorage.setItem('rythmebinaire_demo_user', JSON.stringify(demoStudent));
    setSessionUser(demoStudent);
    setUserEmail(demoStudent.email);
    refreshEnrollmentsProgress(demoStudent.id);
    setCurrentView('student-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnableDemoAdmin = () => {
    const demoAdmin: UserProfile = {
      id: 'usr-demo-admin-moussa',
      email: 'admin@rythmebinaire.gn',
      full_name: 'Moussa Kéita (Admin)',
      role: 'admin',
      preferred_language: lang,
      created_at: '2026-01-10T08:00:00Z',
      status: 'active',
    };
    localStorage.setItem('rythmebinaire_demo_user', JSON.stringify(demoAdmin));
    setSessionUser(demoAdmin);
    setUserEmail(demoAdmin.email);
    setCurrentView('admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    localStorage.removeItem('rythmebinaire_demo_user');
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    }
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

      {/* Main View Container */}
      <main className="flex-1 flex flex-col">
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
                        setCurrentView('student-dashboard');
                      }}
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
                  />
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onEnableDemoStudent={handleEnableDemoStudent}
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
                      />
                    );
                  })()
                ) : (
                  <StudentAccessDenied
                    user={sessionUser}
                    lang={lang}
                    onLoginClick={() => setCurrentView('login')}
                    onEnableDemoStudent={handleEnableDemoStudent}
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
                    onEnableDemoStudent={handleEnableDemoStudent}
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
                    onEnableDemoStudent={handleEnableDemoStudent}
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
                        onEnableDemoAdmin={handleEnableDemoAdmin}
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

            {/* 9. ADMIN DASHBOARD SCREEN */}
            {currentView === 'admin-dashboard' && (
              <div className="flex-1 flex flex-col">
                <AdminDashboard
                  user={sessionUser}
                  lang={lang}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                  onLoginClick={() => setCurrentView('login')}
                  onEnableDemoAdmin={handleEnableDemoAdmin}
                  onBackToHome={() => setCurrentView('home')}
                />
              </div>
            )}
          </>
        )}
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
      <SqlSchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        lang={lang}
      />

      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
