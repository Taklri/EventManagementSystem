import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import {
  EventDetailsBody,
  EventDetailsHero,
  EventGuidanceList,
} from '../components/EventDetailsContent';
import { EventError } from '../components/EventFeedback';
import { eventsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const attendanceTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not submitted yet';

const AttendanceProofSection = ({ attendance }) => (
  <section
    aria-labelledby="attendance-proof-heading"
    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
  >
    <div>
      <h2 id="attendance-proof-heading" className="text-lg font-semibold text-nu-dark">
        Attendance
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Your submitted proof photos and the official time recorded by the system.
      </p>
    </div>
    <div className="mt-5 grid gap-4 @min-[640px]:grid-cols-2">
      {[
        ['Time in', attendance?.timeIn, attendance?.timeInPhotoUrl],
        ['Time out', attendance?.timeOut, attendance?.timeOutPhotoUrl],
      ].map(([label, time, photo]) => (
        <article key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="text-sm font-semibold text-nu-dark">{label}</h3>
          <p className="mt-2 text-xs text-slate-600">{attendanceTime(time)}</p>
          {photo ? (
            <a
              href={photo}
              target="_blank"
              rel="noreferrer"
              className="group mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
            >
              <img
                src={photo}
                alt={`${label} attendance proof`}
                className="h-40 w-full object-cover transition group-hover:opacity-90"
              />
              <span className="block px-3 py-2 text-xs font-semibold text-nu-navy">
                View submitted photo
              </span>
            </a>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-500">
              No proof photo submitted.
            </p>
          )}
        </article>
      ))}
    </div>
  </section>
);

const EventDetails = ({ id, returnTo, accessToken }) => {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState(null);
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
        setAttendance(registrationData.attendance || null);
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

  const cancelRegistration = async () => {
    setRegistrationPending(true);
    setRegistrationError('');
    const previousStatus = registration?.status;
    try {
      const result = await eventsApi.cancelRegistration(id, accessToken);
      setRegistration(result.registration);
      setCapacityState((current) => {
        const change = previousStatus === 'registered' ? -1 : 0;
        const registeredCount = Math.max(0, current.registeredCount + change);
        return {
          ...current,
          registeredCount,
          isFull: Boolean(current.capacity && registeredCount >= current.capacity),
        };
      });
      toast.success('Registration cancelled.');
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
    <div className="@container space-y-5 sm:space-y-6">
      <EventDetailsHero event={event} />
      <div className="grid items-start gap-5 @min-[880px]:grid-cols-[minmax(0,1fr)_300px] @min-[1040px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 @min-[880px]:order-1">
          <EventDetailsBody event={event} />
        </div>
        <aside className="order-1 min-w-0 space-y-5 @min-[880px]:order-2">
          <section
            aria-labelledby="registration-heading"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            {event.registrationMode === 'required' && (
              <div className="min-w-0">
                <h2 id="registration-heading" className="text-base font-semibold text-nu-dark">
                  Registration
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {event.capacity
                    ? `Limited to ${event.capacity} registered students.`
                    : 'Registration is required for this event.'}
                </p>
                {capacityState.capacity && (
                  <p className="mt-1 text-xs text-slate-500">
                    {capacityState.registeredCount} of {capacityState.capacity} places filled
                    {capacityState.isFull
                      ? ' · registration is full and will reopen if someone cancels'
                      : ''}.
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
                  event.isArchived || event.status !== 'Coming Soon' || capacityState.isFull ? (
                    <Button type="button" className="mt-4 w-full" disabled>
                      {capacityState.isFull ? 'Registration full' : 'Registration closed'}
                    </Button>
                  ) : (
                    <Button asChild className="mt-4 w-full">
                      <Link to={`/events/${id}/register`}>
                        Complete registration
                      </Link>
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={
                      registrationPending || event.isArchived || event.status !== 'Coming Soon'
                    }
                    onClick={cancelRegistration}
                  >
                    {registrationPending ? 'Saving…' : 'Cancel registration'}
                  </Button>
                )}
                {registration?.submittedAt && registration.status !== 'cancelled' && (
                  <Link to={`/events/${id}/register`} className="mt-3 inline-flex text-xs font-semibold text-nu-navy underline">
                    View submitted answers
                  </Link>
                )}
                {registrationError && (
                  <p role="alert" className="mt-3 text-xs text-red-700">
                    {registrationError}
                  </p>
                )}
                {registration?.status === 'registered' && (
                  <>
                    {attendance?.timeOut ? (
                      <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                        Attendance complete. Your time in and time out are saved.
                      </p>
                    ) : !attendance?.timeIn && event.status === 'Coming Soon' ? (
                      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs leading-5 text-slate-600">
                        Time in opens when the event starts on {attendanceTime(event.startDate)}.
                      </p>
                    ) : !attendance?.timeIn && event.status !== 'Ongoing' ? (
                      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs leading-5 text-slate-600">
                        Time in is closed for this event.
                      </p>
                    ) : (
                      <Button asChild className="mt-4 w-full">
                        <Link to={`/attendance/${id}`}>
                          <Camera size={16} aria-hidden="true" />
                          {attendance?.timeIn ? 'Time out' : 'Time in'} with camera
                        </Link>
                      </Button>
                    )}
                    {attendance?.timeIn && !attendance?.timeOut && (
                      <p className="mt-3 text-center text-xs text-slate-500">
                        Time in is saved. Submit one more camera photo when you leave to record time out.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {event.registrationMode !== 'required' && (
              <div className="min-w-0">
                <h2 id="registration-heading" className="text-base font-semibold text-nu-dark">
                  Open event
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  No registration is required for this event.
                </p>
              </div>
            )}
            {event.registrationMode === 'required' && event.status !== 'Coming Soon' && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Registration and cancellation close when the event starts.
              </p>
            )}
          </section>
          <section
            aria-labelledby="venue-heading"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 id="venue-heading" className="text-base font-semibold text-nu-dark">
              Venue & reminders
            </h2>
            <div className="mt-4 flex items-start gap-3 border-b border-slate-100 pb-4">
              <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-nu-navy" />
              <p className="min-w-0 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {event.location}
              </p>
            </div>
            <div className="mt-4 space-y-5">
              <EventGuidanceList
                title="Requirements"
                items={event.requirements}
                emptyMessage="No special requirements."
              />
              <EventGuidanceList
                title="Reminders"
                items={event.reminders}
                emptyMessage="No additional reminders."
              />
            </div>
          </section>
        </aside>
      </div>
      {event.registrationMode === 'required' && registration?.status === 'registered' && (
        <AttendanceProofSection attendance={attendance} />
      )}
    </div>
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
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <Link
        to={returnTo}
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg py-2 text-xs font-medium text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Events{' '}
        <span aria-hidden="true" className="px-1 text-slate-400">
          /
        </span>{' '}
        Event details
      </Link>
      <EventDetails key={id} id={id} returnTo={returnTo} accessToken={accessToken} />
    </div>
  );
};

export default EventDetailsPage;
