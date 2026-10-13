import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, mock, test } from 'node:test';
import { Writable } from 'node:stream';
import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { BrevoClient } from '@getbrevo/brevo';
import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import ProfileEmailOtp from '../models/ProfileEmailOtp.js';
import ProfilePasswordOtp from '../models/ProfilePasswordOtp.js';
import { updateUser } from '../controller/userController.js';
import {
  getMyProfile,
  updateMyProfile,
  updateMyPhoto,
  requestEmailChange,
  verifyEmailChange,
  requestPasswordChange,
  verifyPasswordChange,
} from '../controller/profileController.js';
import userRoutes from '../routes/UserRoutes/userRoutes.js';

const userId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const challengeId = new mongoose.Types.ObjectId();
const otp = String(randomInt(100000, 1000000));
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000020000050001a5f645400000000049454e44ae426082', 'hex');
const oldEnvironment = { ...process.env };
let codeHash;
let currentHash;
let mail;

before(async () => {
  process.env.JWT_SECRET_KEY = randomUUID();
  process.env.JWT_REFRESH_SECRET_KEY = randomUUID();
  process.env.OTP_RESEND_SECONDS = '60';
  process.env.OTP_EXPIRES_MINUTES = '5';
  process.env.NODE_ENV = 'test';
  process.env.CLOUDINARY_CLOUD_NAME = 'test';
  process.env.CLOUDINARY_API_KEY = 'test';
  process.env.CLOUDINARY_API_SECRET = 'test';
  codeHash = await bcrypt.hash(otp, 4);
  currentHash = await bcrypt.hash('Current-1aA!', 4);
});

after(() => {
  for (const key of ['JWT_SECRET_KEY', 'JWT_REFRESH_SECRET_KEY', 'OTP_RESEND_SECONDS', 'OTP_EXPIRES_MINUTES', 'NODE_ENV', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (oldEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = oldEnvironment[key];
  }
});

beforeEach(() => {
  mail = [];
  mock.getter(BrevoClient.prototype, 'transactionalEmails', () => ({
    sendTransacEmail: async (payload) => { mail.push(payload); },
  }));
  mock.method(console, 'error', () => {});
  for (const [model, methods] of [
    [User, ['findById', 'findOne', 'findByIdAndUpdate']],
    [PendingRegistration, ['findOne']],
    [ProfileEmailOtp, ['updateMany', 'create', 'deleteOne', 'findById', 'updateOne']],
    [ProfilePasswordOtp, ['updateMany', 'create', 'deleteOne', 'findById', 'updateOne']],
  ]) {
    for (const method of methods) mock.method(model, method, async () => { throw new Error(`Unexpected ${model.modelName}.${method}`); });
  }
});

afterEach(() => mock.restoreAll());

const stub = (model, method, implementation) => model[method].mock.mockImplementation(implementation);
const found = (user) => ({ select: async () => user });

const buildUser = (overrides = {}) => {
  const record = {
    _id: userId,
    studentId: '2026-123456',
    firstName: 'Ada',
    middleName: '',
    lastName: 'Lovelace',
    email: 'ada@example.invalid',
    role: 'student',
    imageUrl: null,
    imagePublicId: null,
    password: currentHash,
    ...overrides,
  };
  record.save = async () => record;
  return record;
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie() { return this; },
});

const authed = (role = 'student', body = {}, file) => ({
  user: { sub: userId.toString(), role },
  body,
  file,
});

test('profile updates a student ID and rejects one already used by a user or pending registration', async () => {
  const student = buildUser();
  stub(User, 'findById', () => found(student));
  stub(User, 'findOne', async () => null);
  stub(PendingRegistration, 'findOne', async () => null);
  const saved = response();
  await updateMyProfile(authed('student', {
    firstName: 'Ada', middleName: '', lastName: 'Lovelace', studentId: '2026-654321',
  }), saved);
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.body.user.studentId, '2026-654321');

  stub(User, 'findOne', async () => ({ _id: otherId }));
  const duplicate = response();
  await updateMyProfile(authed('student', {
    firstName: 'Ada', middleName: '', lastName: 'Lovelace', studentId: '2026-111111',
  }), duplicate);
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.body.field, 'studentId');

  stub(User, 'findOne', async () => null);
  stub(PendingRegistration, 'findOne', async () => ({ _id: otherId }));
  const pending = response();
  await updateMyProfile(authed('student', {
    firstName: 'Ada', middleName: '', lastName: 'Lovelace', studentId: '2026-222222',
  }), pending);
  assert.equal(pending.statusCode, 409);
});

