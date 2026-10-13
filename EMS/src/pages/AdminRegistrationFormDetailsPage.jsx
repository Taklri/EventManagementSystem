import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Edit3, FileText, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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

const typeLabel = {
  text: 'Text',
  multipleChoice: 'Multiple choice',
  multipleAnswer: 'Multiple answer',
  dropdown: 'Dropdown',
  instructions: 'Instructions',
};

const FormQuestions = ({ form }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Questions
        </p>
        <h2 className="mt-2 text-xl font-semibold text-nu-dark">Current form questions</h2>
        <p className="mt-1 text-sm text-slate-500">
          This is the form students see when they complete event registration.
        </p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {form.items?.length || 0} items
      </span>
    </div>
    {!form.items?.length ? (
      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        This form does not have any questions yet.
      </div>
    ) : (
      <div className="mt-6 space-y-4">
        {form.items.map((item, index) => (
          <article
            key={item.key || `${item.label}-${index}`}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nu-navy text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-nu-dark [overflow-wrap:anywhere]">
                    {item.type === 'instructions' ? 'Instruction' : item.label}
                  </h3>
                  {item.type !== 'instructions' && item.helpText && (
                    <p className="mt-1 text-xs text-slate-500">{item.helpText}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {typeLabel[item.type] || item.type}
                </span>
                {item.required && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                    Required
                  </span>
                )}
              </div>
            </div>
            {item.type === 'instructions' ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                {item.label}
              </p>
            ) : item.options?.length ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {item.options.map((option, optionIndex) => (
                  <li key={`${option}-${optionIndex}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    {option}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    )}
  </section>
);

const FormResponses = ({ formId, formName }) => {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .registrationFormResponses(formId, { page, limit: 20, search: query }, accessToken)
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: '', data });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || 'Unable to load form responses.', data: null });
      });
    return () => {
      active = false;
    };
  }, [accessToken, attempt, formId, page, query]);

  const searchResponses = (event) => {
    event.preventDefault();
    setPage(1);
    setState((current) => ({ ...current, loading: true }));
    setQuery(search.trim());
  };

  const download = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.downloadRegistrationFormResponses(formId, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName =
        formName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'registration-form';
      link.download = `${fileName}-responses.xlsx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Unable to export responses.' }));
    } finally {
      setExporting(false);
    }
  };

  const responses = state.data?.responses || [];
  const pagination = state.data?.pagination;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Results
          </p>
          <h2 className="mt-2 text-xl font-semibold text-nu-dark">Student responses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every student who submitted this form, including the event and response status.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={exporting} onClick={() => void download()}>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Preparing Excel…' : 'Download Excel'}
        </Button>
      </div>
      <form onSubmit={searchResponses} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="text-xs font-medium text-slate-600">Search responses</span>
          <div className="relative mt-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, student ID, program, or year level"
              className="pl-9"
            />
          </div>
        </label>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setState((current) => ({ ...current, loading: true }));
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      {state.loading ? (
        <p role="status" className="py-16 text-center text-sm text-slate-500">
          Loading responses…
        </p>
      ) : !responses.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
          <FileText size={28} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-nu-dark">No submitted responses</p>
          <p className="mt-1 text-xs text-slate-500">Responses will appear here after students submit the form.</p>
        </div>
      ) : (
        <>
          <TableContainer sx={{ mt: 5, overflowX: 'auto' }}>
            <Table
              size="small"
              sx={{
                minWidth: 940,
                '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0' },
              }}
            >
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  {['Student ID', 'Student name', 'Program', 'Year level', 'Event', 'Submitted', 'Status', 'Answers'].map(
                    (heading) => (
                      <TableCell key={heading} sx={{ fontWeight: 600, color: '#1b2f5a' }}>
                        {heading}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response._id} hover>
                    <TableCell>{response.student?.studentId || '—'}</TableCell>
                    <TableCell>{response.student?.name || 'Account unavailable'}</TableCell>
                    <TableCell>{response.student?.program || '—'}</TableCell>
                    <TableCell>{response.student?.yearLevel || '—'}</TableCell>
                    <TableCell>{response.event?.title || '—'}</TableCell>
                    <TableCell>{formatDate(response.submittedAt)}</TableCell>
                    <TableCell className="capitalize">{response.status || '—'}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" className="min-h-9 px-2">
                        <Link to={`/admin/registration-forms/${formId}/responses/${response._id}`}>
                          View answers
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {pagination && (
            <TablePagination
              component="div"
              count={pagination.total}
              page={page - 1}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
              onPageChange={(_, next) => {
                setPage(next + 1);
                setState((current) => ({ ...current, loading: true }));
              }}
              sx={{ '& *': { fontFamily: 'inherit' } }}
            />
          )}
        </>
      )}
      <p className="mt-3 text-xs text-slate-500 sm:hidden">Swipe sideways to see all response columns.</p>
    </section>
  );
};

const AdminRegistrationFormDetailsPage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', form: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi
      .registrationForm(id, accessToken)
      .then((result) => {
        if (active) setState({ loading: false, error: '', form: result.form });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message || 'Unable to load this form.', form: null });
      });
    return () => {
      active = false;
    };
  }, [accessToken, attempt, id]);

  if (state.loading) {
    return (
      <div role="status" className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading registration form…
      </div>
    );
  }
  if (state.error || !state.form) {
    return (
      <section role="alert" className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-nu-dark">Unable to load registration form</h1>
        <p className="mt-2 text-sm text-slate-500">{state.error || 'This form is no longer available.'}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/registration-forms">Back to forms</Link>
          </Button>
          <Button type="button" onClick={() => { setState((current) => ({ ...current, loading: true })); setAttempt((value) => value + 1); }}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/admin/registration-forms"
        className="inline-flex items-center gap-2 text-sm font-semibold text-nu-navy underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to registration forms
      </Link>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Registration form
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-nu-dark [overflow-wrap:anywhere]">
            {state.form.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {state.form.description || 'No description provided.'}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to={`/admin/registration-forms/${id}/edit`}>
            <Edit3 size={16} aria-hidden="true" />
            Edit form
          </Link>
        </Button>
      </header>
      <Tabs defaultValue="questions" className="space-y-5">
        <TabsList aria-label="Registration form sections">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <FormQuestions form={state.form} />
        </TabsContent>
        <TabsContent value="results">
          <FormResponses formId={id} formName={state.form.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRegistrationFormDetailsPage;
