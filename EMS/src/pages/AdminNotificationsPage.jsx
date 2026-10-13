import NotificationList from '../components/NotificationList';

const adminNotificationPath = (notification) => {
  const tab = notification.type === 'attendance'
    ? 'attendance'
    : notification.type === 'registered' || notification.type === 'waitlisted' || notification.type === 'registration_cancelled'
      ? 'registration'
      : '';
  return `/admin/events/${notification.event}${tab ? `?tab=${tab}` : ''}`;
};

export default function AdminNotificationsPage() {
  return (
    <NotificationList
      title="Notifications"
      description="Registrations, cancellations, and attendance for campus events."
      emptyText="Student registrations and attendance will show up here."
      destination={adminNotificationPath}
      changeEvent="admin-notifications-changed"
      titleClassName="text-2xl font-bold tracking-tight sm:text-3xl"
    />
  );
}
