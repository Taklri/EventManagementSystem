import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import EventStatus from '../components/EventStatus';
import { EventError } from '../components/EventFeedback';
import { eventsApi } from '../lib/api';
import { formatEventSchedule, organizerName } from '../lib/eventFormatting';
import { useAuth } from '../context/AuthContext';

const EventDetails = ({ id, returnTo, accessToken }) => {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [registration, setRegistration] = useState(null);
  const [capacityState, setCapacityState] = useState({
    capacity: null,
    registeredCount: 0,
    isFull: false,
  });
  const [registrationError, setRegistrationError] = useState('');
  const [registrationPending, setRegistrationPending] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([eventsApi.get(id, accessToken), eventsApi.registration(id, accessToken)])
      .then(([eventData, registrationData]) => {
        if (!active) return;
        setEvent(eventData.event);
        setRegistration(registrationData.registration);
        setCapacityState({
          capacity: registrationData.capacity || null,
          registeredCount: registrationData.registeredCount || 0,
          isFull: Boolean(registrationData.isFull),
        });
        setError(null);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });
    return () => {
      active = false;
    };
  }, [id, attempt, accessToken]);

  const changeRegistration = async (action) => {
    setRegistrationPending(true);
    setRegistrationError('');
    const previousStatus = registration?.status;
    try {
      const result =
        action === 'register'
          ? await eventsApi.register(id, accessToken)
          : await eventsApi.cancelRegistration(id, accessToken);
      setRegistration(result.registration);
      setCapacityState((current) => {
        const change =
          action === 'register' && result.registration?.status === 'registered'
            ? 1
            : action === 'cancel' && previousStatus === 'registered'
              ? -1
              : 0;
        const registeredCount = Math.max(0, current.registeredCount + change);
        return {
          ...current,
          registeredCount,
          isFull: Boolean(current.capacity && registeredCount >= current.capacity),
        };
      });
      toast.success(action === 'register' ? 'Registration saved.' : 'Registration cancelled.');
    } catch (requestError) {
      setRegistrationError(requestError.message || 'Unable to update your registration.');
    } finally {
      setRegistrationPending(false);
    }
  };
  if (error?.status === 404 || error?.status === 400)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <h1 className="text-xl font-semibold">Event not found</h1>
        <p className="mt-3 text-sm text-slate-500">This event may no longer be available.</p>
        <Link
          to={returnTo}
          className="mt-5 inline-block rounded-lg p-2 font-semibold text-nu-navy underline"
        >
          Back to events
        </Link>
      </div>
    );
  if (error)
    return (
      <EventError
        message={error.message}
        onRetry={() => {
          setError(null);
          setAttempt((value) => value + 1);
        }}
      />
    );
  if (!event)
    return (
      <div role="status" className="min-h-96 rounded-2xl border border-slate-200 bg-white p-8">
        <span className="sr-only">Loading event details…</span>
        <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
          <div className="h-12 w-2/3 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-36 rounded bg-slate-100" />
        </div>
      </div>
    );
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt={`Cover for ${event.title}`}
          className="aspect-[16/6] w-full object-cover"
        />
      )}
      <header className="border-b border-slate-200 bg-[#edf0f7] px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-nu-navy">
            {event.eventType || 'Other'}
          </span>
          <EventStatus status={event.status} />
        </div>
        {event.isArchived && (
          <span className="ml-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">
            Archived
          </span>
        )}
        <h1 className="mt-4 max-w-3xl break-words text-3xl font-bold leading-tight sm:text-4xl">
          {event.title}
        </h1>
      </header>
      <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="about-event">
          <h2 id="about-event" className="text-xl font-semibold">
            About this event
          </h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {event.description}
          </p>
        </section>
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold">Event information</h2>
          <dl className="mt-5 space-y-6 text-sm">
            <div>
              <dt className="font-medium">Date and time</dt>
              <dd className="mt-2 text-slate-500">
                {formatEventSchedule(event.startDate, event.endDate)}
                <span className="mt-1 block text-xs">Philippine Standard Time (UTC+8)</span>
              </dd>
            </div>
            <div>
              <dt className="font-medium">Location</dt>
              <dd className="mt-2 break-words text-slate-500">{event.location}</dd>
            </div>
            <div>
              <dt className="font-medium">Organizer</dt>
              <dd className="mt-2 text-slate-500">{organizerName(event)}</dd>
            </div>
          </dl>
          {event.registrationMode === 'required' && (
            <div className="mt-7 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-nu-dark">Registration</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {event.capacity
                  ? `Limited to ${event.capacity} registered students.`
                  : 'Registration is required for this event.'}
              </p>
              {capacityState.capacity && (
                <p className="mt-1 text-xs text-slate-500">
                  {capacityState.registeredCount} of {capacityState.capacity} places filled
                  {capacityState.isFull ? ' · new registrations join the waitlist' : ''}.
                </p>
              )}
              {registration?.status === 'registered' && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">You are registered.</p>
              )}
              {registration?.status === 'waitlisted' && (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  You are on the waitlist.
                </p>
              )}
              {registration?.status === 'cancelled' && (
                <p className="mt-3 text-sm text-slate-600">
                  Your previous registration was cancelled.
                </p>
              )}
              {!registration || registration.status === 'cancelled' ? (
                <Button
                  type="button"
                  className="mt-4 w-full"
                  disabled={registrationPending || event.isArchived || event.status === 'Ended'}
                  onClick={() => changeRegistration('register')}
                >
                  {registrationPending ? 'Saving…' : 'Register for event'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={registrationPending || event.isArchived || event.status === 'Ended'}
                  onClick={() => changeRegistration('cancel')}
                >
                  {registrationPending ? 'Saving…' : 'Cancel registration'}
                </Button>
              )}
              {registrationError && (
                <p role="alert" className="mt-3 text-xs text-red-700">
                  {registrationError}
                </p>
              )}
              {registration?.status === 'registered' && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Scan the event QR code while you are signed in to record attendance.
                </p>
              )}
            </div>
          )}
          {event.registrationMode !== 'required' && (
            <div className="mt-7 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-nu-dark">Participation</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                No registration is required for this event.
              </p>
            </div>
          )}
        </aside>
      </div>
      {(event.tags?.length > 0 ||
        event.agenda?.length > 0 ||
        event.speakers?.length > 0 ||
        event.requirements?.length > 0 ||
        event.reminders?.length > 0) && (
        <div className="grid gap-8 border-t border-slate-200 p-6 sm:p-10 lg:grid-cols-2">
          {event.tags?.length > 0 && (
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {event.agenda?.length > 0 && (
            <section aria-labelledby="agenda-heading">
              <h2 id="agenda-heading" className="text-xl font-semibold">
                Program agenda
              </h2>
              <div className="mt-5 space-y-4">
                {event.agenda
                  .slice()
                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                  .map((item) => (
                    <div
                      key={item._id || `${item.title}-${item.startDate}`}
                      className="border-l-2 border-nu-navy/20 pl-4"
                    >
                      <p className="text-xs font-semibold text-nu-navy">
                        {formatEventSchedule(item.startDate, item.endDate)}
                      </p>
                      <h3 className="mt-1 font-semibold">{item.title}</h3>
                      {item.description && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}
          {event.speakers?.length > 0 && (
            <section aria-labelledby="speakers-heading">
              <h2 id="speakers-heading" className="text-xl font-semibold">
                Speakers
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {event.speakers.map((speaker) => (
                  <div
                    key={speaker.clientKey || speaker._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    {speaker.photoUrl ? (
                      <img
                        src={speaker.photoUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500">
                        {speaker.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{speaker.name}</p>
                      <p className="text-xs text-slate-500">{speaker.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {event.requirements?.length > 0 && (
            <section aria-labelledby="requirements-heading">
              <h2 id="requirements-heading" className="text-xl font-semibold">
                Requirements
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                {event.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {event.reminders?.length > 0 && (
            <section aria-labelledby="reminders-heading">
              <h2 id="reminders-heading" className="text-xl font-semibold">
                Reminders
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                {event.reminders.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
};

const EventDetailsPage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const location = useLocation();
  const requestedReturn = location.state?.returnTo;
  const returnTo =
    typeof requestedReturn === 'string' && /^\/home(?:\?|$)/.test(requestedReturn)
      ? requestedReturn
      : '/home';
  return (
    <>
      <Link
        to={returnTo}
        className="mb-6 inline-flex items-center rounded-lg py-2 text-sm font-semibold text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        Back to events
      </Link>
      <EventDetails key={id} id={id} returnTo={returnTo} accessToken={accessToken} />
    </>
  );
};

export default EventDetailsPage;
