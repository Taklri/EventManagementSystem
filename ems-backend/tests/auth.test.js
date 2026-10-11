import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, mock, test } from 'node:test';
import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import express from 'express';
import { BrevoClient } from '@getbrevo/brevo';
import User from '../models/User.js';
import LoginOtp from '../models/LoginOtp.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { registerUser } from '../controller/userController.js';
import { loginUser, verifyLoginOtp, verifyRegistrationOtp, resendLoginOtp, resendRegistrationOtp, refreshAccessToken, logoutUser } from '../controller/authUserController.js';
import userRoutes from '../routes/UserRoutes/userRoutes.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';

// All persistence and email delivery are replaced. No live accounts or mailboxes
// are used, and generated credentials/codes/tokens are never printed.
const id = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const password = `Test-${randomUUID()}-1aA!`;
const otp = String(randomInt(100000, 1000000));
const wrongOtp = otp === '100000' ? '100001' : '100000';
const oldEnvironment = { ...process.env };
let passwordHash;
let codeHash;
let mail;
let failMail;
const registration = { studentId: '2026-123456', firstName: 'María-José', middleName: '', lastName: 'O’Neill', email: 'student@example.invalid', password };

before(async () => {
  process.env.JWT_SECRET_KEY = randomUUID();
  process.env.JWT_REFRESH_SECRET_KEY = randomUUID();
  process.env.OTP_RESEND_SECONDS = '60';
  process.env.OTP_EXPIRES_MINUTES = '5';
  process.env.NODE_ENV = 'test';
  passwordHash = await bcrypt.hash(password, 4);
  codeHash = await bcrypt.hash(otp, 4);
});
after(() => {
  for (const key of ['JWT_SECRET_KEY', 'JWT_REFRESH_SECRET_KEY', 'OTP_RESEND_SECONDS', 'OTP_EXPIRES_MINUTES', 'NODE_ENV']) {
    if (oldEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = oldEnvironment[key];
  }
});
beforeEach(() => {
  mail = [];
  failMail = false;
  mock.getter(BrevoClient.prototype, 'transactionalEmails', () => ({
    sendTransacEmail: async (payload) => {
      if (failMail) throw new Error('Simulated delivery failure');
      mail.push(payload);
    },
  }));
  mock.method(console, 'error', () => {});
  for (const [model, methods] of [
    [User, ['findOne', 'findById', 'create']],
    [LoginOtp, ['findById', 'create', 'updateMany', 'deleteOne', 'updateOne', 'findOneAndUpdate']],
    [PendingRegistration, ['findById', 'findOneAndUpdate', 'deleteOne', 'updateOne']],
  ]) {
    for (const method of methods) mock.method(model, method, async () => { throw new Error('Unexpected persistence operation'); });
  }
});
afterEach(() => mock.restoreAll());

const stub = (model, method, implementation) => model[method].mock.mockImplementation(implementation);
const user = () => ({ ...registration, _id: userId, password: passwordHash, role: 'student' });
const challenge = (overrides = {}) => ({
  ...registration, _id: id, user: userId, passwordHash, codeHash, attempts: 0,
  expiresAt: new Date(Date.now() + 300000), lastSentAt: new Date(Date.now() - 61000),
  createdAt: new Date(Date.now() - 61000), resendCount: 0, consumedAt: null, ...overrides,
});
function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value, options) { this.cookieValue = { name, value, options }; return this; },
    clearCookie(name, options) { this.clearedCookie = { name, options }; return this; },
  };
}
async function invoke(handler, body = {}, cookies = {}) {
  const res = response();
  await handler({ body, cookies }, res);
  return res;
}
function assertSignedIn(res, status) {
  assert.equal(res.statusCode, status);
  assert.ok(typeof res.body.accesstoken === 'string');
  const claims = jwt.verify(res.body.accesstoken, process.env.JWT_SECRET_KEY);
  assert.equal(claims.sub, userId.toString());
  assert.equal(claims.role, 'student');
  assert.equal(claims.exp - claims.iat, 15 * 60);
  assert.equal(res.cookieValue.name, 'refreshToken');
  assert.equal(res.cookieValue.options.httpOnly, true);
  assert.equal(res.cookieValue.options.sameSite, 'strict');
  assert.equal(res.cookieValue.options.maxAge, 7 * 24 * 60 * 60 * 1000);
  assert.equal(res.cookieValue.options.secure, false);
  assert.ok(!('refreshToken' in res.body));
}

