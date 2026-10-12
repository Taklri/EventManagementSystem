import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import Event from '../models/Event.js';
import { getAdminEvents } from '../controller/adminEventsController.js';
import adminRoutes from '../routes/AdminRoutes/adminRoutes.js';

afterEach(() => mock.restoreAll());

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('admin list includes archived events by default and paginates newest first', async () => {
  const calls = {};
  mock.method(Event, 'countDocuments', async (filter) => {
    calls.countFilter = filter;
    return 12;
  });
  mock.method(Event, 'find', (filter) => {
    calls.findFilter = filter;
    return {
      sort(value) { calls.sort = value; return this; },
      skip(value) { calls.skip = value; return this; },
      limit(value) { calls.limit = value; return this; },
      async populate() { return []; },
    };
  });

  const res = response();
  await getAdminEvents({ query: { page: '2' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.countFilter, {});
  assert.deepEqual(calls.findFilter, {});
  assert.deepEqual(calls.sort, { startDate: -1, _id: -1 });
  assert.equal(calls.skip, 10);
  assert.equal(calls.limit, 10);
  assert.deepEqual(res.body.pagination, {
    page: 2, limit: 10, total: 12, totalPages: 2, hasNext: false, hasPrevious: true,
  });
});

test('admin list applies status and literal search filters', async () => {
  let filter;
  mock.method(Event, 'countDocuments', async (value) => { filter = value; return 0; });
  mock.method(Event, 'find', () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async populate() { return []; },
  }));

  const res = response();
  await getAdminEvents({ query: { status: 'archived', search: 'Tech.*' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(filter.isArchived, true);
  assert.equal(filter.$or[0].title.source, 'Tech\\.\\*');
  assert.equal(res.body.pagination.totalPages, 0);
});

test('admin list keeps archived events out of date-based status filters', async () => {
  const filters = [];
  mock.method(Event, 'countDocuments', async (filter) => { filters.push(filter); return 0; });
  mock.method(Event, 'find', () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async populate() { return []; },
  }));

  for (const status of ['upcoming', 'ongoing', 'ended']) {
    const res = response();
    await getAdminEvents({ query: { status } }, res);
    assert.equal(res.statusCode, 200);
  }
  assert.deepEqual(filters.map((filter) => filter.isArchived), [
    { $ne: true }, { $ne: true }, { $ne: true },
  ]);
  assert.ok(filters[0].startDate.$gt instanceof Date);
  assert.ok(filters[1].startDate.$lte instanceof Date);
  assert.ok(filters[1].endDate.$gte instanceof Date);
  assert.ok(filters[2].endDate.$lt instanceof Date);
});

test('admin list rejects invalid paging and filters', async () => {
  for (const query of [{ page: '0' }, { limit: '25' }, { status: 'draft' }, { search: 'x'.repeat(101) }]) {
    const res = response();
    await getAdminEvents({ query }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('admin events route requires an admin token', async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = 'admin-events-test-only-key';
  mock.method(Event, 'countDocuments', async () => 0);
  mock.method(Event, 'find', () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async populate() { return []; },
  }));
  const app = express();
  app.use('/api/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/admin/events`;
    assert.equal((await fetch(url)).status, 401);
    const studentToken = jwt.sign({ sub: 'student-id', role: 'student' }, process.env.JWT_SECRET_KEY);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
    const adminToken = jwt.sign({ sub: 'admin-id', role: 'admin' }, process.env.JWT_SECRET_KEY);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});