test('an admin profile update changes the name and leaves the student ID unchanged', async () => {
  const admin = buildUser({ role: 'admin', studentId: '2026-000001' });
  stub(User, 'findById', () => found(admin));
  const res = response();
  await updateMyProfile(authed('admin', {
    firstName: 'Grace', middleName: '', lastName: 'Hopper', studentId: '2026-999999',
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.studentId, undefined);
  assert.equal(admin.studentId, '2026-000001');
  assert.equal(admin.firstName, 'Grace');
  const loaded = response();
  await getMyProfile(authed('admin'), loaded);
  assert.equal(loaded.body.user.studentId, undefined);
  assert.equal(loaded.body.user.firstName, 'Grace');
});

test('email change sends the code to the current address and applies the new address only after verification', async () => {
  const student = buildUser();
  let challenge;
  stub(User, 'findById', () => found(student));
  stub(User, 'findOne', async () => null);
  stub(PendingRegistration, 'findOne', async () => null);
  stub(ProfileEmailOtp, 'updateMany', async () => ({ modifiedCount: 1 }));
  stub(ProfileEmailOtp, 'create', async (data) => {
    challenge = { ...data, _id: challengeId };
    return challenge;
  });
  const requested = response();
  const wrongPassword = response();
  await requestEmailChange(authed('student', { email: 'new@example.invalid', currentPassword: 'wrong' }), wrongPassword);
  assert.equal(wrongPassword.statusCode, 401);
  await requestEmailChange(authed('student', { email: 'new@example.invalid', currentPassword: 'Current-1aA!' }), requested);
  assert.equal(requested.statusCode, 200);
  assert.equal(student.email, 'ada@example.invalid');
  assert.equal(mail[0].to[0].email, 'ada@example.invalid');
  assert.equal(challenge.pendingEmail, 'new@example.invalid');
  assert.equal(requested.body.user, undefined);

  stub(ProfileEmailOtp, 'findById', async () => ({ ...challenge, codeHash, attempts: 0, consumedAt: null, expiresAt: new Date(Date.now() + 60000), user: userId }));
  stub(ProfileEmailOtp, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(User, 'findByIdAndUpdate', async (_id, update) => ({ ...student, email: update.$set.email }));
  const verified = response();
  await verifyEmailChange(authed('student', { challengeId: challengeId.toString(), otp }), verified);
  assert.equal(verified.statusCode, 200);
  assert.equal(verified.body.user.email, 'new@example.invalid');
});

test('a failed email verification releases the code when the address is taken', async () => {
  const student = buildUser();
  let released = false;
  stub(User, 'findById', () => found(student));
  stub(User, 'findOne', async () => ({ _id: otherId }));
  stub(PendingRegistration, 'findOne', async () => null);
  stub(ProfileEmailOtp, 'findById', async () => ({
    _id: challengeId, user: userId, pendingEmail: 'taken@example.invalid', codeHash, attempts: 0,
    consumedAt: null, expiresAt: new Date(Date.now() + 60000),
  }));
  stub(ProfileEmailOtp, 'updateOne', async (_query, update) => {
    if (update.$set?.consumedAt === null) released = true;
    return { modifiedCount: 1 };
  });
  const res = response();
  await verifyEmailChange(authed('student', { challengeId: challengeId.toString(), otp }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(released, true);
  assert.equal(student.email, 'ada@example.invalid');
});

test('password change stores a hash, then replaces the session after a valid code', async () => {
  const student = buildUser();
  let challenge;
  let passwordUpdate;
  stub(User, 'findById', () => found(student));
  stub(ProfilePasswordOtp, 'updateMany', async () => ({ modifiedCount: 1 }));
  stub(ProfilePasswordOtp, 'create', async (data) => {
    challenge = { ...data, _id: challengeId };
    return challenge;
  });
  const requested = response();
  await requestPasswordChange(authed('student', { password: 'Replacement-1aA!', currentPassword: 'Current-1aA!' }), requested);
  assert.equal(requested.statusCode, 200);
  assert.notEqual(challenge.passwordHash, 'Replacement-1aA!');
  assert.equal(await bcrypt.compare('Replacement-1aA!', challenge.passwordHash), true);
  assert.equal(mail[0].to[0].email, student.email);

  stub(ProfilePasswordOtp, 'findById', async () => ({ ...challenge, codeHash, attempts: 0, consumedAt: null, expiresAt: new Date(Date.now() + 60000), user: userId }));
  stub(ProfilePasswordOtp, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(User, 'findByIdAndUpdate', async (_id, update) => {
    passwordUpdate = update.$set;
    return { ...student, passwordChangedAt: passwordUpdate.passwordChangedAt };
  });
  const verified = response();
  await verifyPasswordChange(authed('student', { challengeId: challengeId.toString(), otp }), verified);
  assert.equal(verified.statusCode, 200);
  assert.equal(typeof verified.body.accesstoken, 'string');
  assert.ok(passwordUpdate.passwordChangedAt instanceof Date);
  assert.equal(passwordUpdate.password, challenge.passwordHash);
});

test('another user cannot verify a profile code and the legacy profile update ignores email', async () => {
  stub(ProfileEmailOtp, 'findById', async () => ({
    _id: challengeId, user: otherId, pendingEmail: 'new@example.invalid', codeHash, attempts: 0,
    consumedAt: null, expiresAt: new Date(Date.now() + 60000),
  }));
  const denied = response();
  await verifyEmailChange(authed('student', { challengeId: challengeId.toString(), otp }), denied);
  assert.equal(denied.statusCode, 401);

  const record = buildUser();
  stub(User, 'findById', async () => record);
  const updated = response();
  await updateUser({
    user: { sub: userId.toString(), role: 'student' },
    params: { id: userId.toString() },
    body: { email: 'changed@example.invalid', firstName: 'Ada' },
  }, updated);
  assert.equal(updated.statusCode, 200);
  assert.equal(record.email, 'ada@example.invalid');
});

test('profile photo upload accepts a PNG and rejects a file that is not an image', async () => {
  const student = buildUser({ imagePublicId: 'ems/profiles/old' });
  stub(User, 'findById', () => found(student));
  mock.method(cloudinary.uploader, 'upload_stream', (_options, callback) => new Writable({
    write(_chunk, _encoding, done) { done(); },
    final(done) {
      callback(null, { secure_url: 'https://res.cloudinary.com/test/profile.png', public_id: 'ems/profiles/new' });
      done();
    },
  }));
  mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
  const invalid = response();
  await updateMyPhoto(authed('student', {}, { buffer: Buffer.from('not an image'), mimetype: 'image/png' }), invalid);
  assert.equal(invalid.statusCode, 400);
  const saved = response();
  await updateMyPhoto(authed('student', {}, { buffer: png, mimetype: 'image/png' }), saved);
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.body.user.imageUrl, 'https://res.cloudinary.com/test/profile.png');
  assert.equal(saved.body.user.imagePublicId, undefined);
});

test('profile routes reject a missing token', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users/me`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
