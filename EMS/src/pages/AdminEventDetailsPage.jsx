import { useEffect, useState } from 'react';
import { Archive, ArrowLeft, MapPin, Pencil, QrCode, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  EventDetailsBody,
  EventDetailsHero,
  EventGuidanceList,
} from '../components/EventDetailsContent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { adminApi, eventsApi } from '../lib/api';

const ParticipationCard = ({
  event,
  registrationSummary,
  attendanceSummary,
  attendanceSession,
  attendanceError,
  openAttendanceSession,
}) => {
  if (event.registrationMode !== 'required') return null;

  return (
    <section
      aria-labelledby="participation-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(19,44,95,0.04)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="participation-heading"
            className="text-base font-semibold text-nu-dark sm:text-lg"
          >
            Participation
          </h2>
          <p className="mt-1 text-xs text-slate-500">Registration and attendance overview.</p>
        </div>
        <Button
          variant="outline"
          className="w-full @min-[520px]:w-auto"
          onClick={openAttendanceSession}
        >
          <QrCode size={15} aria-hidden="true" />
          Display QR
        </Button>
      </div>
      {registrationSummary && (
        <>
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
            {[
              ['Registered', registrationSummary.registered],
              ['Waitlisted', registrationSummary.waitlisted],
              ['Cancelled', registrationSummary.cancelled],
              ['Checked in', attendanceSummary?.checkedIn ?? 0],
              ['Present now', attendanceSummary?.currentlyPresent ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-nu-dark">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {registrationSummary.capacity
              ? `Capacity: ${registrationSummary.capacity} · `
              : 'Unlimited capacity · '}
            {attendanceSummary?.checkedOut ?? 0} checked out
          </p>
        </>
      )}
      {attendanceError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {attendanceError}
        </p>
      )}
      {attendanceSession && (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <QRCodeSVG
            value={`${window.location.origin}/attendance/${event._id}?token=${attendanceSession.token}`}
            size={180}
            includeMargin
          />
          <p className="text-center text-xs text-slate-500">
            Keep this code visible while students arrive and leave. It expires at the end of the
            event.
          </p>
        </div>
      )}
    </section>
  );
};

const AdminEventDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { accessToken } = useAuth();
  const returnTo =
    typeof location.state?.returnTo === 'string' &&
    /^\/admin\/events(?:\?|$)/.test(location.state.returnTo)
      ? location.state.returnTo
      : '/admin/events';
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [changingArchive, setChangingArchive] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registrationSummary, setRegistrationSummary] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [attendanceError, setAttendanceError] = useState('');

  useEffect(() => {
    let active = true;
    eventsApi
      .get(id, accessToken)
      .then((data) => {
        if (!active) return;
        setEvent(data.event);
        setError(null);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });
    return () => {
      active = false;
    };
  }, [id, attempt, accessToken]);

  useEffect(() => {
    if (!event || event.registrationMode !== 'required') return undefined;
    let active = true;
    Promise.all([
      adminApi.registrationSummary(id, accessToken),
      adminApi.attendanceSummary(id, accessToken),
    ])
      .then(([registration, attendance]) => {
        if (!active) return;
        setRegistrationSummary(registration.registration);
        setAttendanceSummary(attendance.attendance);
      })
      .catch(() => {
        if (active) setAttendanceError('Unable to load registration and attendance totals.');
      });
    return () => {
      active = false;
    };
  }, [event, id, accessToken]);

  const openAttendanceSession = async () => {
    setAttendanceError('');
    try {
      const result = await adminApi.createAttendanceSession(id, accessToken);
      setAttendanceSession(result);
    } catch (requestError) {
      setAttendanceError(requestError.message || 'Unable to create an attendance code.');
    }
  };

  const changeArchive = async (clickEvent) => {
    clickEvent.preventDefault();
    const restoring = event.isArchived;
    setChangingArchive(true);
    setArchiveError('');
    try {
      const result = restoring
        ? await adminApi.unarchiveEvent(id, accessToken)
        : await adminApi.archiveEvent(id, accessToken);
      setEvent(result.event);
      setDialogOpen(false);
      toast.success(restoring ? 'Event unarchived successfully.' : 'Event archived successfully.');
    } catch (requestError) {
      setArchiveError(
        requestError.status === 403
          ? `Your account cannot ${restoring ? 'unarchive' : 'archive'} events.`
          : requestError.status === 401
            ? 'Your session has expired. Please sign in again.'
            : requestError.message ||
              `Unable to ${restoring ? 'unarchive' : 'archive'} this event. Please try again.`,
      );
    } finally {
      setChangingArchive(false);
    }
  };

  return (
    <div className="@container mx-auto w-full min-w-0 max-w-6xl space-y-5 sm:space-y-6">
      {error ? (
        <section
          role="alert"
          className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_10px_30px_rgba(19,44,95,0.04)]"
        >
          <h1 className="text-xl font-semibold text-nu-dark">
            {error.status === 404 || error.status === 400
              ? 'Event not found'
              : 'Unable to load event'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error.status === 404 || error.status === 400
              ? 'This event is no longer available.'
              : 'Please try again.'}
          </p>
          {error.status !== 404 && error.status !== 400 && (
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => {
                setError(null);
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </Button>
          )}
        </section>
      ) : !event ? (
        <section
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-[0_10px_30px_rgba(19,44,95,0.04)]"
        >
          Loading event details…
        </section>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Link
              to={returnTo}
              className="inline-flex items-center gap-1.5 font-medium transition hover:text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Events
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-400">Event details</span>
          </div>

          <EventDetailsHero event={event} />

          <div className="grid items-start gap-5 @min-[880px]:grid-cols-[minmax(0,1fr)_300px] @min-[1040px]:grid-cols-[minmax(0,1fr)_320px]">
            <EventDetailsBody event={event} />
            <aside className="min-w-0 space-y-5">
              <section
                aria-labelledby="actions-heading"
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(19,44,95,0.04)] sm:p-6"
              >
                <h2 id="actions-heading" className="sr-only">
                  Event actions
                </h2>
                <div className="flex flex-col gap-2">
                  {!event.isArchived && (
                    <Button asChild className="w-full justify-center">
                      <Link to={`/admin/events/${id}/edit`} state={{ returnTo }}>
                        <Pencil size={15} aria-hidden="true" />
                        Edit event
                      </Link>
                    </Button>
                  )}
                  <AlertDialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setArchiveError('');
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-center ${event.isArchived ? '' : 'border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50'}`}
                      >
                        {event.isArchived ? (
                          <RotateCcw size={15} aria-hidden="true" />
                        ) : (
                          <Archive size={15} aria-hidden="true" />
                        )}
                        {event.isArchived ? 'Unarchive event' : 'Archive event'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>
                        {event.isArchived ? 'Unarchive this event?' : 'Archive this event?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {event.isArchived
                          ? 'This event will return to the active event list and can be edited again.'
                          : 'This event will leave the active event list and remain available in the admin archive.'}
                      </AlertDialogDescription>
                      {archiveError && (
                        <p role="alert" className="mt-4 text-sm text-red-700">
                          {archiveError}
                        </p>
                      )}
                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <AlertDialogCancel asChild>
                          <Button variant="outline" disabled={changingArchive}>
                            Cancel
                          </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            onClick={changeArchive}
                            disabled={changingArchive}
                            className={event.isArchived ? undefined : 'bg-red-700 hover:bg-red-800'}
                          >
                            {changingArchive
                              ? event.isArchived
                                ? 'Unarchiving…'
                                : 'Archiving…'
                              : event.isArchived
                                ? 'Unarchive event'
                                : 'Archive event'}
                          </Button>
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </section>

              <section
                aria-labelledby="guidance-heading"
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(19,44,95,0.04)] sm:p-6"
              >
                <h2
                  id="guidance-heading"
                  className="text-base font-semibold text-nu-dark sm:text-lg"
                >
                  Venue & reminders
                </h2>
                <div className="mt-4 flex items-start gap-3 border-b border-slate-100 pb-4">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-nu-navy" aria-hidden="true" />
                  <p className="min-w-0 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                    {event.location}
                  </p>
                </div>
                <div className="mt-4 space-y-5">
                  <EventGuidanceList
                    title="Requirements"
                    items={event.requirements}
                    emptyMessage="No requirements added."
                  />
                  <EventGuidanceList
                    title="Reminders"
                    items={event.reminders}
                    emptyMessage="No reminders added."
                  />
                </div>
              </section>
            </aside>
          </div>

          <ParticipationCard
            event={event}
            registrationSummary={registrationSummary}
            attendanceSummary={attendanceSummary}
            attendanceSession={attendanceSession}
            attendanceError={attendanceError}
            openAttendanceSession={openAttendanceSession}
          />
        </>
      )}
    </div>
  );
};

export default AdminEventDetailsPage;
