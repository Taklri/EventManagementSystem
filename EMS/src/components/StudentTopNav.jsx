import { useEffect, useState } from 'react';
import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';
import nuLogo from '../assets/NULOGO.svg';

const navClass = ({ isActive }) =>
  `rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 ${isActive ? 'bg-nu-navy text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-nu-navy'}`;
export default function StudentTopNav() {
  const { pathname } = useLocation();
  const { signOut, user, accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student account';
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toLocaleUpperCase() || 'S';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    notificationsApi
      .list(accessToken)
      .then((data) => {
        if (active) setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => {
      active = false;
    };
  }, [accessToken, pathname]);
  useEffect(() => {
    const onChange = (event) => setUnreadCount(event.detail?.unreadCount || 0);
    window.addEventListener('student-notifications-changed', onChange);
    return () => window.removeEventListener('student-notifications-changed', onChange);
  }, []);
  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError('');
    try {
      await signOut();
    } catch {
      setError('Unable to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-nu-navy focus:p-3 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <NavLink
          to="/home"
          aria-label="National University student events home"
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          <img src={nuLogo} alt="" className="h-11 w-10 object-contain" />
          <div>
            <p className="text-sm font-semibold text-nu-dark sm:text-base">National University</p>
            <p className="text-xs text-slate-500">Student Events</p>
          </div>
        </NavLink>
        <nav
          aria-label="Student navigation"
          className="order-3 flex w-full items-center gap-2 border-t border-slate-100 pt-3 sm:order-none sm:mr-auto sm:w-auto sm:border-0 sm:pt-0"
        >
          <NavLink
            to="/home"
            className={({ isActive }) =>
              navClass({ isActive: isActive || pathname.startsWith('/events/') })
            }
          >
            Home
          </NavLink>
          <NavLink to="/my-events" className={navClass}>
            My Events
          </NavLink>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <NavLink
            to="/notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className={({ isActive }) =>
              `relative flex h-10 w-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 ${isActive ? 'bg-nu-navy text-white' : 'text-nu-navy hover:bg-slate-100'}`
            }
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 text-nu-dark outline-none focus-visible:ring-2 focus-visible:ring-nu-navy [&::-webkit-details-marker]:hidden">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-nu-navy text-sm font-semibold text-white"
                  aria-hidden="true"
                >
                  {initials}
                </span>
              )}
              <span className="hidden text-left md:block">
                <span className="block max-w-40 truncate text-sm font-semibold">{displayName}</span>
                <span className="block text-xs text-slate-500">Student</span>
              </span>
              <ChevronDown
                size={16}
                className="transition group-open:rotate-180"
                aria-hidden="true"
              />
              <span className="sr-only">Account menu for {displayName}</span>
            </summary>
            <div className="absolute right-0 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
              <p className="px-3 py-2 text-xs text-slate-500">
                Signed in as <span className="font-medium text-nu-dark">{displayName}</span>
              </p>
              <NavLink
                to="/profile"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-nu-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
              >
                <Settings size={17} aria-hidden="true" />
                Profile settings
              </NavLink>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-nu-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-60"
              >
                <LogOut size={17} aria-hidden="true" />
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
              {error && (
                <p role="alert" className="px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
