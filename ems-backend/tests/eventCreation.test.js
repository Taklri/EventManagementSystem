import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { createEvent, updateEvent } from "../controller/createEventController.js";
import { authenticate } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/authorize.js";
import jwt from "jsonwebtoken";
import express from "express";
import eventRoutes from "../routes/EventRoutes/eventRoutes.js";

const adminId = "507f1f77bcf86cd799439011";
const organizerId = "507f1f77bcf86cd799439012";
const base = {
  title: "Campus gathering",
  description: "A student event on campus.",
  location: "Main auditorium",
  organizerName: "National University",
  startDate: "2026-10-20T09:00",
  endDate: "2026-10-20T12:00",
};
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000020000050001a5f645400000000049454e44ae426082", "hex");
const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = (body = base, file) => ({ body, file, user: { sub: adminId, role: "admin" } });
const saved = (data) => ({ ...data, toObject() { const { toObject, populate, ...fields } = this; return fields; }, async populate() { return this; } });
afterEach(() => mock.restoreAll());
beforeEach(() => {
  mock.method(User, "find", () => ({ select: async () => [] }));
});

test("creates a text-only event with campus dates and hides internal identifiers", async () => {
  mock.method(Event, "create", async (data) => saved(data));
  const res = response();
  await createEvent(request({ ...base, createdBy: organizerId, imageUrl: "https://untrusted.example/image" }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(Event.create.mock.calls[0].arguments[0].createdBy, adminId);
  assert.equal(Event.create.mock.calls[0].arguments[0].startDate.toISOString(), "2026-10-20T01:00:00.000Z");
  assert.equal(res.body.event.organizerName, "National University");
  assert.equal(res.body.event.createdBy, undefined);
  assert.equal(res.body.event.imagePublicId, undefined);
  assert.equal(res.body.event.imageUrl, undefined);
});

test("preserves existing JSON organizer requests", async () => {
  mock.method(User, "findById", async () => ({ _id: organizerId, firstName: "Campus", lastName: "Host" }));
  mock.method(Event, "create", async (data) => saved(data));
  const { organizerName, ...legacy } = base;
  const res = response();
  await createEvent(request({ ...legacy, organizer: organizerId }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.event.organizerName, "Campus Host");
  assert.equal(Event.create.mock.calls[0].arguments[0].organizer, organizerId);
});

test("rejects invalid fields and dates before persistence", async () => {
  mock.method(Event, "create", async () => { throw new Error("must not save"); });
  for (const [body, field] of [
    [{ ...base, title: "ab" }, "title"],
    [{ ...base, description: "short" }, "description"],
    [{ ...base, location: ["Hall"] }, "location"],
    [{ ...base, organizerName: " " }, "organizerName"],
    [{ ...base, startDate: "2026-02-30T09:00" }, "startDate"],
    [{ ...base, endDate: "2026-10-20T08:00" }, "endDate"],
  ]) {
    const res = response();
    await createEvent(request(body), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.field, field);
  }
  assert.equal(Event.create.mock.callCount(), 0);
});

test("rejects a new event whose start date and time have already passed", async () => {
  mock.method(Event, "create", async () => { throw new Error("must not save"); });
  const startDate = new Date(Date.now() - 60_000).toISOString();
  const endDate = new Date(Date.now() + 3_600_000).toISOString();
  const res = response();
  await createEvent(request({ ...base, startDate, endDate }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.field, "startDate");
  assert.match(res.body.message, /future/i);
  assert.equal(Event.create.mock.callCount(), 0);
});

test("accepts adjacent and gapped agenda items", async () => {
  mock.method(Event, "create", async (data) => saved(data));
  const item = (title, startDate, endDate) => ({
    title,
    startDate,
    endDate,
    speakerKeys: [],
  });

  for (const agenda of [
    [
      item("Opening", "2026-10-20T09:00", "2026-10-20T10:00"),
      item("Talk", "2026-10-20T10:00", "2026-10-20T11:00"),
    ],
    [
      item("Opening", "2026-10-20T09:00", "2026-10-20T10:00"),
      item("Talk", "2026-10-20T10:30", "2026-10-20T11:00"),
    ],
  ]) {
    const res = response();
    await createEvent(request({ ...base, agenda }), res);
    assert.equal(res.statusCode, 201);
  }
  assert.equal(Event.create.mock.callCount(), 2);
});

test("rejects overlapping and out-of-order agenda items with item issues", async () => {
  mock.method(Event, "create", async () => { throw new Error("must not save"); });
  const item = (title, startDate, endDate) => ({
    title,
    startDate,
    endDate,
    speakerKeys: [],
  });

  for (const agenda of [
    [
      item("Opening", "2026-10-20T09:00", "2026-10-20T10:00"),
      item("Talk", "2026-10-20T09:30", "2026-10-20T11:00"),
    ],
    [
      item("Opening", "2026-10-20T10:00", "2026-10-20T11:00"),
      item("Talk", "2026-10-20T09:00", "2026-10-20T09:30"),
    ],
  ]) {
    const res = response();
    await createEvent(request({ ...base, agenda }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.field, "agenda");
    assert.ok(res.body.issues.some((issue) => issue.path === "agenda.1.startDate"));
  }
  assert.equal(Event.create.mock.callCount(), 0);
});

test("the event model rejects overlapping agenda items", async () => {
  const event = new Event({
    title: "Campus gathering",
    description: "A student event on campus.",
    location: "Main auditorium",
    organizerName: "National University",
    startDate: new Date("2026-10-20T01:00:00.000Z"),
    endDate: new Date("2026-10-20T04:00:00.000Z"),
    agenda: [
      { title: "Opening", startDate: new Date("2026-10-20T01:00:00.000Z"), endDate: new Date("2026-10-20T02:00:00.000Z"), speakerKeys: [] },
      { title: "Talk", startDate: new Date("2026-10-20T01:30:00.000Z"), endDate: new Date("2026-10-20T03:00:00.000Z"), speakerKeys: [] },
    ],
  });
  await assert.rejects(event.validate(), /Agenda items must be ordered and cannot overlap/);
});

test("validates file bytes, uploads supported images, and cleans up a failed save", async () => {
  const oldConfig = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
  try {
    mock.method(cloudinary.uploader, "upload_stream", (_options, callback) => new Writable({
      write(_chunk, _encoding, done) { done(); },
      final(done) { callback(null, { secure_url: "https://res.cloudinary.com/test/event.png", public_id: "ems/events/test" }); done(); },
    }));
    mock.method(cloudinary.uploader, "destroy", async () => ({ result: "ok" }));
    mock.method(Event, "create", async (data) => saved(data));
    const invalid = response();
    await createEvent(request(base, { buffer: Buffer.from("not an image"), mimetype: "image/png" }), invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(cloudinary.uploader.upload_stream.mock.callCount(), 0);

    const good = response();
    await createEvent(request(base, { buffer: png, mimetype: "image/png" }), good);
    assert.equal(good.statusCode, 201);
    assert.equal(good.body.event.imageUrl, "https://res.cloudinary.com/test/event.png");
    assert.equal(good.body.event.imagePublicId, undefined);

    Event.create.mock.mockImplementation(async () => { throw new Error("database unavailable"); });
    const failed = response();
    await createEvent(request(base, { buffer: png, mimetype: "image/png" }), failed);
    assert.equal(failed.statusCode, 500);
    assert.equal(cloudinary.uploader.destroy.mock.callCount(), 1);
  } finally {
    for (const [key, value] of Object.entries(oldConfig)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("Cloudinary failure returns a safe error and does not create an event", async () => {
  const oldConfig = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
  try {
    mock.method(cloudinary.uploader, "upload_stream", (_options, callback) => new Writable({
      write(_chunk, _encoding, done) { done(); },
      final(done) { callback(new Error("private provider detail")); done(); },
    }));
    mock.method(Event, "create", async () => { throw new Error("must not save"); });
    const res = response();
    await createEvent(request(base, { buffer: png, mimetype: "image/png" }), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.field, "coverImage");
    assert.ok(!JSON.stringify(res.body).includes("private provider detail"));
    assert.equal(Event.create.mock.callCount(), 0);
  } finally {
    for (const [key, value] of Object.entries(oldConfig)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("updates organization name without changing legacy organizer", async () => {
  const event = saved({ ...base, isArchived: false, async save() {}, });
  mock.method(Event, "findById", async () => event);
  const res = response();
  await updateEvent({ body: { organizerName: "Student Council" }, params: { id: organizerId } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.event.organizerName, "Student Council");
});

test("preserves an unchanged legacy overlapping agenda during unrelated edits", async () => {
  const legacyAgenda = [
    { title: "Opening", startDate: new Date("2026-10-20T01:00:00.000Z"), endDate: new Date("2026-10-20T02:00:00.000Z"), speakerKeys: [] },
    { title: "Talk", startDate: new Date("2026-10-20T01:30:00.000Z"), endDate: new Date("2026-10-20T03:00:00.000Z"), speakerKeys: [] },
  ];
  const event = saved({ ...base, isArchived: false, agenda: legacyAgenda, async save() {} });
  mock.method(Event, "findById", async () => event);
  const res = response();
  await updateEvent({ body: { organizerName: "Student Council" }, params: { id: organizerId } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(event.agenda, legacyAgenda);
});

test("requires edited legacy agendas to be fixed before saving", async () => {
  const event = saved({
    ...base,
    isArchived: false,
    agenda: [
      { title: "Opening", startDate: new Date("2026-10-20T01:00:00.000Z"), endDate: new Date("2026-10-20T02:00:00.000Z"), speakerKeys: [] },
      { title: "Talk", startDate: new Date("2026-10-20T02:30:00.000Z"), endDate: new Date("2026-10-20T03:00:00.000Z"), speakerKeys: [] },
    ],
  });
  mock.method(Event, "findById", async () => event);
  const res = response();
  await updateEvent({
    body: {
      organizerName: "Student Council",
      agenda: [
        { title: "Opening", startDate: "2026-10-20T09:00", endDate: "2026-10-20T10:00", speakerKeys: [] },
        { title: "Talk", startDate: "2026-10-20T09:30", endDate: "2026-10-20T11:00", speakerKeys: [] },
      ],
    },
    params: { id: organizerId },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.field, "agenda");
  assert.ok(res.body.issues.some((issue) => issue.path === "agenda.1.startDate"));
});

test("missing tokens receive 401, students receive 403, and admins pass the event guard", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-only-signing-key";
  mock.method(User, "findById", async () => ({ _id: adminId }));
  try {
    const denied = response();
    await authenticate({ headers: {} }, denied, () => { throw new Error("must not pass"); });
    assert.equal(denied.statusCode, 401);

    for (const [role, expected] of [["student", 403], ["admin", 200]]) {
      const token = jwt.sign({ sub: adminId, role }, process.env.JWT_SECRET_KEY);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = response();
      let passed = false;
      await authenticate(req, res, () => authorizeRoles("admin")(req, res, () => { passed = true; }));
      assert.equal(passed, role === "admin");
      assert.equal(res.statusCode || 200, expected);
    }
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});

test("HTTP create route enforces roles before parsing uploads and limits image size", async () => {
  const oldSecret = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-only-signing-key";
  mock.method(User, "findById", async () => ({ _id: adminId }));
  mock.method(Event, "create", async (data) => saved(data));
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventRoutes);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/events`;
    const studentToken = jwt.sign({ sub: adminId, role: "student" }, process.env.JWT_SECRET_KEY);
    const adminToken = jwt.sign({ sub: adminId, role: "admin" }, process.env.JWT_SECRET_KEY);
    const anonymous = await fetch(url, { method: "POST", body: new FormData() });
    assert.equal(anonymous.status, 401);
    const student = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${studentToken}` }, body: new FormData() });
    assert.equal(student.status, 403);

    const image = new FormData();
    for (const [key, value] of Object.entries(base)) image.set(key, value);
    image.set("coverImage", new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "image/png" }), "large.png");
    const tooLarge = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${adminToken}` }, body: image });
    assert.equal(tooLarge.status, 413);

    const json = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });
    assert.equal(json.status, 201);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (oldSecret === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = oldSecret;
  }
});
