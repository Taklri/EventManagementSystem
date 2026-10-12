import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import Event from '../models/Event.js';
import { getEvents, getEventById } from '../controller/createEventController.js';
import { calculateStatus } from '../utils/eventStatus.js';

const now = new Date('2026-10-12T04:00:00Z');
const record = (id, start, end, extra = {}) => ({
  _id: id, title: `Campus event ${id}`, location: 'NU Main Hall', description: 'A campus event for students.',
  startDate: new Date(start), endDate: new Date(end), isArchived: false,
  organizer: { firstName: 'Campus', lastName: 'Organizer' }, ...extra,
  toObject() { const { toObject, ...fields } = this; return fields; },
});
const records = [
  record('c', '2026-10-13', '2026-10-14'),
  record('b', '2026-10-13', '2026-10-14', { title: 'Technology [expo]' }),
  record('a', '2026-10-12', '2026-10-13'),
  record('past', '2026-10-10', '2026-10-11'),
  record('archived', '2026-10-15', '2026-10-16', { isArchived: true }),
];
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((condition) => matches(row, condition));
    if (value instanceof RegExp) return value.test(row[key]);
    if (typeof value !== 'object') return row[key] === value;
    return Object.entries(value).every(([operator, operand]) => (
      operator === '$ne' ? row[key] !== operand : operator === '$gt' ? row[key] > operand
        : operator === '$gte' ? row[key] >= operand : row[key] <= operand
    ));
  });
}
beforeEach(() => {
  mock.timers.enable({ apis: ['Date'], now });
  mock.method(Event, 'countDocuments', async (filter) => records.filter((row) => matches(row, filter)).length);
  mock.method(Event, 'find', (filter) => {
    let rows = records.filter((row) => matches(row, filter));
    const query = {
      sort() { rows.sort((a, b) => a.startDate - b.startDate || a._id.localeCompare(b._id)); return this; },
      skip(count) { rows = rows.slice(count); return this; },
      limit(count) { rows = rows.slice(0, count); return this; },
      populate() { return Promise.resolve(rows); },
    };
    return query;
  });
});
afterEach(() => { mock.restoreAll(); mock.timers.reset(); });
async function list(query = {}) {
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await getEvents({ query }, res);
  return res;
}

test('paged discovery excludes archives, sorts ties consistently, and returns page boundaries', async () => {
  const first = await list({ status: 'active', limit: '2', page: '1' });
  assert.equal(first.statusCode, 200);
  assert.deepEqual(first.body.events.map((row) => row._id), ['a', 'b']);
  assert.deepEqual(first.body.pagination, { page: 1, limit: 2, total: 3, totalPages: 2, hasNext: true, hasPrevious: false });
  const second = await list({ status: 'active', limit: '2', page: '2' });
  assert.deepEqual(second.body.events.map((row) => row._id), ['c']);
  assert.equal(second.body.pagination.hasNext, false);
  assert.equal(second.body.pagination.hasPrevious, true);
  const beyond = await list({ status: 'active', page: '10' });
  assert.deepEqual(beyond.body.events, []);
  assert.equal(beyond.body.pagination.total, 3);
});

test('status filters and literal case-insensitive title/location searches apply before pagination', async () => {
  assert.deepEqual((await list({ status: 'ongoing' })).body.events.map((row) => row._id), ['a']);
  assert.equal((await list({ status: 'upcoming' })).body.pagination.total, 2);
  assert.equal((await list({ status: 'all' })).body.pagination.total, 4);
  assert.deepEqual((await list({ search: '[EXPO]' })).body.events.map((row) => row._id), ['b']);
  assert.equal((await list({ search: 'main hall' })).body.pagination.total, 4);
  const empty = await list({ search: 'No matches' });
  assert.equal(empty.body.pagination.totalPages, 0);
  assert.equal(empty.body.pagination.hasNext, false);
  assert.equal(empty.body.pagination.hasPrevious, false);
});

test('invalid and structured query values are rejected before database access', async () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1000001' }, { page: ['1'] }, { limit: '25' }, { limit: '0' }, { status: 'ended' }, { status: ['active'] }, { search: { $ne: '' } }, { search: 'a'.repeat(101) }]) {
    assert.equal((await list(query)).statusCode, 400);
  }
  assert.equal(Event.find.mock.callCount(), 0);
});

test('legacy list without query parameters still returns all non-archived events', async () => {
  const res = await list();
  assert.equal(res.body.events.length, 4);
  assert.equal(res.body.pagination, undefined);
});

test('event status includes both start and end boundaries', () => {
  const event = { startDate: now, endDate: new Date(now.getTime() + 1000) };
  assert.equal(calculateStatus(event, new Date(now.getTime() - 1)), 'Coming Soon');
  assert.equal(calculateStatus(event, now), 'Ongoing');
  assert.equal(calculateStatus(event, event.endDate), 'Ongoing');
  assert.equal(calculateStatus(event, new Date(event.endDate.getTime() + 1)), 'Ended');
});

test('event detail preserves populated event response and not-found behavior', async () => {
  mock.method(Event, 'findById', () => ({ populate: async () => records[0] }));
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await getEventById({ params: { id: 'c' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.event.status, 'Coming Soon');
  Event.findById.mock.mockImplementation(() => ({ populate: async () => null }));
  await getEventById({ params: { id: 'missing' } }, res);
  assert.equal(res.statusCode, 404);
});