test('registration rejects malformed types, IDs, names, emails, and weak/oversized passwords before persistence', async () => {
  for (const changes of [
    { studentId: 2026123456 }, { studentId: '2026123456' }, { studentId: '2026-12345' },
    { firstName: 'Ana1' }, { lastName: 'Smith@' }, { middleName: 123 }, { firstName: ' ' },
    { email: 'a@b..com' }, { email: '.name@example.invalid' }, { email: 'a..b@example.invalid' }, { email: ['student@example.invalid'] },
    { password: 'short' }, { password: 'abcdefgh' }, { password: 'Abcdefg1 ' }, { password: `Aa1!${'x'.repeat(72)}` },
  ]) {
    const res = await invoke(registerUser, { ...registration, ...changes });
    assert.equal(res.statusCode, 400);
    assert.ok(!res.body.accesstoken);
  }
  assert.equal(User.findOne.mock.callCount(), 0);
});

test('registration normalizes email/names, hashes credentials, allows non-NU email, and only creates a pending challenge', async () => {
  stub(User, 'findOne', async () => null);
  let stored;
  stub(PendingRegistration, 'findOneAndUpdate', async (filter, fields) => { stored = fields; return { ...fields, _id: id }; });
  const res = await invoke(registerUser, { ...registration, firstName: ` ${registration.firstName} `, email: ' Student@Example.Invalid ', role: 'admin' });
  assert.equal(res.statusCode, 202);
  assert.equal(stored.email, registration.email);
  assert.equal(stored.firstName, registration.firstName);
  assert.ok(await bcrypt.compare(password, stored.passwordHash));
  assert.equal(stored.role, undefined);
  assert.equal(stored.password, undefined);
  assert.equal(User.create.mock.callCount(), 0);
  assert.ok(Date.parse(res.body.expiresAt) > Date.now());
  assert.equal(res.body.retryAfterSeconds, 60);
  assert.ok(!res.body.accesstoken && !res.body.otp);
  assert.equal(mail.length, 1);
  const mailedCode = mail[0].textContent.match(/code is (\d{6})/)[1];
  assert.ok(await bcrypt.compare(mailedCode, stored.codeHash));
});

test('registration handles duplicate email and removes a challenge if email delivery fails', async () => {
  stub(User, 'findOne', async () => user());
  assert.equal((await invoke(registerUser, registration)).statusCode, 409);
  stub(User, 'findOne', async () => null);
  stub(PendingRegistration, 'findOneAndUpdate', async (filter, fields) => ({ ...fields, _id: id }));
  stub(PendingRegistration, 'deleteOne', async () => ({ deletedCount: 1 }));
  failMail = true;
  assert.equal((await invoke(registerUser, registration)).statusCode, 500);
  assert.equal(PendingRegistration.deleteOne.mock.callCount(), 1);
});

test('registration rejects a student ID already assigned to another user', async () => {
  stub(User, 'findOne', async (filter) => (
    filter.$or.some((condition) => condition.studentId === registration.studentId) ? user() : null
  ));

  const res = await invoke(registerUser, {
    ...registration,
    email: 'another-student@example.invalid',
  });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.field, 'studentId');
  assert.match(res.body.message, /student ID already exists/i);
  assert.equal(PendingRegistration.findOneAndUpdate.mock.callCount(), 0);
});

test('registration OTP reports a duplicate student ID from the database constraint', async () => {
  stub(PendingRegistration, 'findById', async () => challenge());
  stub(PendingRegistration, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(User, 'create', async () => {
    const error = new Error('duplicate student ID');
    error.code = 11000;
    error.keyPattern = { studentId: 1 };
    throw error;
  });

  const res = await invoke(verifyRegistrationOtp, { challengeId: id.toString(), otp });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.field, 'studentId');
  assert.match(res.body.message, /student ID already exists/i);
  assert.equal(PendingRegistration.updateOne.mock.callCount(), 2);
});

test('login rejects malformed input and uses the same generic error for unknown users and incorrect passwords', async () => {
  for (const body of [{}, { email: 123, password }, { email: registration.email, password: {} }, { email: 'invalid', password }]) {
    assert.equal((await invoke(loginUser, body)).statusCode, 400);
  }
  stub(User, 'findOne', async () => null);
  const missing = await invoke(loginUser, { email: registration.email, password });
  stub(User, 'findOne', async () => user());
  const incorrect = await invoke(loginUser, { email: registration.email, password: 'incorrect' });
  assert.equal(missing.body.message, incorrect.body.message);
  assert.equal(incorrect.statusCode, 400);
  assert.equal(mail.length, 0);
});

