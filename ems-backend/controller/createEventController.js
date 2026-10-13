import Event, { EVENT_TYPES } from "../models/Event.js";
import User from "../models/User.js";
import { withStatus } from "../utils/eventStatus.js";
import mongoose from "mongoose";
import { fileTypeFromBuffer } from "file-type";
import { uploadEventImage, removeEventImage } from "../services/eventImageService.js";
import { notifyAllStudents } from "../services/notificationService.js";
import EventRegistration from "../models/EventRegistration.js";
import RegistrationForm from "../models/RegistrationForm.js";
import { normalizeRegistrationForm } from "../utils/registrationForm.js";
import { resolveEventRegistrationForm } from "../utils/eventRegistrationForm.js";

const DEFAULT_EVENT_PAGE_SIZE = 9;
const MAX_EVENT_PAGE_SIZE = 24;
const EVENT_STATUSES = new Set(["active", "upcoming", "ongoing", "all"]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseQueryInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
};

const hasEventListQuery = (query = {}) =>
  ["page", "limit", "search", "status"].some((key) => query[key] !== undefined);

const buildEventFilter = ({ search = "", status = "all", now = new Date() } = {}) => {
  const filter = { isArchived: { $ne: true } };
  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const expression = new RegExp(escapeRegex(trimmedSearch), "i");
    filter.$or = [
      { title: expression },
      { location: expression },
    ];
  }

  if (status === "active") {
    filter.endDate = { $gte: now };
  } else if (status === "upcoming") {
    filter.startDate = { $gt: now };
  } else if (status === "ongoing") {
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }

  return filter;
};

const textField = (value, field, min, max) => {
  if (typeof value !== "string") return { error: `${field} is required` };
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    return { error: `${field} must be ${min} to ${max} characters long` };
  }
  return { value: trimmed };
};

const parseEventDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  // HTML datetime-local values are campus time; explicit offsets and Z remain absolute.
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (local) {
    const [, year, month, day, hour, minute, second = "00"] = local;
    const campusAsUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
    const check = new Date(campusAsUtc);
    if (check.getUTCFullYear() !== +year || check.getUTCMonth() + 1 !== +month
      || check.getUTCDate() !== +day || check.getUTCHours() !== +hour
      || check.getUTCMinutes() !== +minute || check.getUTCSeconds() !== +second) return null;
    return new Date(campusAsUtc - 8 * 60 * 60 * 1000);
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseAgendaDate = (value) => {
  if (value instanceof Date) return parseEventDate(value);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  return parseEventDate(value);
};

const getCampusDay = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

const parseJsonField = (value, field, fallback) => {
  if (value === undefined) return fallback;
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value !== "string") return { error: `${field} must be valid JSON` };
  try {
    return JSON.parse(value);
  } catch {
    return { error: `${field} must be valid JSON` };
  }
};

const normalizeStringList = (value, field, maximum, itemMaximum) => {
  if (!Array.isArray(value)) return { error: `${field} must be an array` };
  if (value.length > maximum) return { error: `${field} can have up to ${maximum} items` };
  const list = [];
  for (const item of value) {
    if (typeof item !== "string") return { error: `${field} must contain text values` };
    const text = item.trim();
    if (!text || text.length > itemMaximum) {
      return { error: `${field} items must be 1 to ${itemMaximum} characters long` };
    }
    list.push(text);
  }
  return { value: [...new Set(list)] };
};

