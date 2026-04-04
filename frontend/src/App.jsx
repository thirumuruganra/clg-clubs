import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import AdminDashboard from './pages/AdminDashboard';
import ClubSetup from './pages/ClubSetup';
import Clubs from './pages/Clubs';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/club-setup" element={<ClubSetup />} />
          <Route path="/clubs" element={<Clubs />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
