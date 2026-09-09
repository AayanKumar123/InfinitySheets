import React, { useState, useEffect } from 'react';
import { LayoutDashboard, GraduationCap, Pencil, FileText, Library, History, TrendingUp, Dumbbell, Sparkles, AlertTriangle, Settings, Shield , BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Dashboard from './Dashboard';
import StartStudying from './StartStudying';
import Worksheets from './Worksheets';
import WorksheetHistory from './WorksheetHistory';
import ProgressView from './ProgressView';
import Strengths from './Strengths';
import Mistakes from './Mistakes';
import Recommendations from './Recommendations';
import SettingsView from './SettingsView';
import MyCourses from './MyCourses';
import TutorialOverlay from './TutorialOverlay';
import CourseWizard from './CourseWizard';
import QuestionBank from './QuestionBank';
import AdminPlaceholder from './AdminPlaceholder';
import CourseOverview from './CourseOverview';
import TopicOverview from './TopicOverview';
import ResourcesPage from '../landing/ResourcesPage';
import Sidebar from './shell/Sidebar';
import DemoBanner from './shell/DemoBanner';
import TopHeader from './shell/TopHeader';
import { toast } from 'sonner';

const BASE_NAV = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'courses', label: 'My Courses', Icon: GraduationCap },
  { key: 'study', label: 'Start Studying', Icon: Pencil },
  { key: 'qbank', label: 'Question Bank', Icon: Library },
  { key: 'history', label: 'Worksheet History', Icon: History },
  { key: 'progress', label: 'Performance', Icon: TrendingUp },
  { key: 'strengths', label: 'Strengths & Weaknesses', Icon: Dumbbell },
  { key: 'recommendations', label: 'Smart Learning', Icon: Sparkles },
  { key: 'settings', label: 'Settings', Icon: Settings },
];
const ADMIN_ITEM = { key: 'admin', label: 'Admin', Icon: Shield };
const HIDDEN_ROUTES = [
  { key: 'worksheets', label: 'Create a Worksheet', Icon: FileText },
  { key: 'mistakes', label: 'Mistake History', Icon: AlertTriangle },
  { key: 'course-overview', label: 'Course Overview', Icon: GraduationCap },
  { key: 'topic', label: 'Topic overview', Icon: GraduationCap },
  // Reachable from the landing footer / topic pages even though it left the sidebar.
  { key: 'resources', label: 'Free Resources', Icon: BookOpen },
];

const SIDEBAR_STORAGE_KEY = 'infinitysheets_sidebar_open';
const MOBILE_QUERY = '(max-width: 767px)';

function useIsMobile() {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    // Safari <14 support: addListener/removeListener fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    setIsMobile(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '');
  const [key, query] = raw.split('?');
  const params = {};
  (query || '').split('&').filter(Boolean).forEach((pair) => {
    const [k, v = ''] = pair.split('=');
    params[k] = v;
  });
  return { key: key || 'dashboard', params };
}

function renderRoute(activeKey, params, go, isAdmin) {
  switch (activeKey) {
    case 'dashboard': return <Dashboard go={go} />;
    case 'courses': return <MyCourses />;
    case 'study': return <StartStudying go={go} subjectParam={params.subject} />;
    case 'worksheets': return <Worksheets go={go} />;
    case 'qbank': return <QuestionBank go={go} subjectParam={params.subject} />;
    case 'history': return <WorksheetHistory />;
    case 'progress': return <ProgressView />;
    case 'strengths': return <Strengths />;
    case 'recommendations': return <Recommendations go={go} />;
    case 'mistakes': return <Mistakes />;
    case 'settings': return <SettingsView />;
    case 'resources': return <ResourcesPage embedded />;
    case 'admin': return isAdmin ? <AdminPlaceholder /> : <Dashboard go={go} />;
    case 'course-overview': return <CourseOverview courseId={params.id} go={go} />;
    case 'topic': return <TopicOverview subject={params.subject} topic={params.topic} go={go} />;
    default: return <Dashboard go={go} />;
  }
}

