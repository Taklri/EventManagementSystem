import { Link } from 'react-router-dom';
import { formatEventDate, formatEventSchedule, organizerName } from '../lib/eventFormatting';
import EventStatus from './EventStatus';
export default function EventCard({ event, returnTo }) {
  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5">
    <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-slate-100 bg-[#edf0f7]" aria-hidden="true">
      <div className="absolute -right-6 -top-12 h-44 w-44 rounded-full border-[24px] border-white/55" /><div className="absolute -bottom-16 left-12 h-36 w-36 rounded-full border-[20px] border-white/45" />
      <div className="absolute left-5 top-5 rounded-xl bg-white px-3.5 py-2 text-center shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-widest text-nu-navy">{formatEventDate(event.startDate, { month: 'short', day: undefined, year: undefined })}</p><p className="text-2xl font-bold leading-tight">{formatEventDate(event.startDate, { month: undefined, day: 'numeric', year: undefined })}</p></div>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <div className="mb-3"><EventStatus status={event.status} /></div><h3 className="break-words text-lg font-semibold leading-snug">{event.title}</h3><p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-500">{event.description}</p>
      <dl className="mb-5 mt-4 space-y-2.5 text-xs leading-5 text-slate-600">
        <div><dt className="font-medium text-slate-500">Date and time</dt><dd>{formatEventSchedule(event.startDate, event.endDate)}</dd></div>
        <div><dt className="font-medium text-slate-500">Location</dt><dd className="break-words">{event.location}</dd></div>
        <div><dt className="font-medium text-slate-500">Organizer</dt><dd>{organizerName(event.organizer)}</dd></div>
      </dl>
      <Link to={`/events/${event._id}`} state={{ returnTo }} className="mt-auto flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-nu-navy transition hover:border-nu-navy hover:bg-nu-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2">View details<span className="sr-only"> for {event.title}</span></Link>
    </div>
  </article>;
}
