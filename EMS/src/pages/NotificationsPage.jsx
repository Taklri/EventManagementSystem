import { useEffect, useState } from 'react';
import { Bell, CalendarPlus, CheckCheck, ClipboardCheck, Ticket, UserRoundX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';

const typeIcons = {
  event_created: CalendarPlus,
  registered: Ticket,
  waitlisted: Ticket,
  registration_cancelled: UserRoundX,
  attendance: ClipboardCheck,
};

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
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
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
        <div role="status" className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : state.error && notifications.length === 0 ? (
        <section role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {state.error}
        </section>
      ) : notifications.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Bell className="mx-auto text-slate-400" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No notifications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            New events and updates about your registrations will show up here.
          </p>
        </section>
      ) : (
        <ul className="mt-8 space-y-3">
          {state.error && (
            <li role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </li>
          )}
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const unread = !notification.readAt;
            return (
              <li key={notification._id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  disabled={openingId === notification._id}
                  className={`flex w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left transition hover:border-nu-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy disabled:opacity-70 ${unread ? 'border-nu-navy/20' : 'border-slate-200'}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-nu-navy">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-nu-dark">{notification.title}</span>
                      {unread && (
                        <span className="rounded-full bg-nu-navy px-2 py-0.5 text-[11px] font-semibold text-white">
                          Unread
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.message}</span>
                    <span className="mt-2 block text-xs text-slate-500">
                      <time dateTime={notification.createdAt}>{formatTime(notification.createdAt)}</time>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
