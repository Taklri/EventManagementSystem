import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { EventEmpty, EventError, EventSkeletons } from '../components/EventFeedback';
import { eventsApi } from '../lib/api';

const filters = [['active', 'All active'], ['upcoming', 'Coming Soon'], ['ongoing', 'Ongoing']];
const eventCache = new Map();

function SearchInput({ search, onSearch }) {
  const [input, setInput] = useState(search);
  const [previousSearch, setPreviousSearch] = useState(search);
  if (previousSearch !== search) {
    setPreviousSearch(search);
    setInput(search);
  }
  useEffect(() => {
    if (input.trim() === search) return undefined;
    const timer = window.setTimeout(() => onSearch(input.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [input, search, onSearch]);
  return <div className="relative w-full lg:max-w-sm"><label htmlFor="event-search" className="sr-only">Search events by title or location</label><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-slate-400" /><input id="event-search" type="search" value={input} maxLength={100} onChange={(event) => setInput(event.target.value)} placeholder="Search events or locations" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/15 [&::-webkit-search-cancel-button]:hidden" />{input && <button onClick={() => setInput('')} aria-label="Clear search" className="absolute right-2 top-1.5 rounded-md p-1.5 text-slate-500 focus-visible:ring-2 focus-visible:ring-nu-navy"><X size={18} /></button>}</div>;
}

function EventListing({ page, search, status, onPageChange, onClear, returnTo }) {
  const queryKey = JSON.stringify([page, search, status]);
  const [view, setView] = useState(() => ({ key: queryKey, data: eventCache.get(queryKey) || null, error: '' }));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    eventsApi.list({ page, search, status }).then((data) => {
      if (!active) return;
      if (page > Math.max(1, data.pagination.totalPages)) {
        onPageChange(Math.max(1, data.pagination.totalPages), true);
        return;
      }
      if (eventCache.size >= 20 && !eventCache.has(queryKey)) eventCache.delete(eventCache.keys().next().value);
      eventCache.set(queryKey, data);
      setView({ key: queryKey, data, error: '' });
    }).catch((requestError) => { if (active) setView({ key: queryKey, data: null, error: requestError.message }); });
    return () => { active = false; };
  }, [page, search, status, queryKey, attempt, onPageChange]);
  const pending = view.key !== queryKey;
  const result = pending ? eventCache.get(queryKey) || view.data : view.data;
  if (!pending && view.error) return <EventError message={view.error} onRetry={() => { setView({ key: queryKey, data: null, error: '' }); setAttempt((value) => value + 1); }} />;
  if (!result) return <EventSkeletons />;
  const { events, pagination } = result;
  if (!events.length && !pending) return <EventEmpty filtered={Boolean(search) || status !== 'active'} onClear={onClear} />;
  const start = (page - 1) * pagination.limit + 1;
  const pageNumbers = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, offset) => Math.max(1, Math.min(page - 2, pagination.totalPages - 4)) + offset);
  return <>
    <p role="status" className="mb-4 text-xs text-slate-500">{pending ? 'Updating events…' : `Showing ${start}–${start + events.length - 1} of ${pagination.total} events · Soonest first`}</p>
    <div aria-busy={pending} inert={pending} className={`grid gap-6 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${pending ? 'opacity-50' : 'opacity-100'}`}>{events.map((event) => <EventCard key={event._id} event={event} returnTo={returnTo} />)}</div>
    {!pending && <nav aria-label="Event pages" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
      <p className="text-xs text-slate-500">Page {page} of {pagination.totalPages}</p>
      <div className="flex items-center gap-1 sm:gap-2">
        <button aria-label="Previous page" disabled={!pagination.hasPrevious} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-nu-navy hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-nu-navy disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
        {pageNumbers.map((number) => <button key={number} aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)} className={`min-h-10 min-w-10 rounded-lg px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 ${number === page ? 'bg-nu-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{number}</button>)}
        <button aria-label="Next page" disabled={!pagination.hasNext} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 bg-white p-2.5 text-nu-navy hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-nu-navy disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
      </div>
    </nav>}
  </>;
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') || '').slice(0, 100);
  const status = filters.some(([value]) => value === params.get('status')) ? params.get('status') : 'active';
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const onSearch = useCallback((value) => {
    setParams((current) => { const next = new URLSearchParams(current); if (value) next.set('search', value); else next.delete('search'); next.delete('page'); return next; }, { replace: true });
  }, [setParams]);
  const onPageChange = useCallback((value, replace = false) => {
    setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(value)); return next; }, { replace });
    const heading = document.getElementById('events-heading');
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [setParams]);
  return <>
    <section className="mb-8 sm:mb-10">
      <div><p className="text-xs text-slate-500 sm:text-sm">{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your next campus moment.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">Welcome back! Discover what’s happening at National University.</p></div>
    </section>
    <section aria-labelledby="events-heading">
      <div className="mb-5"><h2 id="events-heading" tabIndex={-1} className="scroll-mt-44 text-xl font-semibold outline-none sm:scroll-mt-28">Explore campus events</h2><p className="mt-1 text-sm text-slate-500">Upcoming and ongoing events, all in one place.</p></div>
      <div className="mb-6 flex flex-col-reverse justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by event status">{filters.map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('status', value); next.delete('page'); return next; })} className={`rounded-full border px-4 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 sm:text-sm ${status === value ? 'border-nu-navy bg-nu-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>{label}</button>)}</div>
        <SearchInput search={search} onSearch={onSearch} />
      </div>
      <EventListing page={page} search={search} status={status} onClear={() => setParams({})} returnTo={`/home?${params.toString()}`} onPageChange={onPageChange} />
    </section>
  </>;
}
