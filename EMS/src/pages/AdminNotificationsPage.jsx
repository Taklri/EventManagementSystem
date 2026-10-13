import NotificationList from '../components/NotificationList';

export default function AdminNotificationsPage() {
  return (
    <NotificationList
      title="Notifications"
      description="Registrations, cancellations, and attendance for campus events."
      emptyText="Student registrations and attendance will show up here."
      eventPath="/admin/events"
      changeEvent="admin-notifications-changed"
      titleClassName="text-2xl font-bold tracking-tight sm:text-3xl"
    />
  );
}
