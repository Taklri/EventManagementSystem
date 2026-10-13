import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';

const AttendancePage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { accessToken } = useAuth();
  const token = params.get('token');
  const [state, setState] = useState({
    loading: Boolean(token),
    saving: false,
    error: token ? '' : 'This attendance link is missing its code.',
    preview: null,
    result: null,
  });

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    eventsApi
      .previewAttendance(id, accessToken, token)
      .then((preview) => {
        if (active) setState({ loading: false, saving: false, error: '', preview, result: null });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            saving: false,
            error: error.message || 'Unable to verify attendance.',
            preview: null,
            result: null,
          });
      });
    return () => {
      active = false;
    };
  }, [id, accessToken, token]);

  const confirm = async () => {
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const result = await eventsApi.recordAttendance(id, accessToken, token);
      setState((current) => ({ ...current, saving: false, result, preview: null }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error.message || 'Unable to record attendance.',
      }));
    }
  };

  return (
    <div className="mx-auto flex min-h-[65vh] items-center justify-center px-1 py-8 text-nu-dark">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Event attendance
        </p>
        {state.loading ? (
          <p role="status" className="mt-5 text-sm text-slate-600">
            Checking your attendance status…
          </p>
        ) : state.result ? (
          <div aria-live="polite">
            <h1 className="mt-3 text-2xl font-bold">{state.result.message}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {state.result.attendance?.timeOut
                ? 'Your attendance is complete. Both times are saved and cannot be changed.'
                : 'Your time in is saved. Scan the event QR code again when you leave to record time out.'}
            </p>
          </div>
        ) : state.preview ? (
          <div>
            <h1 className="mt-3 text-2xl font-bold">
              Confirm {state.preview.action === 'timeIn' ? 'time in' : 'time out'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{state.preview.event.title}</p>
            <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Student</dt>
                <dd className="font-medium">{state.preview.identity.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">School ID</dt>
                <dd className="font-medium">{state.preview.identity.studentId}</dd>
              </div>
              {state.preview.attendance?.timeIn && (
                <div>
                  <dt className="text-xs text-slate-500">Time in</dt>
                  <dd className="font-medium">
                    {new Date(state.preview.attendance.timeIn).toLocaleString('en-PH', {
                      timeZone: 'Asia/Manila',
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Confirming saves this time permanently.
            </p>
            {state.error && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {state.error}
              </p>
            )}
            <Button type="button" className="mt-5 w-full" disabled={state.saving} onClick={confirm}>
              {state.saving
                ? 'Saving…'
                : `Confirm ${state.preview.action === 'timeIn' ? 'time in' : 'time out'}`}
            </Button>
          </div>
        ) : (
          <div>
            <h1 className="mt-3 text-2xl font-bold">Attendance unavailable</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-red-700">
              {state.error}
            </p>
          </div>
        )}
        <Link
          to={`/events/${id}`}
          className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-nu-navy underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          Back to event
        </Link>
      </section>
    </div>
  );
};

export default AttendancePage;
