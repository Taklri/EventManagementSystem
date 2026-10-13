import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../lib/api';
import { formatEventSchedule } from '../lib/eventFormatting';

const initialValue = (item) => (item.type === 'multipleAnswer' ? [] : '');
const validateAnswer = (item, value) => {
  const empty = Array.isArray(value) ? value.length === 0 : !String(value || '').trim();
  if (item.required && empty) return 'This question is required.';
  if (empty) return '';
  if (item.type === 'shortText' && String(value).trim().length > 240)
    return 'Use 240 characters or fewer.';
  if (['longText', 'text'].includes(item.type) && String(value).trim().length > 2000)
    return 'Use 2,000 characters or fewer.';
  if ((item.type === 'dropdown' || item.type === 'radio') && !item.options.includes(value))
    return 'Choose an available option.';
  if (
    item.type === 'multipleChoice' &&
    (typeof value !== 'string' || !item.options.includes(value))
  )
    return 'Choose an available option.';
  if (
    item.type === 'multipleAnswer' &&
    (!Array.isArray(value) || value.some((option) => !item.options.includes(option)))
  )
    return 'Choose available options.';
  return '';
};

const EventRegistrationPage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ loading: true, saving: false, error: '', notice: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    eventsApi
      .registrationForm(id, accessToken)
      .then((result) => {
        if (!active) return;
        setData(result);
        setAnswers(
          Object.fromEntries(
            (result.form?.items || [])
              .filter((item) => item.type !== 'instructions')
              .map((item) => [item.key, initialValue(item)]),
          ),
        );
        setState({ loading: false, saving: false, error: '', notice: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            saving: false,
            error: error.message || 'Unable to load registration.',
            notice: '',
          });
      });
    return () => {
      active = false;
    };
  }, [id, accessToken, attempt]);

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const blurAnswer = (item) => {
    setErrors((current) => ({ ...current, [item.key]: validateAnswer(item, answers[item.key]) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!data) return;
    const fieldErrors = {};
    const submitted = data.form.items
      .filter((item) => item.type !== 'instructions')
      .map((item) => {
        const value = answers[item.key];
        const message = validateAnswer(item, value);
        if (message) fieldErrors[item.key] = message;
        return { key: item.key, value };
      });
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      document.getElementById(`answer-${Object.keys(fieldErrors)[0]}`)?.focus();
      return;
    }
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const result = await eventsApi.register(id, accessToken, submitted);
      setData((current) => ({ ...current, registration: result.registration }));
      setState((current) => ({
        ...current,
        saving: false,
        notice:
          result.registration.status === 'waitlisted'
            ? 'Your form was submitted. You are on the waitlist.'
            : 'Your form was submitted. You are registered.',
      }));
    } catch (error) {
      const nextErrors = {};
      (error.issues || []).forEach((issue) => {
        const key = issue.path?.replace(/^answers\./, '');
        if (key) nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      setState((current) => ({
        ...current,
        saving: false,
        error: error.message || 'Unable to submit registration.',
      }));
      const first = Object.keys(nextErrors)[0];
      if (first)
        window.requestAnimationFrame(() => document.getElementById(`answer-${first}`)?.focus());
    }
  };

  if (state.loading)
    return (
      <div
        role="status"
        className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-sm text-slate-600"
      >
        Loading registration form…
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-nu-dark">Registration unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-slate-600">
          {state.error}
        </p>
        <div className="mt-5 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setState((current) => ({ ...current, loading: true }));
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </Button>
          <Link
            to={`/events/${id}`}
            className="self-center text-sm font-semibold text-nu-navy underline"
          >
            Back to event
          </Link>
        </div>
      </div>
    );

  const activeRegistration = data.registration && data.registration.status !== 'cancelled';
  const canRegister = !data.event.isArchived && data.event.status === 'Coming Soon';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        to={`/events/${id}`}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-nu-navy underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Back to event
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Event registration
        </p>
        <h1 className="mt-2 text-2xl font-bold text-nu-dark sm:text-3xl">{data.event.title}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {formatEventSchedule(data.event.startDate, data.event.endDate)}
        </p>
      </header>

      {activeRegistration ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold text-nu-dark">
            {data.registration.status === 'waitlisted'
              ? 'You are on the waitlist'
              : 'You are registered'}
          </h2>
          {state.notice && <p className="mt-2 text-sm text-emerald-700">{state.notice}</p>}
          {data.registration.submittedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Submitted{' '}
              {new Date(data.registration.submittedAt).toLocaleString('en-PH', {
                timeZone: 'Asia/Manila',
              })}
            </p>
          )}
          {(data.registration.answers || []).length > 0 && (
            <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
              {data.registration.answers.map((answer) => (
                <div key={answer.key} className="py-3 text-sm">
                  <dt className="font-medium text-nu-dark">{answer.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                    {Array.isArray(answer.value)
                      ? answer.value.join(', ')
                      : answer.value || 'No answer'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : !canRegister ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Registration has closed for this event.
        </section>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Registration form
          </p>
          <h2 className="mt-2 text-xl font-semibold text-nu-dark sm:text-2xl">
            {data.form?.name || 'Registration form'}
          </h2>
          {data.form?.description && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {data.form.description}
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Your registration or waitlist place is saved only after you submit this form.
          </p>
          <div className="mt-6 space-y-7">
            {data.form.items.map((item) => {
              if (item.type === 'instructions')
                return (
                  <p
                    key={item.key}
                    className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {item.label}
                  </p>
                );
              const value = answers[item.key] ?? initialValue(item);
              const common = {
                id: `answer-${item.key}`,
                'aria-invalid': Boolean(errors[item.key]),
                'aria-describedby': errors[item.key] ? `error-${item.key}` : undefined,
              };
              return (
                <div key={item.key}>
                  <Label htmlFor={common.id}>
                    {item.label}
                    {item.required && (
                      <span aria-hidden="true" className="ml-1 text-red-700">
                        *
                      </span>
                    )}
                  </Label>
                  {item.helpText && <p className="mt-1 text-xs text-slate-500">{item.helpText}</p>}
                  {item.type === 'shortText' && (
                    <Input
                      {...common}
                      className="mt-2"
                      maxLength={240}
                      value={value}
                      onChange={(event) => updateAnswer(item.key, event.target.value)}
                      onBlur={() => blurAnswer(item)}
                    />
                  )}
                  {['longText', 'text'].includes(item.type) && (
                    <Textarea
                      {...common}
                      className="mt-2"
                      rows={4}
                      maxLength={2000}
                      value={value}
                      onChange={(event) => updateAnswer(item.key, event.target.value)}
                      onBlur={() => blurAnswer(item)}
                    />
                  )}
                  {item.type === 'dropdown' && (
                    <select
                      {...common}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-nu-navy"
                      value={value}
                      onChange={(event) => updateAnswer(item.key, event.target.value)}
                      onBlur={() => blurAnswer(item)}
                    >
                      <option value="">Choose an option</option>
                      {item.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {(item.type === 'radio' ||
                    item.type === 'multipleChoice' ||
                    item.type === 'multipleAnswer') && (
                    <div role="group" aria-label={item.label} className="mt-3 space-y-2">
                      {item.options.map((option, index) => (
                        <label
                          key={option}
                          className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          <input
                            {...(index === 0 ? common : {})}
                            type={item.type === 'multipleAnswer' ? 'checkbox' : 'radio'}
                            name={item.key}
                            value={option}
                            checked={
                              item.type === 'multipleAnswer'
                                ? value.includes(option)
                                : value === option
                            }
                            onChange={() =>
                              updateAnswer(
                                item.key,
                                item.type !== 'multipleAnswer'
                                  ? option
                                  : value.includes(option)
                                    ? value.filter((entry) => entry !== option)
                                    : [...value, option],
                              )
                            }
                            onBlur={() => blurAnswer(item)}
                            className="h-4 w-4 accent-nu-navy"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  )}
                  {errors[item.key] && (
                    <p id={`error-${item.key}`} role="alert" className="mt-2 text-xs text-red-700">
                      {errors[item.key]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {state.error && (
            <p role="alert" className="mt-5 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link to={`/events/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Submitting…' : 'Submit registration'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EventRegistrationPage;
