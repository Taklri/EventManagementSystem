import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { Button } from './ui/button';
import { adminApi } from '../lib/api';

const campusTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const AdminRegistrationRoster = ({ eventId, accessToken }) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .registrations(eventId, { page, status }, accessToken)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Unable to load registrations.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, accessToken, page, status, attempt]);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await adminApi.downloadRegistrations(eventId, accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${eventId}-registrations.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.message || 'Unable to export registrations.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section
      id="registration-roster"
      aria-labelledby="roster-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h2 id="roster-heading" className="text-lg font-semibold text-nu-dark">
            Registration responses
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Review answers and export the full list for venue check-in.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>
      <h2 className="hidden text-lg font-semibold print:block">Event registration list</h2>
      <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
        <label htmlFor="roster-status" className="text-xs font-medium text-slate-600">
          Status
        </label>
        <select
          id="roster-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
            setLoading(true);
          }}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-nu-navy"
        >
          <option value="all">All submissions</option>
          <option value="registered">Registered</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button type="button" variant="ghost" onClick={() => window.print()}>
          Print current page
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-6 text-sm text-slate-500">
          Loading registrations…
        </p>
      ) : !data?.registrations?.length ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          No registrations in this view.
        </p>
      ) : (
        <>
          <TableContainer sx={{ mt: 2, overflowX: 'auto' }}>
            <Table
              size="small"
              sx={{
                minWidth: 720,
                '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0' },
              }}
            >
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  {[
                    'Student',
                    'School ID',
                    'Status',
                    'Submitted',
                    'Time in',
                    'Time out',
                    'Answers',
                    'Signature',
                  ].map((heading) => (
                    <TableCell key={heading} sx={{ fontWeight: 600, color: '#1b2f5a' }}>
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.registrations.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.student?.name || 'Account unavailable'}</TableCell>
                    <TableCell>{row.student?.studentId || '—'}</TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell>{campusTime(row.submittedAt)}</TableCell>
                    <TableCell>{campusTime(row.attendance?.timeIn)}</TableCell>
                    <TableCell>{campusTime(row.attendance?.timeOut)}</TableCell>
                    <TableCell>
                      {(row.answers || []).length ? (
                        <button
                          type="button"
                          className="text-sm font-semibold text-nu-navy underline print:hidden"
                          onClick={() =>
                            setExpanded((current) => (current === row._id ? null : row._id))
                          }
                          aria-expanded={expanded === row._id}
                          aria-controls={`roster-answers-${row._id}`}
                        >
                          {expanded === row._id ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        '—'
                      )}
                      {expanded === row._id && (
                        <dl
                          id={`roster-answers-${row._id}`}
                          className="mt-2 min-w-48 space-y-2 text-xs print:hidden"
                        >
                          {row.answers.map((answer) => (
                            <div key={answer.key}>
                              <dt className="font-semibold">{answer.label}</dt>
                              <dd>
                                {Array.isArray(answer.value)
                                  ? answer.value.join(', ')
                                  : answer.value || 'No answer'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-block min-w-24 border-b border-slate-400">
                        &nbsp;
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.pagination.total}
            page={page - 1}
            rowsPerPage={20}
            rowsPerPageOptions={[20]}
            onPageChange={(_, next) => {
              setPage(next + 1);
              setLoading(true);
            }}
            sx={{ '& *': { fontFamily: 'inherit' }, '@media print': { display: 'none' } }}
          />
        </>
      )}
      <p className="mt-3 text-xs text-slate-500 sm:hidden print:hidden">
        Swipe sideways to see all columns.
      </p>
    </section>
  );
};

export default AdminRegistrationRoster;
