import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { eventsApi } from '../lib/api';
import AdminEventCreatePage from './AdminEventCreatePage';
import { useAuth } from '../context/AuthContext';

const AdminEventEditPage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === 'string' &&
    /^\/admin\/events(?:\?|$)/.test(location.state.returnTo)
      ? location.state.returnTo
      : '/admin/events';
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

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

  if (error) {
    return (
      <section
        role="alert"
        className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center"
      >
        <h1 className="text-xl font-semibold">
          {error.status === 404 || error.status === 400
            ? 'Event not found'
            : 'Unable to load event'}
        </h1>
        {error.status !== 404 && error.status !== 400 && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </Button>
        )}
        <Link to="/admin/events" className="mt-4 block text-sm font-medium text-nu-navy underline">
          Back to Event Management
        </Link>
      </section>
    );
  }
  if (!event)
    return (
      <div role="status" className="mx-auto max-w-4xl p-6 text-sm text-slate-500">
        Loading event…
      </div>
    );
  if (event.isArchived) {
    return (
      <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Archived events cannot be edited</h1>
        <Link
          to={`/admin/events/${id}`}
          className="mt-4 inline-block text-sm font-medium text-nu-navy underline"
        >
          Back to event details
        </Link>
      </section>
    );
  }
  return <AdminEventCreatePage key={event._id} event={event} returnTo={returnTo} />;
};

export default AdminEventEditPage;
