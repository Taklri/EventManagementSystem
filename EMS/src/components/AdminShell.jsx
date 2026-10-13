import { useState } from 'react';
import { CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import nuLogo from '../assets/NULOGO.svg';

const AccountSummary = ({ name, initials, handleSignOut, signingOut, error }) => {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-nu-navy [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nu-navy text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-nu-dark">{name}</span>
          <span className="block text-[11px] text-slate-500">Administrator</span>
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className="shrink-0 text-slate-500 transition group-open:rotate-180"
        />
        <span className="sr-only">Account menu for {name}</span>
      </summary>
      <div className="absolute bottom-full left-0 z-20 mb-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <p className="px-3 py-2 text-xs text-slate-500">Signed in as {name}</p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-nu-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-60"
        >
          <LogOut size={16} aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        {error && (
          <p role="alert" className="px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </details>
  );
};

const AdminShell = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrator';
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toLocaleUpperCase() || 'A';

  const handleSignOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      await signOut();
    } catch {
      setError('Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const navigation = (
    <nav aria-label="Admin navigation" className="space-y-1.5">
      <Link
        to="/admin"
        onClick={() => setMenuOpen(false)}
        aria-current={location.pathname === '/admin' ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-gold focus-visible:ring-offset-2 ${location.pathname === '/admin' ? 'bg-nu-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <LayoutDashboard size={17} aria-hidden="true" />
        Dashboard
      </Link>
      <Link
        to="/admin/events"
        onClick={() => setMenuOpen(false)}
        aria-current={location.pathname.startsWith('/admin/events') ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-gold focus-visible:ring-offset-2 ${location.pathname.startsWith('/admin/events') ? 'bg-nu-navy text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-nu-navy'}`}
      >
        <CalendarDays size={17} aria-hidden="true" />
        Event management
      </Link>
      <Link
        to="/admin/students"
        onClick={() => setMenuOpen(false)}
        aria-current={location.pathname.startsWith('/admin/students') ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-gold focus-visible:ring-offset-2 ${location.pathname.startsWith('/admin/students') ? 'bg-nu-navy text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-nu-navy'}`}
      >
        <Users size={17} className="shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap text-sm tracking-tight">Student management</span>
      </Link>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#f5f6fa] font-sans text-nu-dark">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-nu-navy focus:p-3 focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <img src={nuLogo} alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">National University</p>
            <p className="text-xs text-slate-500">Admin portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-nav"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          className="rounded-lg p-2 text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <div className="min-h-[calc(100dvh-4rem)] lg:min-h-dvh">
        <aside className="fixed bottom-6 left-6 top-6 z-30 hidden w-64 flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex">
          <div className="flex shrink-0 items-center gap-3">
            <img src={nuLogo} alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">National University</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Event Management System</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1 -m-1">{navigation}</div>
          <div className="shrink-0 border-t border-slate-100 pt-5">
            <AccountSummary
              name={name}
              initials={initials}
              handleSignOut={handleSignOut}
              signingOut={signingOut}
              error={error}
            />
          </div>
        </aside>

        <div
          id="admin-mobile-nav"
          className={`${menuOpen ? 'block' : 'hidden'} fixed left-0 right-0 top-16 z-30 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-sm lg:hidden`}
        >
          {navigation}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <AccountSummary
              name={name}
              initials={initials}
              handleSignOut={handleSignOut}
              signingOut={signingOut}
              error={error}
            />
          </div>
        </div>
        <main
          id="admin-main"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 outline-none motion-safe:animate-page-enter sm:px-6 lg:ml-[280px]"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
