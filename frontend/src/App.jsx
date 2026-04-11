import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import ClubDashboard from './pages/ClubDashboard';
import ClubSetup from './pages/ClubSetup';
import Clubs from './pages/Clubs';
import ClubProfile from './pages/ClubProfile';
import AttendanceCheckin from './pages/AttendanceCheckin';

function App() {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}

export default App;