const readStructuredFields = (body, { existing = null, rangeStart = null, rangeEnd = null } = {}) => {
  const eventType = body.eventType === undefined ? existing?.eventType || "Other" : body.eventType;
  if (typeof eventType !== "string" || !EVENT_TYPES.includes(eventType)) {
    return { error: "Choose a valid event type", field: "eventType" };
  }

  const parsedTags = parseJsonField(body.tags, "Tags", existing?.tags || []);
  const parsedAgenda = parseJsonField(body.agenda, "Agenda", existing?.agenda || []);
  const parsedSpeakers = parseJsonField(body.speakers, "Speakers", existing?.speakers || []);
  const parsedRequirements = parseJsonField(
    body.requirements,
    "Requirements",
    existing?.requirements || [],
  );
  const parsedReminders = parseJsonField(body.reminders, "Reminders", existing?.reminders || []);
  const parsedRegistrationForm = parseJsonField(
    body.registrationForm,
    "Registration form",
    existing?.registrationFormId ? { version: 1, items: [] } : (existing?.registrationForm || { version: 1, items: [] }),
  );
  for (const [field, value] of [
    ["tags", parsedTags],
    ["agenda", parsedAgenda],
    ["speakers", parsedSpeakers],
    ["requirements", parsedRequirements],
    ["reminders", parsedReminders],
    ["registrationForm", parsedRegistrationForm],
  ]) {
    if (value?.error) {
      return {
        error: value.error,
        field,
        ...(field === "agenda"
          ? { issues: [{ path: "agenda", message: value.error }] }
          : {}),
      };
    }
  }

  const tags = normalizeStringList(parsedTags, "Tags", 8, 40);
  const requirements = normalizeStringList(parsedRequirements, "Requirements", 20, 240);
  const reminders = normalizeStringList(parsedReminders, "Reminders", 20, 240);
  if (tags.error) return { error: tags.error, field: "tags" };
  if (requirements.error) return { error: requirements.error, field: "requirements" };
  if (reminders.error) return { error: reminders.error, field: "reminders" };

  if (!Array.isArray(parsedSpeakers) || parsedSpeakers.length > 30) {
    return { error: "Speakers can have up to 30 items", field: "speakers" };
  }
  const speakerKeys = new Set();
  const speakers = [];
  for (const speaker of parsedSpeakers) {
    if (!speaker || typeof speaker !== "object") {
      return { error: "Each speaker must be an object", field: "speakers" };
    }
    const clientKey = typeof speaker.clientKey === "string" ? speaker.clientKey.trim() : "";
    const name = typeof speaker.name === "string" ? speaker.name.trim() : "";
    const role = typeof speaker.role === "string" ? speaker.role.trim() : "";
    if (!clientKey || clientKey.length > 80 || speakerKeys.has(clientKey)) {
      return { error: "Each speaker needs a unique key", field: "speakers" };
    }
    if (name.length < 2 || name.length > 120 || role.length < 2 || role.length > 120) {
      return { error: "Speaker names and roles must be 2 to 120 characters long", field: "speakers" };
    }
    speakerKeys.add(clientKey);
    const oldSpeaker = existing?.speakers?.find((item) => item.clientKey === clientKey);
    speakers.push({
      clientKey,
      name,
      role,
      ...(oldSpeaker?.photoUrl ? { photoUrl: oldSpeaker.photoUrl } : {}),
      ...(oldSpeaker?.photoPublicId ? { photoPublicId: oldSpeaker.photoPublicId } : {}),
    });
  }

  if (!Array.isArray(parsedAgenda)) {
    const message = "Agenda must be an array";
    return { error: message, field: "agenda", issues: [{ path: "agenda", message }] };
  }
  if (parsedAgenda.length > 40) {
    const message = "Agenda can have up to 40 items";
    return { error: message, field: "agenda", issues: [{ path: "agenda", message }] };
  }
  const agenda = [];
  const agendaIssues = [];
  for (const [index, item] of parsedAgenda.entries()) {
    if (!item || typeof item !== "object") {
      agendaIssues.push({
        path: `agenda.${index}`,
        message: "Each program item must be an object.",
      });
      continue;
    }
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const startDate = parseAgendaDate(item.startDate);
    const endDate = parseAgendaDate(item.endDate);
    const speakerKeysForItem = item.speakerKeys;
    let itemHasIssues = false;
    if (title.length < 2 || title.length > 160) {
      agendaIssues.push({
        path: `agenda.${index}.title`,
        message: "Program title must be 2 to 160 characters long.",
      });
      itemHasIssues = true;
    }
    if (item.description !== undefined && typeof item.description !== "string") {
      agendaIssues.push({
        path: `agenda.${index}.description`,
        message: "Program description must be text.",
      });
      itemHasIssues = true;
    } else if (description.length > 500) {
      agendaIssues.push({
        path: `agenda.${index}.description`,
        message: "Program description must be 500 characters or fewer.",
      });
      itemHasIssues = true;
    }
    if (!startDate) {
      agendaIssues.push({
        path: `agenda.${index}.startDate`,
        message: "Choose a valid program start date and time.",
      });
      itemHasIssues = true;
    }
    if (!endDate) {
      agendaIssues.push({
        path: `agenda.${index}.endDate`,
        message: "Choose a valid program end date and time.",
      });
      itemHasIssues = true;
    }
    if (startDate && endDate && endDate <= startDate) {
      agendaIssues.push({
        path: `agenda.${index}.endDate`,
        message: "Program end must be after its start.",
      });
      itemHasIssues = true;
    }
    if (startDate && endDate && rangeStart && startDate < rangeStart) {
      agendaIssues.push({
        path: `agenda.${index}.startDate`,
        message: "Program start must stay inside the event schedule.",
      });
      itemHasIssues = true;
    }
    if (startDate && endDate && rangeEnd && endDate > rangeEnd) {
      agendaIssues.push({
        path: `agenda.${index}.endDate`,
        message: "Program end must stay inside the event schedule.",
      });
      itemHasIssues = true;
    }
    if (!Array.isArray(speakerKeysForItem)) {
      agendaIssues.push({
        path: `agenda.${index}.speakerKeys`,
        message: "Program speakers must be an array.",
      });
      itemHasIssues = true;
    } else {
      speakerKeysForItem.forEach((key) => {
        if (typeof key !== "string" || !speakerKeys.has(key)) {
          agendaIssues.push({
            path: `agenda.${index}.speakerKeys`,
            message: "Choose speakers from this event's speaker list.",
          });
          itemHasIssues = true;
        }
      });
    }
    if (itemHasIssues) {
      continue;
    }
    agenda.push({ title, ...(description ? { description } : {}), startDate, endDate, speakerKeys: speakerKeysForItem });
  }

  if (agendaIssues.length) {
    return {
      error: "Please fix the highlighted agenda items.",
      field: "agenda",
      issues: agendaIssues,
    };
  }

  const registrationMode = body.registrationMode === undefined
    ? existing?.registrationMode || "none"
    : body.registrationMode;
  if (!["none", "required"].includes(registrationMode)) {
    return { error: "Registration mode must be none or required", field: "registrationMode" };
  }
  let capacity = body.capacity === undefined ? existing?.capacity : body.capacity;
  if (capacity === "" || capacity === null) capacity = undefined;
  if (capacity !== undefined) {
    if (!/^\d+$/.test(String(capacity)) || Number(capacity) < 1 || Number(capacity) > 100000) {
      return { error: "Capacity must be a whole number between 1 and 100000", field: "capacity" };
    }
    capacity = Number(capacity);
  }
  if (registrationMode === "none") capacity = undefined;

  const form = normalizeRegistrationForm(parsedRegistrationForm);
  if (form.issues) {
    return {
      error: "Please fix the registration form.",
      field: "registrationForm",
      issues: form.issues,
    };
  }
  if (registrationMode === "none" && form.value.items.length) {
    return { error: "Remove all form items before choosing No registration.", field: "registrationForm" };
  }
  const oldForm = normalizeRegistrationForm(existing?.registrationForm || { items: [] });
  const formChanged = existing && JSON.stringify(oldForm.value?.items || []) !== JSON.stringify(form.value.items);
  form.value.version = (existing?.registrationForm?.version || 1) + (formChanged ? 1 : 0);

  return {
    value: {
      eventType,
      tags: tags.value,
      agenda,
      speakers,
      requirements: requirements.value,
      reminders: reminders.value,
      registrationMode,
      registrationForm: form.value,
      formChanged: Boolean(formChanged),
      ...(body.registrationFormId !== undefined
        ? { registrationFormId: body.registrationFormId || null }
        : existing?.registrationFormId
          ? { registrationFormId: existing.registrationFormId }
          : {}),
      ...(capacity === undefined ? {} : { capacity }),
    },
  };
};

