import NotificationList from '../components/NotificationList';

const studentNotificationPath = (notification) => {
  if (notification.type === 'attendance') return `/attendance/${notification.event}`;
  if (
    notification.type === 'registered'
    || notification.type === 'waitlisted'
    || notification.type === 'registration_cancelled'
  ) {
    return `/events/${notification.event}/register`;
  }
  return `/events/${notification.event}`;
};

export default function NotificationsPage() {
  return (
    <NotificationList
      eyebrow="Your inbox"
      title="Notifications"
      description="Updates about new events, your registrations, and attendance."
      emptyText="New events and updates about your registrations will show up here."
      destination={studentNotificationPath}
      changeEvent="student-notifications-changed"
    />
  );
}
