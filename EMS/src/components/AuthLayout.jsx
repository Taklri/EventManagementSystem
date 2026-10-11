import bgImage from '../assets/bgimage.png';
import nuLogo from '../assets/NULOGO.svg';

export default function AuthLayout({ children, compact = false, centered = false }) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-nu-dark px-4 py-8 sm:px-8 lg:justify-end lg:px-[8vw]"
    >
      <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e254e]/85 to-[#173566]/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#10264f]/55 via-transparent to-[#10264f]/10" />
      <section className={`relative z-10 grid min-w-0 w-full grid-cols-1 items-center gap-8 ${centered ? 'mx-auto max-w-md' : 'lg:grid-cols-2 lg:gap-16 xl:gap-24'}`}>
        {!centered && <div className="hidden text-white lg:block">
          <p className="mb-3 font-medium tracking-[.22em] text-nu-gold">NATIONAL UNIVERSITY</p>
          <h1 className="text-5xl font-bold leading-tight xl:text-6xl 2xl:text-7xl">Event<br />Management</h1>
          <div className="mt-5 h-1 w-72 bg-nu-gold" />
          <p className="mt-5 max-w-md text-lg text-white/80">Discover and manage the moments that bring our community together.</p>
        </div>}
        <div className={`mx-auto min-w-0 w-full rounded-2xl bg-white p-6 shadow-2xl shadow-slate-950/25 sm:p-9 ${compact ? 'max-w-md' : 'max-w-xl lg:max-w-[500px]'} ${!centered ? 'lg:mr-0' : ''}`}>
          {!centered && <div className="mb-7 text-center">
            <img src={nuLogo} alt="National University" className="mx-auto h-14 w-auto" />
            <p className="mt-2 text-xs font-semibold tracking-wide text-nu-navy">NATIONAL UNIVERSITY</p>
            <p className="mt-1 text-sm text-slate-500">Event Management System</p>
          </div>}
          {children}
        </div>
        <p className="relative z-10 text-center text-xs text-white/75 lg:hidden">National University · Event Management</p>
      </section>
    </main>
  );
}
