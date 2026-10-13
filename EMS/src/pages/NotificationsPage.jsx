import NotificationList from '../components/NotificationList';

export default function NotificationsPage() {
  return (
    <NotificationList
      eyebrow="Your inbox"
      title="Notifications"
      description="Updates about new events, your registrations, and attendance."
      emptyText="New events and updates about your registrations will show up here."
      eventPath="/events"
      changeEvent="student-notifications-changed"
    />
  );
}
