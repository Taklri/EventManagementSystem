import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';
import { formatEventDate, formatEventSchedule, organizerName } from '../lib/eventFormatting';
import EventStatus from '../components/EventStatus';

const statusStyles = {
  registered: 'bg-emerald-50 text-emerald-700',
  waitlisted: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

const attendanceTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

const MyEventsPage = () => {
  const { accessToken } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;
    eventsApi
      .myRegistrations(accessToken)
      .then((data) => {
        if (active) {
          setRegistrations(data.registrations || []);
          setState({ loading: false, error: '' });
        }
      })
      .catch((error) => {
        if (active)
          setState({ loading: false, error: error.message || 'Unable to load your events.' });
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Your registrations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">My events</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Keep track of the campus events you joined.
        </p>
      </header>
      {state.loading ? (
        <div role="status" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="h-36 animate-pulse bg-slate-200/60" />
              <div className="space-y-4 p-5">
                <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="h-20 animate-pulse rounded bg-slate-100" />
                <div className="h-10 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : state.error ? (
        <section
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
        >
          {state.error}
        </section>
      ) : registrations.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <CalendarDays className="mx-auto text-slate-400" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No registrations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Browse campus events and register for the moments you want to attend.
          </p>
          <Link
            to="/home"
            className="mt-6 inline-flex rounded-lg bg-nu-navy px-5 py-3 text-sm font-semibold text-white"
          >
            Explore events
          </Link>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {registrations.map(
            (registration) => {
              const event = registration.event;
              if (!event) return null;
              return (
                <article
                  key={registration._id}
                  className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5"
                >
                  <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-slate-100 bg-[#edf0f7]">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={`Cover for ${event.title}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div aria-hidden="true" className="absolute inset-0">
                        <div className="absolute -right-6 -top-12 h-44 w-44 rounded-full border-[24px] border-white/55" />
                        <div className="absolute -bottom-16 left-12 h-36 w-36 rounded-full border-[20px] border-white/45" />
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="absolute left-5 top-5 rounded-xl bg-white px-3.5 py-2 text-center shadow-sm"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-nu-navy">
                        {formatEventDate(event.startDate, {
                          month: 'short',
                          day: undefined,
                          year: undefined,
                        })}
                      </p>
                      <p className="text-2xl font-bold leading-tight">
                        {formatEventDate(event.startDate, {
                          month: undefined,
                          day: 'numeric',
                          year: undefined,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {event.eventType || 'Other'}
                      </span>
                      <EventStatus status={event.status} />
                      {registration.status !== 'registered' && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[registration.status] || statusStyles.cancelled}`}
                        >
                          {registration.status}
                        </span>
                      )}
                    </div>
                    <h2 className="break-words text-lg font-semibold leading-snug">{event.title}</h2>
                    <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-500">
                      {event.description}
                    </p>
                    <dl className="mb-5 mt-4 space-y-2.5 text-xs leading-5 text-slate-600">
                      <div>
                        <dt className="font-medium text-slate-500">Date and time</dt>
                        <dd>{formatEventSchedule(event.startDate, event.endDate)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Location</dt>
                        <dd className="break-words">{event.location}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Organizer</dt>
                        <dd className="break-words">{organizerName(event)}</dd>
                      </div>
                    </dl>
                    {registration.attendance?.timeIn && (
                      <div className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <p className="font-semibold">
                          {registration.attendance.timeOut ? 'Attendance completed' : 'Timed in'}
                        </p>
                        <p>Time in: {attendanceTime(registration.attendance.timeIn)}</p>
                        {registration.attendance.timeOut && (
                          <p>Time out: {attendanceTime(registration.attendance.timeOut)}</p>
                        )}
                      </div>
                    )}
                    <Link
                      to={`/events/${event._id}`}
                      state={{ returnTo: '/my-events' }}
                      className="mt-auto flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-nu-navy transition hover:border-nu-navy hover:bg-nu-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
                    >
                      View details<span className="sr-only"> for {event.title}</span>
                    </Link>
                    {registration.submittedAt && (
                      <Link
                        to={`/events/${event._id}/register`}
                        className="mt-3 text-center text-xs font-semibold text-nu-navy underline underline-offset-2"
                      >
                        View submitted form
                      </Link>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );
};

export default MyEventsPage;
