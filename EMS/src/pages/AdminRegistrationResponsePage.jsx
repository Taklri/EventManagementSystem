import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
    : '—';

const answerValue = (value) =>
  Array.isArray(value) ? value.join(', ') : value === null || value === undefined || value === '' ? 'No answer' : String(value);

const AdminRegistrationResponsePage = () => {
  const { id, responseId } = useParams();
  const { accessToken } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi
      .registrationFormResponse(id, responseId, accessToken)
      .then((data) => {
        if (active) setState({ loading: false, error: '', data });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message || 'Unable to load this response.', data: null });
      });
    return () => {
      active = false;
    };
  }, [accessToken, attempt, id, responseId]);

  if (state.loading) {
    return (
      <div role="status" className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading submitted answers…
      </div>
    );
  }
  if (state.error || !state.data?.response) {
    return (
      <section role="alert" className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-nu-dark">Unable to load submitted answers</h1>
        <p className="mt-2 text-sm text-slate-500">{state.error || 'This response is no longer available.'}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/admin/registration-forms/${id}`}>Back to form</Link>
          </Button>
          <Button type="button" onClick={() => { setState((current) => ({ ...current, loading: true })); setAttempt((value) => value + 1); }}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const { form, response } = state.data;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to={`/admin/registration-forms/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-nu-navy underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to form results
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Submitted response
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-nu-dark">
          {response.student?.name || 'Account unavailable'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{form.name}</p>
      </header>
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Student ID</p>
          <p className="mt-1 text-sm font-semibold text-nu-dark">{response.student?.studentId || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Program</p>
          <p className="mt-1 text-sm font-semibold text-nu-dark">{response.student?.program || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Year level</p>
          <p className="mt-1 text-sm font-semibold text-nu-dark">{response.student?.yearLevel || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</p>
          <p className="mt-1 text-sm font-semibold text-nu-dark">{formatDate(response.submittedAt)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Event</p>
          <p className="mt-1 text-sm font-semibold text-nu-dark">{response.event?.title || '—'}</p>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-nu-navy">
            <ClipboardList size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-nu-dark">Answers</h2>
            <p className="mt-1 text-sm text-slate-500">
              These are the answers saved at the time the student submitted the form.
            </p>
          </div>
        </div>
        {!response.answers?.length ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No answers were submitted.</p>
        ) : (
          <dl className="mt-6 space-y-4">
            {response.answers.map((answer, index) => (
              <div key={answer.key || index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <dt className="text-sm font-semibold text-nu-dark">{answer.label || 'Question'}</dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{answerValue(answer.value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
};

export default AdminRegistrationResponsePage;
