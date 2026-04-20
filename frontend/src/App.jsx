import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-context';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const StudentCalendar = lazy(() => import('./pages/StudentCalendar'));
const StudentClubs = lazy(() => import('./pages/StudentClubs'));
const StudentAttendanceCheckin = lazy(() => import('./pages/StudentAttendanceCheckin'));
const ClubsDashboard = lazy(() => import('./pages/ClubsDashboard'));
const ClubsSetup = lazy(() => import('./pages/ClubsSetup'));
const ClubsProfile = lazy(() => import('./pages/ClubsProfile'));
const ClubsCalendar = lazy(() => import('./pages/ClubsCalendar'));

const ROUTE_TITLES = {
  '/': 'WAVC - Stay in the loop',
  '/login': 'WAVC - Login',
  '/student/dashboard': 'WAVC - Student Dashboard',
  '/student/profile': 'WAVC - Student Profile',
  '/student/calendar': 'WAVC - Student Calendar',
  '/student/clubs': 'WAVC - Clubs',
  '/student/attendance-checkin': 'WAVC - Attendance Check-in',
  '/club/dashboard': 'WAVC - Club Dashboard',
  '/club/setup': 'WAVC - Club Setup',
  '/club/profile': 'WAVC - Club Profile',
  '/club/calendar': 'WAVC - Club Calendar',
};

function LoadingRouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-canvas px-6 text-center text-sm text-text-secondary">
      Loading account...
    </div>
  );
}

function ProtectedRoute({ children, allowRoles }) {
  const { loading, user } = useAuth();

  if (loading) return <LoadingRouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowRoles?.length && !allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { loading, user } = useAuth();

  if (loading) return <LoadingRouteFallback />;
  if (user) {
    const homePath = user.role === 'CLUB_ADMIN' ? '/club/dashboard' : '/student/dashboard';
    return <Navigate to={homePath} replace />;
  }

  return children;
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-canvas px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">404</p>
      <h1 className="text-balance text-2xl font-bold text-text-primary">Page not found</h1>
      <p className="max-w-md text-pretty text-sm text-text-secondary">
        Route missing. Use dashboard navigation to continue.
      </p>
    </main>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Route rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-canvas px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Application error</p>
          <h1 className="text-balance text-2xl font-bold text-text-primary">Something broke on this page</h1>
          <p className="max-w-md text-pretty text-sm text-text-secondary">
            Retry by refreshing. If this continues, contact maintainers.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Reload
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function RouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    document.title = ROUTE_TITLES[location.pathname] || 'WAVC - Campus Clubs';
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <RouteMetadata />
        <AppErrorBoundary>
          <Suspense fallback={<LoadingRouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/login"
                element={(
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                )}
              />
              <Route
                path="/student/dashboard"
                element={(
                  <ProtectedRoute allowRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/student/profile"
                element={(
                  <ProtectedRoute allowRoles={['STUDENT']}>
                    <StudentProfile />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/student/calendar"
                element={(
                  <ProtectedRoute allowRoles={['STUDENT']}>
                    <StudentCalendar />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/student/clubs"
                element={(
                  <ProtectedRoute allowRoles={['STUDENT']}>
                    <StudentClubs />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/student/attendance-checkin"
                element={(
                  <ProtectedRoute allowRoles={['STUDENT']}>
                    <StudentAttendanceCheckin />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/club/dashboard"
                element={(
                  <ProtectedRoute allowRoles={['CLUB_ADMIN']}>
                    <ClubsDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/club/setup"
                element={(
                  <ProtectedRoute allowRoles={['CLUB_ADMIN']}>
                    <ClubsSetup />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/club/profile"
                element={(
                  <ProtectedRoute allowRoles={['CLUB_ADMIN']}>
                    <ClubsProfile />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/club/calendar"
                element={(
                  <ProtectedRoute allowRoles={['CLUB_ADMIN']}>
                    <ClubsCalendar />
                  </ProtectedRoute>
                )}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