const validateImageFile = async (file, field) => {
  const detected = await fileTypeFromBuffer(file.buffer);
  const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!detected || !supported.has(detected.mime) || detected.mime !== file.mimetype) {
    return { error: `${field} must be a JPEG, PNG, or WebP file`, field };
  }
  return { value: true };
};

const resolveRegistrationFormSelection = async ({ registrationMode, registrationFormId, existing, legacyFormProvided = false }) => {
  const selectedId = registrationFormId === undefined
    ? existing?.registrationFormId
    : registrationFormId;
  if (registrationMode === "none") {
    if (selectedId) return { error: "Open events cannot use a registration form", field: "registrationFormId" };
    return { value: { registrationFormId: null } };
  }
  if (!selectedId || !mongoose.isValidObjectId(selectedId)) {
    if (legacyFormProvided && registrationMode === "required") return { value: { registrationFormId: null } };
    if (existing?.registrationForm && !existing?.registrationFormId && registrationFormId === undefined) {
      return { value: { registrationFormId: null } };
    }
    return { error: "Choose a registration form for this event", field: "registrationFormId" };
  }
  const form = await RegistrationForm.findById(selectedId);
  if (!form) return { error: "Registration form not found", field: "registrationFormId" };
  if (form.isArchived && String(selectedId) !== String(existing?.registrationFormId || "")) {
    return { error: "Archived forms cannot be selected for new events", field: "registrationFormId" };
  }
  return { value: { registrationFormId: form._id } };
};

