import { useCallback, useEffect, useState } from 'react';
import { Archive, Edit3, Eye, FileQuestion, Plus, RotateCcw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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

const AdminRegistrationFormsPage = () => {
  const { accessToken } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', forms: [], pagination: null });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminApi.registrationForms(
        { page, limit: 10, search, status },
        accessToken,
      );
      setState({
        loading: false,
        error: '',
        forms: result.forms || [],
        pagination: result.pagination,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Unable to load registration forms.',
      }));
    }
  }, [accessToken, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleArchive = async (form) => {
    setBusyId(form._id);
    try {
      if (form.isArchived) await adminApi.unarchiveRegistrationForm(form._id, accessToken);
      else await adminApi.archiveRegistrationForm(form._id, accessToken);
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message || 'Unable to update form status.',
      }));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-end sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-nu-dark">
            Registration forms
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create reusable questions once, then attach the current form to any
            registration-required event.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/admin/registration-forms/new">
            <Plus size={17} aria-hidden="true" />
            Create form
          </Link>
        </Button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search registration forms</span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search forms"
              className="pl-9"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-nu-dark focus-visible:ring-2 focus-visible:ring-nu-navy"
          >
            <option value="active">Active forms</option>
            <option value="archived">Archived forms</option>
            <option value="all">All forms</option>
          </select>
        </div>

        {state.error && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{state.error}</span>
            <Button
              type="button"
              variant="outline"
              className="min-h-9 px-3"
              onClick={() => void load()}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}
        {state.loading ? (
          <p role="status" className="py-16 text-center text-sm text-slate-500">
            Loading registration forms…
          </p>
        ) : state.forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileQuestion size={28} className="text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-nu-dark">No forms found</h2>
            <p className="max-w-md text-sm text-slate-500">
              Create a reusable form to collect event-specific information from students.
            </p>
            <Button asChild variant="outline">
              <Link to="/admin/registration-forms/new">
                <Plus size={16} aria-hidden="true" />
                Create form
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Registration forms</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Form</th>
                  <th className="px-4 py-3 font-semibold">Questions</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.forms.map((form) => (
                  <tr key={form._id} className="align-middle">
                    <td className="px-4 py-4">
                      <Link
                        to={`/admin/registration-forms/${form._id}`}
                        className="font-semibold text-nu-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
                      >
                        {form.name}
                      </Link>
                      <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                        {form.description || 'No description'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{form.items?.length || 0}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(form.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${form.isArchived ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}
                      >
                        {form.isArchived ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" className="h-9 min-h-9 w-9 p-0" title="Edit form">
                          <Link
                            to={`/admin/registration-forms/${form._id}/edit`}
                            aria-label={`Edit ${form.name}`}
                          >
                            <Edit3 size={16} aria-hidden="true" />
                            <span className="sr-only">Edit form</span>
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" className="h-9 min-h-9 w-9 p-0" title="View responses">
                          <Link
                            to={`/admin/registration-forms/${form._id}`}
                            aria-label={`View responses for ${form.name}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                            <span className="sr-only">View responses</span>
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 min-h-9 w-9 p-0"
                          title={form.isArchived ? 'Unarchive form' : 'Archive form'}
                          aria-label={`${form.isArchived ? 'Unarchive' : 'Archive'} ${form.name}`}
                          disabled={busyId === form._id}
                          onClick={() => void toggleArchive(form)}
                        >
                          {form.isArchived ? (
                            <RotateCcw size={16} aria-hidden="true" />
                          ) : (
                            <Archive size={16} aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {form.isArchived ? 'Unarchive form' : 'Archive form'}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {state.pagination && state.pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {state.pagination.page} of {state.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3"
                disabled={!state.pagination.hasPrevious}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3"
                disabled={!state.pagination.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminRegistrationFormsPage;
