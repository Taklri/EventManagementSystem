import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthProvider from './context/AuthProvider';
import HomePage from './pages/HomePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudentShell from './components/StudentShell';
import EventDetailsPage from './pages/EventDetailsPage';
import MyEventsPage from './pages/MyEventsPage';
import NotificationsPage from './pages/NotificationsPage';
import AttendancePage from './pages/AttendancePage';
import AdminShell from './components/AdminShell';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminEventCreatePage from './pages/AdminEventCreatePage';
import AdminEventDetailsPage from './pages/AdminEventDetailsPage';
import AdminEventEditPage from './pages/AdminEventEditPage';
import AdminStudentsPage from './pages/Adminstudentpage';
import { Toaster } from './components/ui/sonner';

const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage'));

const RouteContent = () => {
  const { accessToken, user, isRestoring, signOut } = useAuth();
  if (isRestoring) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-nu-navy"
        role="status"
      >
        Restoring your session…
      </main>
    );
  }
  const destination = user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/home' : null;
  if (accessToken && !destination) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center text-nu-dark">
        <h1 className="text-xl font-semibold">Account role unavailable</h1>
        <p className="text-sm text-slate-600">
          Please sign out and contact an administrator if this continues.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg bg-nu-navy px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
        >
          Sign out
        </button>
      </main>
    );
  }
  return (
    <Routes>
      <Route
        path="/"
        element={accessToken ? <Navigate to={destination} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={accessToken ? <Navigate to={destination} replace /> : <RegisterPage />}
      />
      <Route
        path="/login/otp"
        element={accessToken ? <Navigate to={destination} replace /> : <OtpPage kind="login" />}
      />
      <Route
        path="/register/otp"
        element={
          accessToken ? <Navigate to={destination} replace /> : <OtpPage kind="registration" />
        }
      />
      <Route
        path="/forgot-password"
        element={accessToken ? <Navigate to={destination} replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/forgot-password/otp"
        element={accessToken ? <Navigate to={destination} replace /> : <OtpPage kind="reset" />}
      />
      <Route
        path="/forgot-password/new"
        element={accessToken ? <Navigate to={destination} replace /> : <ResetPasswordPage />}
      />
      <Route
        element={
          accessToken && user?.role === 'student' ? (
            <StudentShell />
          ) : (
            <Navigate to={destination || '/'} replace />
          )
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/attendance/:id" element={<AttendancePage />} />
      </Route>
      <Route
        path="/admin"
        element={
          accessToken && user?.role === 'admin' ? (
            <AdminShell />
          ) : (
            <Navigate to={destination || '/'} replace />
          )
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route
          path="events"
          element={
            <Suspense
              fallback={
                <div role="status" className="p-6 text-sm text-slate-500">
                  Loading events…
                </div>
              }
            >
              <AdminEventsPage />
            </Suspense>
          }
        />
        <Route path="events/new" element={<AdminEventCreatePage />} />
        <Route path="events/:id" element={<AdminEventDetailsPage />} />
        <Route path="events/:id/edit" element={<AdminEventEditPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={destination || '/'} replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <RouteContent />
      <Toaster />
    </AuthProvider>
  );
};

export default App;