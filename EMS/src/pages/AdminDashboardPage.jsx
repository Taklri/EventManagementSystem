import { useEffect, useMemo, useState } from 'react';
import EventStatus from '../components/EventStatus';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';
import { formatEventSchedule, organizerName } from '../lib/eventFormatting';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PreviewLabel = () => {
  return (
    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
      Coming soon
    </span>
  );
};

const MetricCard = ({ label, value, note, preview = false }) => {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex min-h-6 flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {preview && <PreviewLabel />}
      </div>
      <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-tight text-nu-dark">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
};

const DashboardLoading = () => {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading admin dashboard…</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-32 rounded-xl border border-slate-200 bg-white p-5 motion-safe:animate-pulse"
          >
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="mt-6 h-8 w-1/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-56 rounded-xl border border-slate-200 bg-white motion-safe:animate-pulse"
      />
    </div>
  );
};

const EventOverview = ({ events, metrics }) => {
  const [search, setSearch] = useState('');
  const visibleEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.title} ${event.location}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
      ),
    [events, search],
  );

  return (
    <section
      id="event-overview"
      aria-labelledby="overview-heading"
      className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <h2 id="overview-heading" className="text-lg font-semibold">
            Event management overview
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Recently updated events · {metrics.ongoing} ongoing · {metrics.archived} archived
          </p>
        </div>
        {events.length > 0 && (
          <label className="block w-full sm:w-56">
            <span className="sr-only">Search recent events</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recent events"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/15"
            />
          </label>
        )}
      </div>
      {visibleEvents.length ? (
        <div className="divide-y divide-slate-100">
          {visibleEvents.map((event) => (
            <article
              key={event._id}
              className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{event.title}</h3>
                <p className="mt-1 truncate text-xs text-slate-500">{event.location}</p>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                {formatEventSchedule(event.startDate, event.endDate)}
              </p>
              <p className="truncate text-xs text-slate-600">{organizerName(event)}</p>
              <div className="lg:justify-self-end">
                <EventStatus status={event.status} showDot={false} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-nu-dark">
            {events.length ? 'No matching events' : 'No events yet'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
            {events.length
              ? 'Try another event title or location.'
              : 'Once an event is created, its details and status will appear here.'}
          </p>
        </div>
      )}
    </section>
  );
};

const AdminDashboardPage = () => {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!location.state?.eventCreated) return;

    toast.success('Event created successfully.', { id: 'event-created' });
    navigate('/admin', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    let active = true;
    adminApi
      .dashboard(accessToken)
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });
    return () => {
      active = false;
    };
  }, [accessToken, attempt]);

  useEffect(() => {
    if (data && location.hash === '#event-overview') {
      document.getElementById('event-overview')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data, location.hash]);

  const today = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user?.firstName || 'Administrator'}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here is what is happening across campus events.
          </p>
        </div>
        <Link
          to="/admin/events/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-nu-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
        >
          Create event
        </Link>
      </section>
      {error ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-100 bg-white px-6 py-12 text-center"
        >
          <h2 className="text-lg font-semibold">Dashboard unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            {error.status === 403
              ? 'You do not have permission to view this dashboard.'
              : error.status === 401
                ? 'Your session has expired. Please sign in again.'
                : 'We could not load current event information.'}
          </p>
          {error.status !== 403 && error.status !== 401 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAttempt((value) => value + 1);
              }}
              className="mt-5 rounded-lg bg-nu-navy px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
            >
              Try again
            </button>
          )}
        </section>
      ) : !data ? (
        <DashboardLoading />
      ) : (
        <>
          <section
            aria-label="Dashboard summary"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              label="Total events"
              value={data.metrics.total.toLocaleString()}
              note="Non-archived events"
            />
            <MetricCard
              label="Upcoming events"
              value={data.metrics.upcoming.toLocaleString()}
              note="Starting in the future"
            />
            <MetricCard
              label="Total registrations"
              value={data.metrics.registrations.toLocaleString()}
              note="Active registrations"
            />
            <MetricCard
              label="Attendees"
              value={data.metrics.attendees.toLocaleString()}
              note="Students checked in"
            />
          </section>
          <EventOverview events={data.recentEvents} metrics={data.metrics} />
        </>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <section
          aria-labelledby="recent-registrations-heading"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 id="recent-registrations-heading" className="text-lg font-semibold">
                Recent registrations
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Registration activity will be connected in a later phase.
              </p>
            </div>
            <PreviewLabel />
          </div>
          <div className="p-5">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
              <p className="text-sm font-medium text-slate-700">No registration data yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Student sign-ups and their event status will appear in this panel when available.
              </p>
            </div>
          </div>
        </section>
        <section
          aria-labelledby="activity-heading"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 id="activity-heading" className="text-lg font-semibold">
                Activity & announcements
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Campus updates will be connected in a later phase.
              </p>
            </div>
            <PreviewLabel />
          </div>
          <div className="p-5">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
              <p className="text-sm font-medium text-slate-700">No announcements yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Important event and campus updates will appear here when available.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