export default function AppShell({ hash }) {
  const { state, syncStatus, logout, apiLogout, toggleTheme, restartTutorial, restartOnboarding, resetProgress } = useApp();
  const { key: active, params } = parseHash(hash);
  const isDemo = !!state.user?.isDemo;
  const isAdmin = state.user?.role === 'admin' || isDemo;
  const NAV = isAdmin ? [...BASE_NAV, ADMIN_ITEM] : BASE_NAV;
  const ALL_ITEMS = [...NAV, ...HIDDEN_ROUTES];
  const current = ALL_ITEMS.find((n) => n.key === active) || NAV[0];

  // Sidebar collapse state — persisted so it survives refreshes on desktop.
  // On mobile the sidebar starts closed and never persists.
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch (_) {
      return true;
    }
  });
  // Whenever we cross the mobile / desktop breakpoint, snap to sensible defaults.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else {
      try {
        const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setSidebarOpen(v === null ? true : v === '1');
      } catch (_) { setSidebarOpen(true); }
    }
  }, [isMobile]);
  useEffect(() => {
    // Only persist the desktop preference.
    if (isMobile) return;
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? '1' : '0'); } catch (_) {}
  }, [sidebarOpen, isMobile]);

  const go = (k) => {
    // For authenticated users, `resources` renders inside the shell so the
    // sidebar stays visible (see the `case 'resources'` route above). For
    // anonymous users, App.js intercepts `#resources` and shows the
    // standalone landing ResourcesPage instead.
    window.location.hash = `#${k}`;
    // Auto-close the drawer after a route change on mobile so the page
    // becomes visible again.
    if (isMobile) setSidebarOpen(false);
  };
  const isDark = state.theme === 'dark';
  const showOnboarding = !state.onboardingDone;
  const showTutorial = state.onboardingDone && !state.tutorialDone;

  const resetDemo = () => {
    resetProgress();
    restartOnboarding();
    restartTutorial();
    window.location.hash = '#dashboard';
    toast.success('Demo reset — starting setup from the top');
  };

  const exitAccount = async () => {
    if (isDemo) {
      logout();
    } else {
      await apiLogout();
    }
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen section-bg flex relative">
      {/* Mobile scrim — dim the app when the drawer is open so the page
          content becomes clearly "behind" the sidebar. */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          data-testid="sidebar-scrim"
        />
      )}

      {/* Sidebar. On desktop it participates in the flex row and animates its
          own width. On mobile it becomes a fixed drawer that slides in from
          the left over the content. */}
      <div
        className={
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-[280px] py-2 pl-2 pr-1 transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `shrink-0 py-2 pl-2 transition-[width,opacity,transform] duration-300 ease-out overflow-hidden ${sidebarOpen ? 'w-[242px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'}`
        }
        aria-hidden={!sidebarOpen}
      >
        <div className={isMobile ? 'w-full h-[calc(100vh-16px)]' : 'w-[230px] h-[calc(100vh-16px)] sticky top-2'}>
          <Sidebar
            nav={NAV}
            activeKey={current.key}
            isDemo={isDemo}
            onNavigate={go}
            onResetDemo={resetDemo}
            onLogout={exitAccount}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      <main className="min-w-0 flex-1 relative">
        {isDemo && <DemoBanner onResetDemo={resetDemo} onExit={exitAccount} />}
        <TopHeader
          title={current.label}
          activeKey={current.key}
          isDark={isDark}
          courseCount={(state.courses || []).length}
          onToggleTheme={toggleTheme}
          onNewWorksheet={() => go('worksheets')}
          sidebarOpen={sidebarOpen && !isMobile}
          onOpenSidebar={() => setSidebarOpen(true)}
          syncStatus={syncStatus}
          isDemo={!!state.user?.isDemo}
        />
        <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1280px]">
          {renderRoute(current.key, params, go, isAdmin)}
        </div>
      </main>

      {showOnboarding && <CourseWizard mode="onboarding" />}
      {showTutorial && <TutorialOverlay />}
    </div>
  );
}
