import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import Event from "../models/Event.js";
import EventAttendance from "../models/EventAttendance.js";
import EventRegistration from "../models/EventRegistration.js";
import User from "../models/User.js";
import { registerForEvent } from "../controller/eventRegistrationController.js";
import { previewAttendance, recordAttendance } from "../controller/eventAttendanceController.js";
import { createEvent } from "../controller/createEventController.js";
import { normalizeRegistrationForm, validateRegistrationAnswers } from "../utils/registrationForm.js";
import eventRoutes from "../routes/EventRoutes/eventRoutes.js";
import adminRoutes from "../routes/AdminRoutes/adminRoutes.js";

const eventId = "507f1f77bcf86cd799439011";
const studentId = "507f1f77bcf86cd799439012";
const form = {
  version: 1,
  items: [
    { key: "course", label: "Course", type: "shortText", required: true, options: [] },
    { key: "session", label: "Session", type: "dropdown", required: true, options: ["Morning", "Afternoon"] },
    { key: "notes", label: "Notes", type: "instructions", required: false, options: [] },
  ],
};
const event = () => ({
  _id: eventId,
  title: "Campus workshop",
  registrationMode: "required",
  registrationForm: form,
  startDate: new Date(Date.now() + 60_000),
  endDate: new Date(Date.now() + 3_600_000),
  isArchived: false,
});
const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const lookup = (value) => ({ select: async () => value });

afterEach(() => mock.restoreAll());

test("registration form validates item definitions and submitted answers", () => {
  assert.ok(normalizeRegistrationForm({ items: Array(13).fill(form.items[0]) }).issues);
  assert.ok(normalizeRegistrationForm({ items: [{ ...form.items[0], type: "unknown" }] }).issues);
  assert.ok(normalizeRegistrationForm({ items: [{ ...form.items[2], required: true }] }).issues);
  assert.deepEqual(
    validateRegistrationAnswers(form, [{ key: "course", value: "  Engineering  " }, { key: "session", value: "Morning" }]).value,
    [{ key: "course", label: "Course", value: "Engineering" }, { key: "session", label: "Session", value: "Morning" }],
  );
  for (const answers of [
    [{ key: "course", value: "" }, { key: "session", value: "Morning" }],
    [{ key: "course", value: "Engineering" }, { key: "session", value: "Evening" }],
    [{ key: "course", value: "Engineering" }, { key: "session", value: "Morning" }, { key: "unknown", value: "x" }],
    [{ key: "course", value: "Engineering" }, { key: "session", value: "Morning" }, { key: "notes", value: "x" }],
  ]) {
    assert.ok(validateRegistrationAnswers(form, answers).issues);
  }
});

test("event creation accepts a form and rejects questions on open events", async () => {
  mock.method(Event, "create", async (data) => ({
    ...data,
    toObject() { return { ...data }; },
    async populate() { return this; },
  }));
  const base = {
    title: "Campus workshop",
    description: "A student workshop on campus.",
    location: "Main auditorium",
    organizerName: "National University",
    startDate: "2026-10-20T09:00",
    endDate: "2026-10-20T12:00",
    registrationForm: { items: [form.items[0]] },
  };
  const open = response();
  await createEvent({ body: { ...base, registrationMode: "none" }, user: { sub: studentId, role: "admin" } }, open);
  assert.equal(open.statusCode, 400);
  assert.equal(Event.create.mock.callCount(), 0);

  const required = response();
  await createEvent({ body: { ...base, registrationMode: "required" }, user: { sub: studentId, role: "admin" } }, required);
  assert.equal(required.statusCode, 201);
  assert.equal(Event.create.mock.calls[0].arguments[0].registrationForm.items[0].key, "course");
});

