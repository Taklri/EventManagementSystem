import { useEffect, useState } from 'react';
import { CalendarDays, CheckCheck, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';
import { formatEventSchedule } from '../lib/eventFormatting';

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
};

export default function NotificationsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [state, setState] = useState({ loading: true, error: '' });
  const [openingId, setOpeningId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;
    notificationsApi
      .list(accessToken)
      .then((data) => {
        if (!active) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setState({ loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message || 'Unable to load notifications.' });
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function openNotification(notification) {
    if (openingId) return;
    setOpeningId(notification._id);
    try {
      if (!notification.readAt) {
        const result = await notificationsApi.markRead(notification._id, accessToken);
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, readAt: result.notification.readAt } : item,
          ),
        );
        setUnreadCount(result.unreadCount ?? 0);
        window.dispatchEvent(
          new CustomEvent('student-notifications-changed', { detail: { unreadCount: result.unreadCount ?? 0 } }),
        );
      }
      if (notification.event) navigate(`/events/${notification.event}`);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Unable to update notification.' }));
    } finally {
      setOpeningId('');
    }
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const result = await notificationsApi.markAllRead(accessToken);
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(result.unreadCount ?? 0);
      window.dispatchEvent(
        new CustomEvent('student-notifications-changed', { detail: { unreadCount: result.unreadCount ?? 0 } }),
      );
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Unable to update notifications.' }));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Your inbox</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Updates about new events, your registrations, and attendance.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0 || state.loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-nu-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCheck size={16} aria-hidden="true" />
          {markingAll ? 'Marking…' : 'Mark all as read'}
        </button>
      </header>

      {state.loading ? (
        <div role="status" className="mt-8 space-y-4">
          <span className="sr-only">Loading notifications…</span>
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse" />
          ))}
        </div>
      ) : state.error && notifications.length === 0 ? (
        <p role="alert" className="mt-8 text-sm text-red-800">{state.error}</p>
      ) : notifications.length === 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">No notifications yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            New events and updates about your registrations will show up here.
          </p>
        </section>
      ) : (
        <ul className="mt-8 space-y-4">
          {state.error && (
            <li role="alert" className="px-4 py-4 text-sm text-red-800 sm:px-6">{state.error}</li>
          )}
          {notifications.map((notification) => {
            const unread = !notification.readAt;
            const details = notification.eventDetails;
            return (
              <li key={notification._id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  disabled={openingId === notification._id}
                  className={`flex w-full flex-col gap-1 rounded-xl border-l-4 bg-white px-4 py-5 text-left shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-70 sm:px-6 ${unread ? 'border-nu-navy' : 'border-transparent'}`}
                >
                  <span className="flex items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`text-sm font-medium ${unread ? 'text-nu-navy' : 'text-slate-500'}`}>{notification.title}</span>
                      {unread && <span className="rounded-full bg-nu-navy px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
                    </span>
                    <time className="shrink-0 text-xs text-slate-400" dateTime={notification.createdAt}>
                      {formatTime(notification.createdAt)}
                    </time>
                  </span>
                  {details ? (
                    <>
                      <span className={`block text-base text-nu-dark ${unread ? 'font-bold' : 'font-semibold'}`}>{details.title}</span>
                      <span className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <CalendarDays size={14} className="mt-1 shrink-0" aria-hidden="true" />
                        {formatEventSchedule(details.startDate, details.endDate)}
                      </span>
                      {details.location && (
                        <span className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                          <MapPin size={14} className="mt-1 shrink-0" aria-hidden="true" />
                          {details.location}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="block text-sm leading-6 text-slate-600">{notification.message}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