test('login sends a hashed challenge without issuing tokens and cleans it up on email failure', async () => {
  stub(User, 'findOne', async () => user());
  stub(LoginOtp, 'updateMany', async () => ({ modifiedCount: 1 }));
  let stored;
  stub(LoginOtp, 'create', async (fields) => { stored = fields; return { ...fields, _id: id }; });
  stub(LoginOtp, 'deleteOne', async () => ({ deletedCount: 1 }));
  const res = await invoke(loginUser, { email: ' STUDENT@EXAMPLE.INVALID ', password });
  assert.equal(res.statusCode, 200);
  assert.ok(!res.body.accesstoken && !res.body.otp);
  assert.equal(LoginOtp.updateMany.mock.callCount(), 1);
  const mailedCode = mail[0].textContent.match(/code is (\d{6})/)[1];
  assert.ok(await bcrypt.compare(mailedCode, stored.codeHash));
  failMail = true;
  assert.equal((await invoke(loginUser, { email: registration.email, password })).statusCode, 500);
  assert.equal(LoginOtp.deleteOne.mock.callCount(), 1);
});

for (const [label, model, verify, resend] of [
  ['login', LoginOtp, verifyLoginOtp, resendLoginOtp],
  ['registration', PendingRegistration, verifyRegistrationOtp, resendRegistrationOtp],
]) {
  test(`${label} OTP rejects malformed, missing, expired, consumed, and over-attempt challenges`, async () => {
    for (const body of [{}, { challengeId: 123, otp }, { challengeId: id.toString(), otp: [otp] }, { challengeId: id.toString(), otp: 'abc123' }]) {
      assert.equal((await invoke(verify, body)).statusCode, 400);
    }
    for (const [record, status] of [[null, 401], [challenge({ expiresAt: new Date(0) }), 401], [challenge({ consumedAt: new Date() }), 401], [challenge({ attempts: 5 }), 429]]) {
      stub(model, 'findById', async () => record);
      assert.equal((await invoke(verify, { challengeId: id.toString(), otp })).statusCode, status);
    }
    stub(model, 'findById', async () => challenge());
    stub(model, 'updateOne', async () => ({ modifiedCount: 1 }));
    assert.equal((await invoke(verify, { challengeId: id.toString(), otp: wrongOtp })).statusCode, 401);
    assert.equal(model.updateOne.mock.calls[0].arguments[1].$inc.attempts, 1);
  });

  test(`${label} resend enforces cooldown, expiry, consumption, attempts, and count limits`, async () => {
    assert.equal((await invoke(resend, { challengeId: 'invalid' })).statusCode, 400);
    for (const [record, status] of [
      [challenge({ expiresAt: new Date(0) }), 410],
      [challenge({ consumedAt: new Date() }), label === 'login' ? 401 : 404],
      [challenge({ attempts: 5 }), 429], [challenge({ resendCount: 3 }), 429],
      [challenge({ lastSentAt: new Date() }), 429],
    ]) {
      stub(model, 'findById', async () => record);
      assert.equal((await invoke(resend, { challengeId: id.toString() })).statusCode, status);
    }
    assert.equal(mail.length, 0);
  });

  test(`${label} resend rotates the hash, prevents concurrent rotation, and restores the old code on mail failure`, async () => {
    stub(model, 'findById', async () => challenge());
    stub(User, 'findById', async () => user());
    let rotated;
    stub(model, 'findOneAndUpdate', async (filter, update) => {
      rotated = { ...challenge(), ...update.$set, resendCount: 1 };
      return rotated;
    });
    stub(model, 'updateOne', async () => ({ modifiedCount: 1 }));
    const res = await invoke(resend, { challengeId: id.toString() });
    assert.equal(res.statusCode, 200);
    assert.ok(rotated.codeHash !== codeHash);
    assert.ok(await bcrypt.compare(mail[0].textContent.match(/code is (\d{6})/)[1], rotated.codeHash));
    assert.equal(res.body.retryAfterSeconds, 60);
    stub(model, 'findOneAndUpdate', async () => null);
    assert.equal((await invoke(resend, { challengeId: id.toString() })).statusCode, 409);
    assert.equal(mail.length, 1);
    stub(model, 'findOneAndUpdate', async (filter, update) => ({ ...challenge(), ...update.$set }));
    failMail = true;
    assert.equal((await invoke(resend, { challengeId: id.toString() })).statusCode, 500);
    assert.ok(model.updateOne.mock.calls[0].arguments[1].$set.codeHash === codeHash);
  });
}

