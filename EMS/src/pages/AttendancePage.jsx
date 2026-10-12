import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';

const AttendancePage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { accessToken } = useAuth();
  const token = params.get('token');
  const [state, setState] = useState(() =>
    token
      ? { loading: true, message: '', error: '' }
      : { loading: false, message: '', error: 'This attendance link is missing its code.' },
  );

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    let active = true;
    eventsApi
      .recordAttendance(id, accessToken, token)
      .then((data) => {
        if (active) setState({ loading: false, message: data.message, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            message: '',
            error: error.message || 'Unable to record attendance.',
          });
      });
    return () => {
      active = false;
    };
  }, [id, accessToken, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-nu-dark">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state.loading ? (
          <p role="status" className="text-sm text-slate-500">
            Verifying attendance…
          </p>
        ) : state.message ? (
          <>
            <CheckCircle2 className="mx-auto text-emerald-600" size={42} aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold">{state.message}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your attendance timestamp has been saved to this event.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Attendance could not be recorded</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
              {state.error}
            </p>
          </>
        )}
        <Link
          to={`/events/${id}`}
          className="mt-7 inline-flex text-sm font-semibold text-nu-navy underline"
        >
          Back to event
        </Link>
      </section>
    </main>
  );
};

export default AttendancePage;
