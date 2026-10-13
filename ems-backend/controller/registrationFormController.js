import mongoose from "mongoose";
import Event from "../models/Event.js";
import EventRegistration from "../models/EventRegistration.js";
import RegistrationForm from "../models/RegistrationForm.js";
import User from "../models/User.js";
import { normalizeRegistrationForm } from "../utils/registrationForm.js";
import { createRegistrationResponsesWorkbook } from "../services/registrationFormExportService.js";

const parsePage = (value, fallback, max = 100) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null;
};

const normalizeName = (name) => name.trim().replace(/\s+/g, " ");
const formPayload = (form) => ({
  _id: form._id,
  name: form.name,
  description: form.description || "",
  items: form.items || [],
  version: form.version || 1,
  isArchived: Boolean(form.isArchived),
  archivedAt: form.archivedAt || null,
  createdAt: form.createdAt,
  updatedAt: form.updatedAt,
});

const parseItems = (value) => {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
};

const validateFormBody = (body = {}) => {
  if (typeof body.name !== "string") return { error: "Form name is required", field: "name" };
  const name = normalizeName(body.name);
  if (name.length < 3 || name.length > 120) return { error: "Form name must be 3 to 120 characters long", field: "name" };
  const description = body.description === undefined ? "" : body.description;
  if (typeof description !== "string" || description.trim().length > 500) return { error: "Description must be 500 characters or fewer", field: "description" };
  const items = parseItems(body.items);
  if (!items) return { error: "Items must be a valid array", field: "items" };
  const normalized = normalizeRegistrationForm(items);
  if (normalized.issues) return { error: "Please fix the registration form.", field: "items", issues: normalized.issues };
  return { value: { name, normalizedName: name.toLocaleLowerCase(), description: description.trim(), items: normalized.value.items } };
};

const duplicateName = (error) => error?.code === 11000 && Boolean(error?.keyPattern?.normalizedName);

export const listRegistrationForms = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parsePage(req.query.limit, 10, 50);
    const status = req.query.status || "active";
    if (!page || !limit || !["active", "archived", "all"].includes(status)) return res.status(400).json({ message: "Invalid registration form filters" });
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = status === "active" ? { isArchived: false } : status === "archived" ? { isArchived: true } : {};
    if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const [total, forms] = await Promise.all([
      RegistrationForm.countDocuments(filter),
      RegistrationForm.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({ forms: forms.map(formPayload), pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 } });
  } catch (error) {
    console.error("Registration form list failed", error);
    return res.status(500).json({ message: "Unable to load registration forms" });
  }
};

export const createRegistrationForm = async (req, res) => {
  const validated = validateFormBody(req.body);
  if (validated.error) return res.status(400).json({ message: validated.error, field: validated.field, ...(validated.issues ? { issues: validated.issues } : {}) });
  try {
    const form = await RegistrationForm.create({ ...validated.value, createdBy: req.user.sub, updatedBy: req.user.sub });
    return res.status(201).json({ message: "Registration form created successfully", form: formPayload(form) });
  } catch (error) {
    if (duplicateName(error)) return res.status(409).json({ message: "A registration form with this name already exists", field: "name" });
    console.error("Registration form creation failed", error);
    return res.status(500).json({ message: "Unable to create registration form" });
  }
};

export const getRegistrationFormById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Registration form id is not valid" });
  try {
    const form = await RegistrationForm.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Registration form not found" });
    return res.status(200).json({ form: formPayload(form) });
  } catch (error) {
    console.error("Registration form read failed", error);
    return res.status(500).json({ message: "Unable to load registration form" });
  }
};

export const updateRegistrationForm = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Registration form id is not valid" });
  const validated = validateFormBody(req.body);
  if (validated.error) return res.status(400).json({ message: validated.error, field: validated.field, ...(validated.issues ? { issues: validated.issues } : {}) });
  try {
    const form = await RegistrationForm.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Registration form not found" });
    form.name = validated.value.name;
    form.normalizedName = validated.value.normalizedName;
    form.description = validated.value.description;
    form.items = validated.value.items;
    form.updatedBy = req.user.sub;
    await form.save();
    return res.status(200).json({ message: "Registration form updated successfully", form: formPayload(form) });
  } catch (error) {
    if (duplicateName(error)) return res.status(409).json({ message: "A registration form with this name already exists", field: "name" });
    console.error("Registration form update failed", error);
    return res.status(500).json({ message: "Unable to update registration form" });
  }
};

