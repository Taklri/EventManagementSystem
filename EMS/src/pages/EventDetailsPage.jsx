import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import EventStatus from '../components/EventStatus';
import { EventError } from '../components/EventFeedback';
import { eventsApi } from '../lib/api';
import { formatEventSchedule, organizerName } from '../lib/eventFormatting';

function EventDetails({ id, returnTo }) {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    eventsApi.get(id).then((data) => { if (active) setEvent(data.event); }).catch((requestError) => { if (active) setError(requestError); });
    return () => { active = false; };
  }, [id, attempt]);
  if (error?.status === 404 || error?.status === 400) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h1 className="text-xl font-semibold">Event not found</h1><p className="mt-3 text-sm text-slate-500">This event may no longer be available.</p><Link to={returnTo} className="mt-5 inline-block rounded-lg p-2 font-semibold text-nu-navy underline">Back to events</Link></div>;
  if (error) return <EventError message={error.message} onRetry={() => { setError(null); setAttempt((value) => value + 1); }} />;
  if (!event) return <div role="status" className="min-h-96 rounded-2xl border border-slate-200 bg-white p-8"><span className="sr-only">Loading event details…</span><div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse"><div className="h-12 w-2/3 rounded bg-slate-100" /><div className="h-24 rounded bg-slate-100" /><div className="h-36 rounded bg-slate-100" /></div></div>;
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="border-b border-slate-200 bg-[#edf0f7] px-6 py-10 sm:px-10 sm:py-12"><EventStatus status={event.status} />{event.isArchived && <span className="ml-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">Archived</span>}<h1 className="mt-4 max-w-3xl break-words text-3xl font-bold leading-tight sm:text-4xl">{event.title}</h1></header>
    <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr]">
      <section aria-labelledby="about-event"><h2 id="about-event" className="text-xl font-semibold">About this event</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{event.description}</p></section>
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-6"><h2 className="font-semibold">Event information</h2><dl className="mt-5 space-y-6 text-sm">
        <div><dt className="font-medium">Date and time</dt><dd className="mt-2 text-slate-500">{formatEventSchedule(event.startDate, event.endDate)}<span className="mt-1 block text-xs">Philippine Standard Time (UTC+8)</span></dd></div>
        <div><dt className="font-medium">Location</dt><dd className="mt-2 break-words text-slate-500">{event.location}</dd></div>
        <div><dt className="font-medium">Organizer</dt><dd className="mt-2 text-slate-500">{organizerName(event.organizer)}</dd></div>
      </dl></aside>
    </div>
  </article>;
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const requestedReturn = location.state?.returnTo;
  const returnTo = typeof requestedReturn === 'string' && /^\/home(?:\?|$)/.test(requestedReturn) ? requestedReturn : '/home';
  return <><Link to={returnTo} className="mb-6 inline-flex items-center rounded-lg py-2 text-sm font-semibold text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy">Back to events</Link><EventDetails key={id} id={id} returnTo={returnTo} /></>;
}
