import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import EventRegistration from '../models/EventRegistration.js';
import adminRoutes from '../routes/AdminRoutes/adminRoutes.js';
import { getAdminStudents, updateAdminStudent } from '../controller/adminStudentsController.js';

afterEach(() => mock.restoreAll());
const id = '507f1f77bcf86cd799439011';
const student = { _id: id, studentId: '2026-000001', firstName: 'Test', lastName: 'Student', email: 'test@example.com', password: 'never-return' };
const body = { studentId: student.studentId, firstName: 'Updated', middleName: '', lastName: 'Student' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

test('list selects students and safe fields and counts only registered records', async () => {
  mock.method(User, 'find', (filter) => {
    assert.deepEqual(filter, { role: 'student' });
    return { select(fields) { assert.ok(!fields.includes('password')); return this; }, sort() { return this; }, async lean() { return [student]; } };
  });
  mock.method(EventRegistration, 'aggregate', async (pipeline) => {
    assert.equal(pipeline[0].$match.status, 'registered');
    return [{ _id: id, count: 3 }];
  });
  const res = response();
  await getAdminStudents({}, res);
  assert.equal(res.body.users[0].eventsJoined, 3);
  assert.equal(res.body.users[0].password, undefined);
  assert.equal(res.body.users[0].middleName, '');
});

test('updates only student targets and accepts an empty middle name', async () => {
  mock.method(User, 'exists', async () => false);
  mock.method(User, 'findOneAndUpdate', (filter, update, options) => {
    assert.deepEqual(filter, { _id: id, role: 'student' });
    assert.deepEqual(update, { $set: body });
    assert.equal(options.runValidators, true);
    return { select() { return this; }, async lean() { return { ...student, ...body }; } };
  });
  const res = response();
  await updateAdminStudent({ params: { id }, body }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.firstName, 'Updated');
  assert.equal(res.body.user.password, undefined);
});

test('rejects invalid identifiers, fields, and duplicate student IDs', async () => {
  for (const request of [
    { params: { id: 'invalid' }, body },
    { params: { id }, body: { ...body, role: 'admin' } },
    { params: { id }, body: { ...body, firstName: {} } },
    { params: { id }, body: { ...body, studentId: 'invalid' } },
  ]) {
    const res = response(); await updateAdminStudent(request, res); assert.equal(res.statusCode, 400);
  }
  mock.method(User, 'exists', async () => true);
  const res = response();
  await updateAdminStudent({ params: { id }, body }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.field, 'studentId');
});

test('missing students and concurrent duplicate updates have useful errors', async () => {
  mock.method(User, 'exists', async () => false);
  mock.method(User, 'findOneAndUpdate', () => ({ select() { return this; }, async lean() { return null; } }));
  const res = response();
  await updateAdminStudent({ params: { id }, body }, res);
  assert.equal(res.statusCode, 404);
  mock.method(User, 'findOneAndUpdate', () => { throw { code: 11000 }; });
  await updateAdminStudent({ params: { id }, body }, res);
  assert.equal(res.statusCode, 409);
});

test('database failures do not expose private error details', async () => {
  mock.method(User, 'find', () => { throw new Error('private database details'); });
  const res = response(); await getAdminStudents({}, res);
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('private database details'));
});

test('student routes reject missing tokens and student roles, and allow admin reads', async () => {
  mock.method(jwt, 'verify', (token) => ({ sub: id, role: token }));
  mock.method(User, 'find', () => ({ select() { return this; }, sort() { return this; }, async lean() { return []; } }));
  const app = express(); app.use(express.json()); app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/admin/students`;
    for (const method of ['GET', 'PUT']) {
      const url = method === 'PUT' ? `${base}/${id}` : base;
      assert.equal((await fetch(url, { method })).status, 401);
      assert.equal((await fetch(url, { method, headers: { Authorization: 'Bearer student' } })).status, 403);
    }
    const result = await fetch(base, { headers: { Authorization: 'Bearer admin' } });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { users: [] });
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
