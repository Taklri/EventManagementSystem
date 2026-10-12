import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import Event from '../models/Event.js';
import EventAttendance from '../models/EventAttendance.js';
import EventRegistration from '../models/EventRegistration.js';
import { getAdminDashboard } from '../controller/adminDashboardController.js';

afterEach(() => mock.restoreAll());

test('admin dashboard counts live event states and limits the recent overview', async () => {
  const filters = [];
  mock.method(Event, 'countDocuments', async (filter) => {
    filters.push(filter);
    if (filter.isArchived === true) return 2;
    if (filter.startDate?.$gt) return 3;
    if (filter.endDate?.$gte) return 1;
    return 4;
  });
  mock.method(EventRegistration, 'countDocuments', async () => 7);
  mock.method(EventAttendance, 'countDocuments', async () => 8);

  const calls = {};
  const event = {
    startDate: new Date(Date.now() + 60_000),
    endDate: new Date(Date.now() + 120_000),
    toObject() { return { title: 'Campus event', startDate: this.startDate, endDate: this.endDate }; },
  };
  mock.method(Event, 'find', (filter) => {
    calls.filter = filter;
    return {
      sort(value) { calls.sort = value; return this; },
      limit(value) { calls.limit = value; return this; },
      async populate() { return [event]; },
    };
  });

  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await getAdminDashboard({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.metrics, {
    total: 4,
    upcoming: 3,
    ongoing: 1,
    archived: 2,
    registrations: 7,
    attendees: 8,
  });
  assert.deepEqual(filters[0], { isArchived: { $ne: true } });
  assert.ok(filters[1].startDate.$gt instanceof Date);
  assert.ok(filters[2].startDate.$lte instanceof Date);
  assert.ok(filters[2].endDate.$gte instanceof Date);
  assert.deepEqual(filters[3], { isArchived: true });
  assert.deepEqual(calls.filter, { isArchived: { $ne: true } });
  assert.deepEqual(calls.sort, { updatedAt: -1, _id: -1 });
  assert.equal(calls.limit, 6);
  assert.equal(res.body.recentEvents[0].status, 'Coming Soon');
});
