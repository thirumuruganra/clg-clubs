import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import PageLoader from './components/PageLoader';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Calendar = lazy(() => import('./pages/Calendar'));
const ClubDashboard = lazy(() => import('./pages/ClubDashboard'));
const ClubSetup = lazy(() => import('./pages/ClubSetup'));
const Clubs = lazy(() => import('./pages/Clubs'));
const ClubProfile = lazy(() => import('./pages/ClubProfile'));
const AttendanceCheckin = lazy(() => import('./pages/AttendanceCheckin'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<Profile />} />
            <Route path="/student/calendar" element={<Calendar />} />
            <Route path="/student/clubs" element={<Clubs />} />
            <Route path="/student/attendance-checkin" element={<AttendanceCheckin />} />
            <Route path="/club/dashboard" element={<ClubDashboard />} />
            <Route path="/club/setup" element={<ClubSetup />} />
            <Route path="/club/profile" element={<ClubProfile />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
