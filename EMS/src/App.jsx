import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthProvider from './context/AuthProvider';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import RegisterPage from './pages/RegisterPage';
import StudentShell from './components/StudentShell';
import EventDetailsPage from './pages/EventDetailsPage';
import MyEventsPage from './pages/MyEventsPage';

function RouteContent() {
  const { accessToken, isRestoring } = useAuth();
  if (isRestoring) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-nu-navy" role="status">Restoring your session…</main>;
  }
  return <Routes>
    <Route path="/" element={accessToken ? <Navigate to="/home" replace /> : <LoginPage />} />
    <Route path="/register" element={accessToken ? <Navigate to="/home" replace /> : <RegisterPage />} />
    <Route path="/login/otp" element={accessToken ? <Navigate to="/home" replace /> : <OtpPage kind="login" />} />
    <Route path="/register/otp" element={accessToken ? <Navigate to="/home" replace /> : <OtpPage kind="registration" />} />
    <Route element={accessToken ? <StudentShell /> : <Navigate to="/" replace />}>
      <Route path="/home" element={<HomePage />} />
      <Route path="/events/:id" element={<EventDetailsPage />} />
      <Route path="/my-events" element={<MyEventsPage />} />
    </Route>
    <Route path="*" element={<Navigate to={accessToken ? '/home' : '/'} replace />} />
  </Routes>;
}

function App() {
  return <AuthProvider><RouteContent /></AuthProvider>;
}

export default App;
