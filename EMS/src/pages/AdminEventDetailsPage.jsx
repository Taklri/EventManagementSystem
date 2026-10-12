import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import EventStatus from '../components/EventStatus';
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
import { formatEventSchedule, organizerName } from '../lib/eventFormatting';

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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={returnTo}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Event Management
        </Link>
        {event && !error && (
          <div className="flex items-center gap-2">
            {!event.isArchived && (
              <Button asChild variant="outline">
                <Link to={`/admin/events/${id}/edit`} state={{ returnTo }}>
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
                  className={
                    event.isArchived
                      ? undefined
                      : 'border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50'
                  }
                >
                  {event.isArchived ? 'Unarchive event' : 'Archive event'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>
                  {event.isArchived ? 'Unarchive this event?' : 'Archive this event?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {event.isArchived
                    ? 'This event will return to the non-archived event list and can be edited again.'
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
        )}
      </div>

      {error ? (
        <section
          role="alert"
          className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center"
        >
          <h1 className="text-xl font-semibold">
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
          className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        >
          Loading event details…
        </section>
      ) : (
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
            <div className="aspect-[16/10] bg-slate-100 lg:h-full lg:min-h-[330px] lg:aspect-auto">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={`Cover for ${event.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                  No cover image available
                </div>
              )}
            </div>
            <header className="flex min-w-0 flex-col justify-between gap-7 p-6 sm:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-nu-navy">
                    {event.eventType || 'Other'}
                  </span>
                  {event.isArchived ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Archived
                    </span>
                  ) : (
                    <EventStatus status={event.status} />
                  )}
                </div>
                <h1 className="mt-4 break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  {event.title}
                </h1>
                <p className="mt-3 text-sm text-slate-500">Hosted by {organizerName(event)}</p>
              </div>
              <dl className="grid gap-5 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">Date and time</dt>
                  <dd className="mt-1 font-medium text-nu-dark">
                    {formatEventSchedule(event.startDate, event.endDate)}
                  </dd>
                  <dd className="mt-1 text-xs text-slate-500">Philippine Standard Time (UTC+8)</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">Location</dt>
                  <dd className="mt-1 break-words font-medium text-nu-dark">{event.location}</dd>
                </div>
              </dl>
            </header>
          </div>
          <section aria-labelledby="about-event" className="border-t border-slate-200 p-6 sm:p-8">
            <h2 id="about-event" className="text-lg font-semibold">
              About this event
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {event.description}
            </p>
          </section>
          {(event.tags?.length > 0 ||
            event.agenda?.length > 0 ||
            event.speakers?.length > 0 ||
            event.requirements?.length > 0 ||
            event.reminders?.length > 0) && (
            <section className="grid gap-8 border-t border-slate-200 p-6 sm:p-8 lg:grid-cols-2">
              {event.tags?.length > 0 && (
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                <div>
                  <h2 className="text-lg font-semibold">Program agenda</h2>
                  <div className="mt-4 space-y-3">
                    {event.agenda
                      .slice()
                      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                      .map((item) => (
                        <div
                          key={item._id || item.title}
                          className="border-l-2 border-nu-navy/20 pl-3"
                        >
                          <p className="text-xs font-semibold text-nu-navy">
                            {formatEventSchedule(item.startDate, item.endDate)}
                          </p>
                          <p className="mt-1 text-sm font-semibold">{item.title}</p>
                          {item.description && (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {event.speakers?.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold">Speakers</h2>
                  <div className="mt-4 space-y-3">
                    {event.speakers.map((speaker) => (
                      <div
                        key={speaker.clientKey || speaker._id}
                        className="flex items-center gap-3"
                      >
                        {speaker.photoUrl ? (
                          <img
                            src={speaker.photoUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                            {speaker.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold">{speaker.name}</p>
                          <p className="text-xs text-slate-500">{speaker.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {event.requirements?.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold">Requirements</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {event.requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {event.reminders?.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold">Reminders</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {event.reminders.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          {event.registrationMode === 'required' && (
            <section
              aria-labelledby="participation-heading"
              className="border-t border-slate-200 p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="participation-heading" className="text-lg font-semibold">
                    Participation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Registration and attendance for this event.
                  </p>
                </div>
                <Button variant="outline" onClick={openAttendanceSession}>
                  <QrCode size={16} aria-hidden="true" />
                  Display attendance QR
                </Button>
              </div>
              {registrationSummary && (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Registered</p>
                      <p className="mt-1 text-2xl font-bold text-nu-dark">
                        {registrationSummary.registered}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Waitlisted</p>
                      <p className="mt-1 text-2xl font-bold text-nu-dark">
                        {registrationSummary.waitlisted}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Cancelled</p>
                      <p className="mt-1 text-2xl font-bold text-nu-dark">
                        {registrationSummary.cancelled}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Checked in</p>
                      <p className="mt-1 text-2xl font-bold text-nu-dark">
                        {attendanceSummary?.checkedIn ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Present now</p>
                      <p className="mt-1 text-2xl font-bold text-nu-dark">
                        {attendanceSummary?.currentlyPresent ?? 0}
                      </p>
                    </div>
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
                <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <QRCodeSVG
                    value={`${window.location.origin}/attendance/${id}?token=${attendanceSession.token}`}
                    size={190}
                    includeMargin
                  />
                  <p className="text-center text-xs text-slate-500">
                    Keep this code visible while students arrive and leave. It expires at the end of
                    the event.
                  </p>
                </div>
              )}
            </section>
          )}
        </article>
      )}
    </div>
  );
};

export default AdminEventDetailsPage;