test('login verification issues tokens once and rejects an already-claimed code', async () => {
  stub(LoginOtp, 'findById', async () => challenge());
  stub(User, 'findById', async () => user());
  stub(LoginOtp, 'updateOne', async () => ({ modifiedCount: 1 }));
  assertSignedIn(await invoke(verifyLoginOtp, { challengeId: id.toString(), otp }), 200);
  stub(LoginOtp, 'updateOne', async () => ({ modifiedCount: 0 }));
  const duplicate = await invoke(verifyLoginOtp, { challengeId: id.toString(), otp });
  assert.equal(duplicate.statusCode, 401);
  assert.ok(!duplicate.body.accesstoken);
});

test('registration verification claims the code, creates a student with the existing password hash, and issues tokens', async () => {
  stub(PendingRegistration, 'findById', async () => challenge());
  stub(PendingRegistration, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(PendingRegistration, 'deleteOne', async () => ({ deletedCount: 1 }));
  stub(User, 'create', async (fields) => {
    assert.ok(fields.password === passwordHash);
    assert.equal(fields.role, undefined);
    return user();
  });
  assertSignedIn(await invoke(verifyRegistrationOtp, { challengeId: id.toString(), otp }), 201);
  assert.equal(PendingRegistration.deleteOne.mock.callCount(), 1);
  stub(PendingRegistration, 'updateOne', async () => ({ modifiedCount: 0 }));
  assert.equal((await invoke(verifyRegistrationOtp, { challengeId: id.toString(), otp })).statusCode, 401);
  assert.equal(User.create.mock.callCount(), 1);
});

test('registration releases its verification claim if account creation fails', async () => {
  stub(PendingRegistration, 'findById', async () => challenge());
  stub(PendingRegistration, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(User, 'create', async () => { throw new Error('Simulated persistence failure'); });
  assert.equal((await invoke(verifyRegistrationOtp, { challengeId: id.toString(), otp })).statusCode, 500);
  assert.equal(PendingRegistration.updateOne.mock.callCount(), 2);
  assert.equal(PendingRegistration.updateOne.mock.calls[1].arguments[1].$set.consumedAt, null);
});

test('refresh rejects missing/invalid cookies, restores valid sessions, and logout uses matching cookie flags', async () => {
  assert.equal((await invoke(refreshAccessToken)).statusCode, 401);
  assert.equal((await invoke(refreshAccessToken, {}, { refreshToken: 'invalid' })).statusCode, 401);
  stub(User, 'findById', async () => user());
  const refreshToken = jwt.sign({ sub: userId.toString() }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '7d' });
  const res = await invoke(refreshAccessToken, {}, { refreshToken });
  assertSignedIn(res, 200);
  const logout = await invoke(logoutUser);
  assert.equal(logout.statusCode, 200);
  for (const key of ['httpOnly', 'sameSite', 'secure', 'path']) assert.equal(logout.clearedCookie.options[key], res.cookieValue.options[key]);
  process.env.NODE_ENV = 'production';
  assert.equal((await invoke(refreshAccessToken, {}, { refreshToken })).cookieValue.options.secure, true);
  process.env.NODE_ENV = 'test';
});

test('HTTP routes retain OTP rate limits and return distinct unauthenticated/forbidden results', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  app.get('/admin-check', authenticate, authorizeRoles('admin'), (req, res) => res.json({ allowed: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, limit] of [['resend-login-otp', 3], ['resend-registration-otp', 3], ['verify-otp', 5], ['verify-registration-otp', 5], ['login', 5], ['', 5]]) {
      for (let count = 0; count < limit; count++) {
        assert.equal((await fetch(`${base}/api/users/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
      }
      assert.equal((await fetch(`${base}/api/users/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 429);
    }
    assert.equal((await fetch(`${base}/admin-check`)).status, 401);
    const studentToken = jwt.sign({ sub: userId.toString(), role: 'student' }, process.env.JWT_SECRET_KEY);
    assert.equal((await fetch(`${base}/admin-check`, { headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
    const adminToken = jwt.sign({ sub: userId.toString(), role: 'admin' }, process.env.JWT_SECRET_KEY);
    assert.equal((await fetch(`${base}/admin-check`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