export const createEvent = async (req, res) => {
  try {
    const body = req.body || {};
    const fields = {
      title: textField(body.title, "Title", 3, 120),
      description: textField(body.description, "Description", 10, 1000),
      location: textField(body.location, "Location", 3, 500),
    };
    for (const [field, result] of Object.entries(fields)) {
      if (result.error) return res.status(400).json({ message: result.error, field });
    }

    let organizerName;
    let organizer;
    if (body.organizerName !== undefined) {
      const result = textField(body.organizerName, "Organization name", 3, 120);
      if (result.error) return res.status(400).json({ message: result.error, field: "organizerName" });
      organizerName = result.value;
    } else if (typeof body.organizer === "string" && mongoose.isValidObjectId(body.organizer)) {
      // Existing JSON clients may still submit a user reference as organizer.
      const user = await User.findById(body.organizer);
      if (!user) return res.status(400).json({ message: "Organizer not found", field: "organizer" });
      organizer = user._id;
      organizerName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
    } else {
      return res.status(400).json({ message: "Organization name is required", field: "organizerName" });
    }

    const start = parseEventDate(body.startDate);
    const end = parseEventDate(body.endDate);
    if (!start) return res.status(400).json({ message: "Start date is not a valid date", field: "startDate" });
    if (!end) return res.status(400).json({ message: "End date is not a valid date", field: "endDate" });
    const today = getCampusDay(new Date());
    if (getCampusDay(start) < today) return res.status(400).json({ message: "Start date cannot be before today", field: "startDate" });
    if (getCampusDay(end) < today) return res.status(400).json({ message: "End date cannot be before today", field: "endDate" });
    if (end <= start) return res.status(400).json({ message: "End date must be after the start date", field: "endDate" });
    if (!mongoose.isValidObjectId(req.user?.sub)) {
      return res.status(401).json({ message: "Invalid creator identity" });
    }

    const structured = readStructuredFields(body, { rangeStart: start, rangeEnd: end });
    if (structured.error) {
      return res.status(400).json({
        message: structured.error,
        field: structured.field,
        ...(structured.issues ? { issues: structured.issues } : {}),
      });
    }
    const formSelection = await resolveRegistrationFormSelection({
      registrationMode: structured.value.registrationMode,
      registrationFormId: structured.value.registrationFormId,
      legacyFormProvided: body.registrationForm !== undefined,
    });
    if (formSelection.error) return res.status(400).json({ message: formSelection.error, field: formSelection.field });

    let image;
    const speakerImages = [];
    if (req.file) {
      const validImage = await validateImageFile(req.file, "coverImage");
      if (validImage.error) return res.status(400).json(validImage);
      try {
        image = await uploadEventImage(req.file.buffer);
      } catch {
        return res.status(502).json({ message: "Image upload failed. Please try again.", field: "coverImage" });
      }
    }

    const speakerImageKeys = parseJsonField(body.speakerImageKeys, "Speaker image keys", []);
    if (speakerImageKeys.error || !Array.isArray(speakerImageKeys)) {
      if (image) {
        try { await removeEventImage(image.imagePublicId); } catch { /* Preserve the validation response. */ }
      }
      return res.status(400).json({ message: speakerImageKeys.error || "Speaker image keys must be an array", field: "speakers" });
    }
    if (speakerImageKeys.length !== (req.speakerFiles || []).length) {
      if (image) {
        try { await removeEventImage(image.imagePublicId); } catch { /* Preserve the validation response. */ }
      }
      return res.status(400).json({ message: "Each speaker image must identify its speaker", field: "speakers" });
    }
    for (let index = 0; index < (req.speakerFiles || []).length; index += 1) {
      const key = speakerImageKeys[index];
      const speaker = structured.value.speakers.find((item) => item.clientKey === key);
      if (!speaker) {
        if (image) {
          try { await removeEventImage(image.imagePublicId); } catch { /* Preserve the validation response. */ }
        }
        return res.status(400).json({ message: "Speaker image key does not match a speaker", field: "speakers" });
      }
      const file = req.speakerFiles[index];
      const validImage = await validateImageFile(file, "Speaker image");
      if (validImage.error) {
        const uploads = [image, ...speakerImages].filter(Boolean);
        await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
        return res.status(400).json(validImage);
      }
      try {
        const uploaded = await uploadEventImage(file.buffer);
        speaker.photoUrl = uploaded.imageUrl;
        speaker.photoPublicId = uploaded.imagePublicId;
        speakerImages.push(uploaded);
      } catch {
        const uploads = [image, ...speakerImages].filter(Boolean);
        await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
        return res.status(502).json({ message: "Speaker image upload failed. Please try again.", field: "speakers" });
      }
    }

    let event;
    try {
      event = await Event.create({
        title: fields.title.value,
        description: fields.description.value,
        location: fields.location.value,
        organizerName,
        ...(organizer ? { organizer } : {}),
        createdBy: req.user.sub,
        startDate: start,
        endDate: end,
        ...structured.value,
        ...formSelection.value,
        ...(formSelection.value.registrationFormId ? { registrationForm: undefined } : {}),
        ...(image || {}),
      });
    } catch (error) {
      const uploads = [image, ...speakerImages].filter(Boolean);
      await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
      throw error;
    }

    if (organizer) await event.populate("organizer", "firstName middleName lastName email");
    await notifyAllStudents({
      type: "event_created",
      title: "New event",
      message: `A new event is available: ${event.title}.`,
      event: event._id,
    });
    return res.status(201).json({
      message: "Event created successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Organizer id is not valid",
      });
    }
    return res.status(500).json({
      message: "Failed to create event",
    });
  }
};

