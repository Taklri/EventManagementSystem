import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { Search } from 'lucide-react';
import { adminApi } from '../lib/api';

const campusTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not submitted';

const ProofCell = ({ value, label }) => (
  <div className="flex min-w-32 items-center gap-2">
    {value ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2 font-medium text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
      >
        <img
          src={value}
          alt={`${label} proof`}
          className="h-10 w-14 rounded-md border border-slate-200 object-cover transition group-hover:opacity-80"
        />
        <span className="text-xs underline">View photo</span>
      </a>
    ) : (
      <span className="text-slate-400">—</span>
    )}
  </div>
);

const AdminAttendanceTable = ({ eventId, accessToken }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi
      .registrations(eventId, { page, limit: 20, status: 'registered', search: query }, accessToken)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Unable to load attendance records.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, accessToken, page, query, attempt]);

  const rows = useMemo(() => {
    const registrations = data?.registrations || [];
    if (attendanceFilter === 'not-started') {
      return registrations.filter((row) => !row.attendance?.timeIn);
    }
    if (attendanceFilter === 'in-progress') {
      return registrations.filter((row) => row.attendance?.timeIn && !row.attendance?.timeOut);
    }
    if (attendanceFilter === 'complete') {
      return registrations.filter((row) => row.attendance?.timeIn && row.attendance?.timeOut);
    }
    return registrations;
  }, [attendanceFilter, data]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setLoading(true);
    setQuery(search.trim());
  };

  return (
    <section
      aria-labelledby="attendance-table-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div>
        <h2 id="attendance-table-heading" className="text-lg font-semibold text-nu-dark">
          Attendance records
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Review submitted time-in and time-out proof photos for registered students.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
        <form onSubmit={applySearch} className="min-w-0 flex-1">
          <label htmlFor="attendance-search" className="text-xs font-medium text-slate-600">
            Search students
          </label>
          <div className="relative mt-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="attendance-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, student ID, program, or year level"
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-nu-dark outline-none transition placeholder:text-slate-400 focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/20"
            />
          </div>
        </form>
        <div className="min-w-0 md:w-52 md:shrink-0">
          <label
            htmlFor="attendance-filter"
            className="block text-xs font-medium text-slate-600"
          >
            Attendance status
          </label>
          <select
            id="attendance-filter"
            value={attendanceFilter}
            onChange={(event) => setAttendanceFilter(event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-nu-dark outline-none focus:border-nu-navy focus:ring-2 focus:ring-nu-navy/20 md:w-48"
          >
            <option value="all">All registered</option>
            <option value="not-started">Not started</option>
            <option value="in-progress">Time in submitted</option>
            <option value="complete">Time out submitted</option>
          </select>
        </div>
        <button
          type="button"
          onClick={applySearch}
          className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-nu-navy transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2"
        >
          Search
        </button>
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
          Loading attendance records…
        </p>
      ) : !rows.length ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          No registered students match this view.
        </p>
      ) : (
        <>
          <TableContainer sx={{ mt: 2, overflowX: 'auto' }}>
            <Table
              size="small"
              sx={{
                minWidth: 980,
                '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0' },
              }}
            >
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  {['Student ID', 'Student name', 'Program', 'Year level', 'Time in', 'Time out'].map(
                    (heading) => (
                      <TableCell key={heading} sx={{ fontWeight: 600, color: '#1b2f5a' }}>
                        {heading}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.student?.studentId || '—'}</TableCell>
                    <TableCell>{row.student?.name || 'Account unavailable'}</TableCell>
                    <TableCell>{row.student?.program || '—'}</TableCell>
                    <TableCell>{row.student?.yearLevel || '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-2 text-xs text-slate-600">
                        <p>{campusTime(row.attendance?.timeIn)}</p>
                        <ProofCell value={row.attendance?.timeInPhotoUrl} label="Time in" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 text-xs text-slate-600">
                        <p>{campusTime(row.attendance?.timeOut)}</p>
                        <ProofCell value={row.attendance?.timeOutPhotoUrl} label="Time out" />
                      </div>
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
            sx={{ '& *': { fontFamily: 'inherit' } }}
          />
        </>
      )}
      <p className="mt-3 text-xs text-slate-500 sm:hidden">
        Swipe sideways to see the proof photo columns.
      </p>
    </section>
  );
};

export default AdminAttendanceTable;
