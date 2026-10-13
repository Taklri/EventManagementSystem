import mongoose from "mongoose";
import Event from "../models/Event.js";
import RegistrationForm from "../models/RegistrationForm.js";
import { normalizeRegistrationForm } from "../utils/registrationForm.js";

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

export { formPayload };
