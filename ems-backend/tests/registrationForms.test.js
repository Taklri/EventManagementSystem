import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import RegistrationForm from "../models/RegistrationForm.js";
import {
  archiveRegistrationForm,
  createRegistrationForm,
  listRegistrationForms,
  unarchiveRegistrationForm,
  updateRegistrationForm,
} from "../controller/registrationFormController.js";
import Event from "../models/Event.js";
import { cleanupArchivedRegistrationForms } from "../services/registrationFormCleanupService.js";

const userId = "507f1f77bcf86cd799439012";
const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

afterEach(() => mock.restoreAll());

test("registration form creation validates, normalizes, and returns the current form", async () => {
  mock.method(RegistrationForm, "create", async (data) => ({
    _id: "507f1f77bcf86cd799439011",
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const res = response();
  await createRegistrationForm({
    user: { sub: userId },
    body: {
      name: "  Leadership Summit  ",
      description: "Student leadership registration",
      items: [{ key: "track", type: "radio", label: "Preferred track", required: true, options: ["A", "B"] }],
    },
  }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.form.name, "Leadership Summit");
  assert.equal(res.body.form.items[0].options[1], "B");
});

test("form updates keep the same current document and archive state can be reversed", async () => {
  const form = {
    _id: "507f1f77bcf86cd799439011",
    name: "Old form",
    normalizedName: "old form",
    description: "",
    items: [],
    isArchived: false,
    archivedAt: null,
    save: mock.fn(async function save() { return this; }),
  };
  mock.method(RegistrationForm, "findById", async () => form);
  const update = response();
  await updateRegistrationForm({ params: { id: form._id }, user: { sub: userId }, body: { name: "Updated form", items: [] } }, update);
  assert.equal(update.statusCode, 200);
  assert.equal(form.name, "Updated form");
  assert.equal(form.version, undefined);

  const archive = response();
  await archiveRegistrationForm({ params: { id: form._id }, user: { sub: userId } }, archive);
  assert.equal(form.isArchived, true);
  assert.ok(form.archivedAt);
  const restore = response();
  await unarchiveRegistrationForm({ params: { id: form._id }, user: { sub: userId } }, restore);
  assert.equal(form.isArchived, false);
  assert.equal(form.archivedAt, null);
});

test("form list applies active status, search, and pagination", async () => {
  mock.method(RegistrationForm, "countDocuments", async () => 1);
  mock.method(RegistrationForm, "find", () => ({
    sort: () => ({ skip: () => ({ limit: async () => [{ _id: "1", name: "Volunteer form", items: [], isArchived: false }] }) }),
  }));
  const res = response();
  await listRegistrationForms({ query: { page: "1", limit: "10", status: "active", search: "vol" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.forms[0].name, "Volunteer form");
  assert.equal(res.body.pagination.total, 1);
});

test("cleanup removes old unreferenced archives and preserves attached forms", async () => {
  mock.method(Event, "distinct", async () => ["507f1f77bcf86cd799439011"]);
  mock.method(RegistrationForm, "deleteMany", async (filter) => {
    assert.equal(filter.isArchived, true);
    assert.deepEqual(filter._id, { $nin: ["507f1f77bcf86cd799439011"] });
    return { deletedCount: 2 };
  });
  assert.equal(await cleanupArchivedRegistrationForms({ now: new Date("2026-10-13T00:00:00Z") }), 2);
});
