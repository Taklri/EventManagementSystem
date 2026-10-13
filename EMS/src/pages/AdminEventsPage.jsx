import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import EventStatus from '../components/EventStatus';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';
import { formatEventSchedule, organizerName } from '../lib/eventFormatting';

const FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'upcoming', label: 'Coming Soon' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ended', label: 'Ended' },
  { value: 'archived', label: 'Archived' },
];

const ArchivedStatus = () => (
  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
    Archived
  </span>
);

const AdminEventsPage = () => {
  const { accessToken } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = searchParams.get('search') || '';
  const requestedStatus = searchParams.get('status') || 'all';
  const status = FILTERS.some((filter) => filter.value === requestedStatus)
    ? requestedStatus
    : 'all';
  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSearchInput(search));
    return () => window.cancelAnimationFrame(frame);
  }, [search]);

  useEffect(() => {
    if (searchInput === search) return undefined;
    const timeout = window.setTimeout(() => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        if (searchInput.trim()) next.set('search', searchInput.trim());
        else next.delete('search');
        next.delete('page');
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, search, setSearchParams]);

  useEffect(() => {
    let active = true;
    adminApi
      .events({ page, search, status }, accessToken)
      .then((data) => {
        if (!active) return;
        if (data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('page', String(data.pagination.totalPages));
            return next;
          });
          return;
        }
        setResult(data);
        setError(null);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, page, search, status, attempt, setSearchParams]);

  const updateQuery = (changes) => {
    setLoading(true);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, String(value));
        else next.delete(key);
      });
      return next;
    });
  };

  const events = result?.events || [];
  const total = result?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Event Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage events across campus.</p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/admin/events/new">Create event</Link>
        </Button>
      </header>

      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label="Events"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Search events</span>
            <Search
              size={17}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value.slice(0, 100))}
              placeholder="Search title, location, or organizer"
              className="pl-10"
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) =>
                updateQuery({
                  status: event.target.value === 'all' ? '' : event.target.value,
                  page: '',
                })
              }
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-nu-dark outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
            >
              {FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div role="alert" className="px-5 py-16 text-center">
            <p className="text-sm text-slate-600">Unable to load events. Please try again.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div role="status" className="px-5 py-16 text-center text-sm text-slate-500">
            Loading events…
          </div>
        ) : events.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-semibold text-nu-dark">No events found</p>
            <p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p>
            {(search || status !== 'all' || page > 1) && (
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSearchInput('');
                  updateQuery({ search: '', status: '', page: '' });
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <TableContainer className="w-full" sx={{ overflowX: 'auto' }}>
              <Table
                size="small"
                sx={{
                  minWidth: 860,
                  '& .MuiTableCell-root': { fontFamily: 'inherit', borderColor: '#e2e8f0', py: 2 },
                }}
              >
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    {[
                      'Event',
                      'Type',
                      'Date & time',
                      'Location',
                      'Organizer',
                      'Status',
                      'Actions',
                    ].map((heading) => (
                      <TableCell key={heading} sx={{ fontWeight: 600, color: '#1b2f5a' }}>
                        {heading}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id} hover>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <span className="block break-words font-semibold text-nu-dark">
                          {event.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {event.eventType || 'Other'}
                        </span>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: '#475569' }}>
                        {formatEventSchedule(event.startDate, event.endDate)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 190 }}>
                        <span className="break-words">{event.location}</span>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 190 }}>
                        <span className="break-words">{organizerName(event)}</span>
                      </TableCell>
                      <TableCell>
                        {event.isArchived ? (
                          <ArchivedStatus />
                        ) : (
                          <EventStatus status={event.status} showDot={false} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/admin/events/${event._id}`}
                          state={{ returnTo: `/admin/events${location.search}` }}
                          className="whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold text-nu-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy"
                        >
                          View details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page - 1}
              rowsPerPage={10}
              rowsPerPageOptions={[10]}
              onPageChange={(_, nextPage) =>
                updateQuery({ page: nextPage === 0 ? '' : nextPage + 1 })
              }
              sx={{ fontFamily: 'inherit', '& *': { fontFamily: 'inherit' } }}
            />
          </>
        )}
      </section>
      <p className="text-xs text-slate-500 sm:hidden">
        Swipe the table sideways to see every column.
      </p>
    </div>
  );
};

export default AdminEventsPage;