//getting events
export const getEvents = async (req, res) => {
  try {
    const query = req.query || {};

    // Preserve the original collection response for existing callers that do
    // not request discovery controls. The student homepage opts into paging.
    if (!hasEventListQuery(query)) {
      const events = await Event.find({ isArchived: { $ne: true } })
        .sort({ startDate: 1, _id: 1 })
        .populate("organizer", "firstName middleName lastName email");

      return res.status(200).json({
        events: events.map((event) => withStatus(event)),
      });
    }

    const page = parseQueryInteger(query.page, 1, 1000000);
    const limit = parseQueryInteger(query.limit, DEFAULT_EVENT_PAGE_SIZE, MAX_EVENT_PAGE_SIZE);
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const status = typeof query.status === "string" ? query.status.trim().toLowerCase() : "all";

    if ((query.search !== undefined && typeof query.search !== "string")
      || (query.status !== undefined && typeof query.status !== "string")) {
      return res.status(400).json({ message: "Search and status must be strings" });
    }

    if (!page || !limit) {
      return res.status(400).json({
        message: `Page must be between 1 and 1000000 and limit must be between 1 and ${MAX_EVENT_PAGE_SIZE}`,
      });
    }

    if (search.length > 100) {
      return res.status(400).json({ message: "Search must be 100 characters or fewer" });
    }

    if (!EVENT_STATUSES.has(status)) {
      return res.status(400).json({
        message: "Status must be active, upcoming, ongoing, or all",
      });
    }

    const filter = buildEventFilter({ search, status });
    const [total, events] = await Promise.all([
      Event.countDocuments(filter),
      Event.find(filter)
        .sort({ startDate: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("organizer", "firstName middleName lastName email"),
    ]);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      events: events.map((event) => withStatus(event)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1 && totalPages > 0,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get events",
    });
  }
};

//getting archived eventss
export const getArchivedEvents = async (req, res) => {
  try {
    const events = await Event.find({ isArchived: true }).populate(
      "organizer",
      "firstName middleName lastName email",
    );

    return res.status(200).json({
      events: events.map((event) => withStatus(event)),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get archived events",
    });
  }
};

//by id
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "firstName middleName lastName email",
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const registrationFormLocked = req.user?.role === "admin"
      ? Boolean(await EventRegistration.exists({ event: event._id, submittedAt: { $exists: true } }))
      : undefined;
    const currentRegistrationForm = await resolveEventRegistrationForm(event);

    return res.status(200).json({
      event: {
        ...withStatus(event),
        registrationForm: currentRegistrationForm,
        ...(registrationFormLocked === undefined ? {} : { registrationFormLocked }),
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Event id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to get event",
    });
  }
};