const setArchived = (archived) => async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Registration form id is not valid" });
  try {
    const form = await RegistrationForm.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Registration form not found" });
    form.isArchived = archived;
    form.archivedAt = archived ? (form.archivedAt || new Date()) : null;
    form.updatedBy = req.user.sub;
    await form.save();
    return res.status(200).json({ message: archived ? "Registration form archived" : "Registration form unarchived", form: formPayload(form) });
  } catch (error) {
    console.error("Registration form archive update failed", error);
    return res.status(500).json({ message: "Unable to update registration form status" });
  }
};

export const archiveRegistrationForm = setArchived(true);
export const unarchiveRegistrationForm = setArchived(false);

const responsePage = (value, fallback, max = 100) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const responseStudentSelect =
  "firstName middleName lastName studentId program yearLevel";

const responsePayload = (response) => ({
  _id: response._id,
  status: response.status,
  submittedAt: response.submittedAt || null,
  registeredAt: response.registeredAt || null,
  cancelledAt: response.cancelledAt || null,
  formVersion: response.formVersion || 1,
  answers: response.answers || [],
  student: response.student
    ? {
        name: [
          response.student.firstName,
          response.student.middleName,
          response.student.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        studentId: response.student.studentId,
        program: response.student.program,
        yearLevel: response.student.yearLevel,
      }
    : null,
  event: response.event
    ? {
        _id: response.event._id,
        title: response.event.title,
        startDate: response.event.startDate,
        endDate: response.event.endDate,
      }
    : null,
});

const findFormResponseRows = async ({ formId, search = "" }) => {
  const events = await Event.find({ registrationFormId: formId })
    .select("_id")
    .lean();
  if (!events.length) return [];

  let matchingStudentIds;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    const students = await User.find({
      $or: [
        { studentId: pattern },
        { firstName: pattern },
        { middleName: pattern },
        { lastName: pattern },
        { program: pattern },
        { yearLevel: pattern },
      ],
    })
      .select("_id")
      .lean();
    matchingStudentIds = students.map((student) => student._id);
  }

  const filter = {
    event: { $in: events.map((event) => event._id) },
    ...(matchingStudentIds ? { student: { $in: matchingStudentIds } } : {}),
  };
  return EventRegistration.find(filter)
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .populate("student", responseStudentSelect)
    .populate("event", "title startDate endDate");
};

const getFormForResponses = async (id) => {
  if (!mongoose.isValidObjectId(id)) return { error: { status: 400, message: "Registration form id is not valid" } };
  const form = await RegistrationForm.findById(id);
  if (!form) return { error: { status: 404, message: "Registration form not found" } };
  return { form };
};

export const getRegistrationFormResponses = async (req, res) => {
  const result = await getFormForResponses(req.params.id);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  const page = responsePage(req.query.page, 1);
  const limit = responsePage(req.query.limit, 20, 100);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (!page || !limit || search.length > 100) return res.status(400).json({ message: "Invalid response list filters" });
  try {
    const rows = await findFormResponseRows({ formId: result.form._id, search });
    const total = rows.length;
    const pagedRows = rows.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      form: formPayload(result.form),
      responses: pagedRows.map(responsePayload),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
  } catch (error) {
    console.error("Registration form responses failed", error);
    return res.status(500).json({ message: "Unable to load registration form responses" });
  }
};

export const getRegistrationFormResponseById = async (req, res) => {
  const result = await getFormForResponses(req.params.id);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  if (!mongoose.isValidObjectId(req.params.responseId)) return res.status(400).json({ message: "Registration response id is not valid" });
  try {
    const rows = await EventRegistration.find({
      _id: req.params.responseId,
      event: { $in: (await Event.find({ registrationFormId: result.form._id }).select("_id").lean()).map((event) => event._id) },
    })
      .limit(1)
      .populate("student", responseStudentSelect)
      .populate("event", "title startDate endDate");
    if (!rows[0]) return res.status(404).json({ message: "Registration response not found" });
    return res.status(200).json({ form: formPayload(result.form), response: responsePayload(rows[0]) });
  } catch (error) {
    console.error("Registration form response read failed", error);
    return res.status(500).json({ message: "Unable to load registration response" });
  }
};

export const exportRegistrationFormResponses = async (req, res) => {
  const result = await getFormForResponses(req.params.id);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length > 100) return res.status(400).json({ message: "Invalid response export filters" });
  try {
    const rows = await findFormResponseRows({ formId: result.form._id, search });
    const workbook = createRegistrationResponsesWorkbook({
      form: result.form,
      responses: rows.map(responsePayload),
    });
    const safeName = result.form.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "registration-form";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=\"${safeName}-responses.xlsx\"`);
    return res.status(200).send(workbook);
  } catch (error) {
    console.error("Registration form response export failed", error);
    return res.status(500).json({ message: "Unable to export registration form responses" });
  }
};

export { formPayload };
