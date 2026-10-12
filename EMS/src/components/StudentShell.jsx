import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import StudentTopNav from './StudentTopNav';
export default function StudentShell() {
  const { pathname } = useLocation();
  const main = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [pathname]);
  return <div className="min-h-screen bg-[#f5f6fa] text-nu-dark">
    <StudentTopNav />
    <main ref={main} id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6 sm:py-10 lg:px-8"><div key={pathname} className="motion-safe:animate-page-enter"><Outlet /></div></main>
    <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500 sm:px-6 lg:px-8">National University · Student Events</footer>
  </div>;
}
