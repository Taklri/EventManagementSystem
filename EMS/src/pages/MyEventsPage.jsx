import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';
import { formatEventSchedule } from '../lib/eventFormatting';

const statusStyles = {
  registered: 'bg-emerald-50 text-emerald-700',
  waitlisted: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

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
    <div className="mx-auto max-w-5xl">
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
        <div role="status" className="mt-8 grid gap-4 sm:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-white" />
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {registrations.map(
            (registration) =>
              registration.event && (
                <article
                  key={registration._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        {registration.event.eventType || 'Other'}
                      </span>
                      <h2 className="mt-1 text-lg font-semibold">{registration.event.title}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[registration.status] || statusStyles.cancelled}`}
                    >
                      {registration.status}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div>
                      <dt className="sr-only">Schedule</dt>
                      <dd>
                        {formatEventSchedule(
                          registration.event.startDate,
                          registration.event.endDate,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Location</dt>
                      <dd>{registration.event.location}</dd>
                    </div>
                  </dl>
                  {registration.attendance && (
                    <p className="mt-3 text-xs font-medium text-emerald-700">
                      {registration.attendance.timeOut ? 'Attendance completed' : 'Checked in'}
                    </p>
                  )}
                  <Link
                    to={`/events/${registration.event._id}`}
                    className="mt-5 inline-flex text-sm font-semibold text-nu-navy underline"
                  >
                    View event
                  </Link>
                </article>
              ),
          )}
        </div>
      )}
    </div>
  );
};

export default MyEventsPage;