//edit and archive eventss
export const updateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      organizer,
      organizerName,
      startDate,
      endDate,
      removeCoverImage,
    } =
      req.body || {};

    const event = await Event.findById(req.params.id, "+imagePublicId +speakers.photoPublicId");

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.isArchived) {
      return res.status(400).json({
        message: "Archived events cannot be edited",
      });
    }

    for (const [field, value, min, max, label] of [
      ["title", title, 3, 120, "Title"],
      ["description", description, 10, 1000, "Description"],
      ["location", location, 3, 500, "Location"],
    ]) {
      if (value === undefined) continue;
      const result = textField(value, label, min, max);
      if (result.error) return res.status(400).json({ message: result.error, field });
      event[field] = result.value;
    }

    if (organizer !== undefined) {
      const user = await User.findById(organizer);
      if (!user) {
        return res.status(404).json({
          message: "Organizer not found",
        });
      }
      event.organizer = organizer;
    }

    if (organizerName !== undefined) {
      const result = textField(organizerName, "Organization name", 3, 120);
      if (result.error) return res.status(400).json({ message: result.error, field: "organizerName" });
      event.organizerName = result.value;
    }

    if (startDate !== undefined) {
      const start = parseEventDate(startDate);
      if (!start) {
        return res.status(400).json({
          message: "Start date is not a valid date",
          field: "startDate",
        });
      }
      event.startDate = start;
    }

    if (endDate !== undefined) {
      const end = parseEventDate(endDate);
      if (!end) {
        return res.status(400).json({
          message: "End date is not a valid date",
          field: "endDate",
        });
      }
      event.endDate = end;
    }

    if (event.endDate <= event.startDate) {
      return res.status(400).json({
        message: "End date must be after the start date",
        field: "endDate",
      });
    }

    const structured = readStructuredFields(req.body || {}, {
      existing: event,
      rangeStart: event.startDate,
      rangeEnd: event.endDate,
    });
    if (structured.error) {
      return res.status(400).json({
        message: structured.error,
        field: structured.field,
        ...(structured.issues ? { issues: structured.issues } : {}),
      });
    }
    const formSelection = await resolveRegistrationFormSelection({
      registrationMode: structured.value.registrationMode,
      registrationFormId: structured.value.registrationFormId,
      existing: event,
      legacyFormProvided: req.body?.registrationForm !== undefined,
    });
    if (formSelection.error) return res.status(400).json({ message: formSelection.error, field: formSelection.field });
    if ((!event.registrationFormId && structured.value.formChanged)
      || String(formSelection.value.registrationFormId || "") !== String(event.registrationFormId || "")
      || structured.value.registrationMode !== (event.registrationMode || "none")) {
      const hasSubmissions = await EventRegistration.exists({
        event: event._id,
        submittedAt: { $exists: true },
      });
      if (hasSubmissions) {
        return res.status(409).json({
          message: "The registration form and mode are locked after the first submission.",
          field: "registrationForm",
        });
      }
    }

    const removeSpeakerImageKeys = parseJsonField(
      req.body?.removeSpeakerImageKeys,
      "Speaker image keys",
      [],
    );
    if (removeSpeakerImageKeys.error || !Array.isArray(removeSpeakerImageKeys)) {
      return res.status(400).json({
        message: removeSpeakerImageKeys.error || "Speaker image keys must be an array",
        field: "speakers",
      });
    }
    const removeSpeakerKeys = new Set(removeSpeakerImageKeys);
    for (const speaker of structured.value.speakers) {
      if (removeSpeakerKeys.has(speaker.clientKey)) {
        delete speaker.photoUrl;
        delete speaker.photoPublicId;
      }
    }
    if (![undefined, true, false, "true", "false"].includes(removeCoverImage)) {
      return res.status(400).json({ message: "Invalid cover image option", field: "coverImage" });
    }
    const removeCover = removeCoverImage === true || removeCoverImage === "true";
    if (removeCover && req.file) {
      return res.status(400).json({ message: "Choose either a replacement or removal", field: "coverImage" });
    }

    let newImage;
    const newSpeakerImages = [];
    const oldSpeakerImages = new Map(
      (event.speakers || [])
        .filter((speaker) => speaker.photoPublicId)
        .map((speaker) => [speaker.clientKey, speaker.photoPublicId]),
    );
    if (req.file) {
      const validImage = await validateImageFile(req.file, "coverImage");
      if (validImage.error) return res.status(400).json(validImage);
      try {
        newImage = await uploadEventImage(req.file.buffer);
      } catch {
        return res.status(502).json({ message: "Image upload failed. Please try again.", field: "coverImage" });
      }
    }

    const speakerImageKeys = parseJsonField(req.body?.speakerImageKeys, "Speaker image keys", []);
    if (speakerImageKeys.error || !Array.isArray(speakerImageKeys)) {
      if (newImage) await Promise.allSettled([removeEventImage(newImage.imagePublicId)]);
      return res.status(400).json({ message: speakerImageKeys.error || "Speaker image keys must be an array", field: "speakers" });
    }
    if (speakerImageKeys.length !== (req.speakerFiles || []).length) {
      if (newImage) await Promise.allSettled([removeEventImage(newImage.imagePublicId)]);
      return res.status(400).json({ message: "Each speaker image must identify its speaker", field: "speakers" });
    }
    for (let index = 0; index < (req.speakerFiles || []).length; index += 1) {
      const key = speakerImageKeys[index];
      const speaker = structured.value.speakers.find((item) => item.clientKey === key);
      if (!speaker) {
        const uploads = [newImage, ...newSpeakerImages].filter(Boolean);
        await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
        return res.status(400).json({ message: "Speaker image key does not match a speaker", field: "speakers" });
      }
      const validImage = await validateImageFile(req.speakerFiles[index], "Speaker image");
      if (validImage.error) {
        const uploads = [newImage, ...newSpeakerImages].filter(Boolean);
        await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
        return res.status(400).json(validImage);
      }
      try {
        const uploaded = await uploadEventImage(req.speakerFiles[index].buffer);
        speaker.photoUrl = uploaded.imageUrl;
        speaker.photoPublicId = uploaded.imagePublicId;
        newSpeakerImages.push(uploaded);
      } catch {
        const uploads = [newImage, ...newSpeakerImages].filter(Boolean);
        await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
        return res.status(502).json({ message: "Speaker image upload failed. Please try again.", field: "speakers" });
      }
    }

    const oldImagePublicId = event.imagePublicId;
    if (newImage) {
      event.imageUrl = newImage.imageUrl;
      event.imagePublicId = newImage.imagePublicId;
    } else if (removeCover) {
      event.imageUrl = undefined;
      event.imagePublicId = undefined;
    }
    event.eventType = structured.value.eventType;
    event.tags = structured.value.tags;
    event.agenda = structured.value.agenda;
    event.speakers = structured.value.speakers;
    event.requirements = structured.value.requirements;
    event.reminders = structured.value.reminders;
    event.registrationMode = structured.value.registrationMode;
    if (formSelection.value.registrationFormId) {
      event.registrationFormId = formSelection.value.registrationFormId;
    } else if (structured.value.registrationFormId === null || structured.value.registrationMode === "none") {
      event.registrationFormId = null;
    }
    if (!event.registrationFormId && req.body?.registrationForm !== undefined) event.registrationForm = structured.value.registrationForm;
    event.capacity = structured.value.capacity;

    try {
      await event.save();
    } catch (error) {
      const uploads = [newImage, ...newSpeakerImages].filter(Boolean);
      await Promise.allSettled(uploads.map((uploaded) => removeEventImage(uploaded.imagePublicId)));
      throw error;
    }
    if ((newImage || removeCover) && oldImagePublicId) {
      try { await removeEventImage(oldImagePublicId); } catch { console.error("Old event image cleanup failed"); }
    }
    const currentSpeakerKeys = new Set((event.speakers || []).map((speaker) => speaker.clientKey));
    for (const [key, publicId] of oldSpeakerImages) {
      const current = event.speakers.find((speaker) => speaker.clientKey === key);
      if (!currentSpeakerKeys.has(key) || current?.photoPublicId !== publicId) {
        try { await removeEventImage(publicId); } catch { console.error("Old speaker image cleanup failed"); }
      }
    }
    await event.populate("organizer", "firstName middleName lastName email");

    return res.status(200).json({
      message: "Event updated successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update event",
    });
  }
};

//archiving events
export const archiveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.isArchived) {
      return res.status(400).json({
        message: "Event is already archived",
      });
    }

    event.isArchived = true;
    await event.save();
    await event.populate("organizer", "firstName middleName lastName email");

    return res.status(200).json({
      message: "Event archived successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Event id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to archive event",
    });
  }
};

export const unarchiveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.isArchived) {
      return res.status(400).json({ message: "Event is not archived" });
    }

    event.isArchived = false;
    await event.save();
    await event.populate("organizer", "firstName middleName lastName email");

    return res.status(200).json({
      message: "Event unarchived successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Event id is not valid" });
    }

    console.error(error);
    return res.status(500).json({ message: "Failed to unarchive event" });
  }
};