test("registration persists only after valid form submission and assigns waitlist status", async () => {
  mock.method(Event, "findById", async () => ({ ...event(), capacity: 1 }));
  mock.method(EventRegistration, "findOne", async () => null);
  mock.method(EventRegistration, "countDocuments", async () => 1);
  mock.method(EventRegistration.prototype, "save", async function save() { return this; });
  const req = { params: { id: eventId }, user: { sub: studentId }, body: { answers: [] } };
  const invalid = response();
  await registerForEvent(req, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(EventRegistration.prototype.save.mock.callCount(), 0);

  req.body.answers = [{ key: "course", value: "Engineering" }, { key: "session", value: "Morning" }];
  const valid = response();
  await registerForEvent(req, valid);
  assert.equal(valid.statusCode, 201);
  assert.equal(valid.body.registration.status, "waitlisted");
  assert.equal(valid.body.registration.answers[0].value, "Engineering");
  assert.equal(EventRegistration.prototype.save.mock.callCount(), 1);
});

test("attendance preview does not save; confirmation records time in then time out", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-attendance-secret";
  try {
    const activeEvent = { ...event(), startDate: new Date(Date.now() - 60_000) };
    let attendance = null;
    mock.method(Event, "findById", async () => activeEvent);
    mock.method(EventRegistration, "findOne", async () => ({ status: "registered" }));
    mock.method(EventAttendance, "findOne", async () => attendance);
    mock.method(User, "findById", () => lookup({ _id: studentId, firstName: "Student", lastName: "One", studentId: "2026-001" }));
    mock.method(EventAttendance, "create", async (data) => { attendance = { _id: eventId, ...data }; return attendance; });
    mock.method(EventAttendance, "findOneAndUpdate", async (_filter, update) => {
      attendance = { ...attendance, ...update.$set };
      return attendance;
    });
    const token = jwt.sign({ purpose: "event-attendance", eventId }, process.env.JWT_SECRET_KEY, { expiresIn: 60 });
    const req = { params: { id: eventId }, user: { sub: studentId }, body: { token } };
    const preview = response();
    await previewAttendance(req, preview);
    assert.equal(preview.body.action, "timeIn");
    assert.equal(EventAttendance.create.mock.callCount(), 0);

    const timeIn = response();
    await recordAttendance(req, timeIn);
    assert.equal(timeIn.statusCode, 201);
    assert.equal(timeIn.body.attendance.studentId, "2026-001");
    const firstTime = attendance.timeIn;

    const nextPreview = response();
    await previewAttendance(req, nextPreview);
    assert.equal(nextPreview.body.action, "timeOut");
    const timeOut = response();
    await recordAttendance(req, timeOut);
    assert.equal(timeOut.statusCode, 200);
    assert.equal(EventAttendance.findOneAndUpdate.mock.calls[0].arguments[0].timeOut, null);
    assert.equal(attendance.timeIn, firstTime);
    assert.ok(attendance.timeOut);

    const completed = response();
    await recordAttendance(req, completed);
    assert.equal(completed.statusCode, 409);
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});

test("attendance rejects expired, wrong-event, and early QR scans", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-attendance-secret";
  try {
    const scheduled = event();
    mock.method(Event, "findById", async () => scheduled);
    mock.method(EventRegistration, "findOne", async () => ({ status: "registered" }));
    mock.method(EventAttendance, "findOne", async () => null);
    const req = { params: { id: eventId }, user: { sub: studentId }, body: { token: "" } };

    req.body.token = jwt.sign({ purpose: "event-attendance", eventId }, process.env.JWT_SECRET_KEY, { expiresIn: -1 });
    const expired = response();
    await previewAttendance(req, expired);
    assert.equal(expired.statusCode, 400);

    req.body.token = jwt.sign({ purpose: "event-attendance", eventId: studentId }, process.env.JWT_SECRET_KEY, { expiresIn: 60 });
    const wrongEvent = response();
    await previewAttendance(req, wrongEvent);
    assert.equal(wrongEvent.statusCode, 400);

    req.body.token = jwt.sign({ purpose: "event-attendance", eventId }, process.env.JWT_SECRET_KEY, { expiresIn: 60 });
    scheduled.startDate = new Date(Date.now() + 3_600_000);
    scheduled.endDate = new Date(Date.now() + 7_200_000);
    const early = response();
    await previewAttendance(req, early);
    assert.equal(early.statusCode, 400);
    assert.match(early.body.message, /not open yet/);
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});

test("attendance rejects open events and waitlisted students before saving", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-attendance-secret";
  try {
    const activeEvent = { ...event(), startDate: new Date(Date.now() - 60_000) };
    mock.method(Event, "findById", async () => activeEvent);
    mock.method(EventRegistration, "findOne", async () => null);
    mock.method(EventAttendance, "create", async () => { throw new Error("Must not save"); });
    const token = jwt.sign({ purpose: "event-attendance", eventId }, process.env.JWT_SECRET_KEY, { expiresIn: 60 });
    const req = { params: { id: eventId }, user: { sub: studentId }, body: { token } };

    const waitlisted = response();
    await recordAttendance(req, waitlisted);
    assert.equal(waitlisted.statusCode, 403);
    activeEvent.registrationMode = "none";
    const open = response();
    await recordAttendance(req, open);
    assert.equal(open.statusCode, 400);
    assert.equal(EventAttendance.create.mock.callCount(), 0);
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});

test("new form, roster, and QR routes enforce student and admin roles", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-registration-route-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventRoutes);
  app.use("/api/admin", adminRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const studentToken = jwt.sign({ sub: studentId, role: "student" }, process.env.JWT_SECRET_KEY);
    const adminToken = jwt.sign({ sub: studentId, role: "admin" }, process.env.JWT_SECRET_KEY);
    const formPath = `/api/events/${eventId}/registration/form`;
    const rosterPath = `/api/admin/events/${eventId}/registrations`;
    const qrPath = `/api/admin/events/${eventId}/attendance/session`;

    assert.equal((await fetch(`${base}${formPath}`)).status, 401);
    assert.equal((await fetch(`${base}${formPath}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 403);
    assert.equal((await fetch(`${base}${rosterPath}`)).status, 401);
    assert.equal((await fetch(`${base}${rosterPath}`, { headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
    assert.equal((await fetch(`${base}${qrPath}`, { method: "POST", headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});
