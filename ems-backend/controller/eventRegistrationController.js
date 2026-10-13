import mongoose from "mongoose";
import Event from "../models/Event.js";
import EventAttendance from "../models/EventAttendance.js";
import EventRegistration from "../models/EventRegistration.js";
import User from "../models/User.js";
import { withStatus } from "../utils/eventStatus.js";
import { validateRegistrationAnswers } from "../utils/registrationForm.js";
import { resolveEventRegistrationForm } from "../utils/eventRegistrationForm.js";
import { notifyStudent } from "../services/notificationService.js";

const registrationPayload = (registration) => ({
  _id: registration._id,
  event: registration.event?._id || registration.event,
  student: registration.student?._id || registration.student,
  status: registration.status,
  registeredAt: registration.registeredAt,
  cancelledAt: registration.cancelledAt,
  formVersion: registration.formVersion || 1,
  submittedAt: registration.submittedAt || null,
  answers: registration.answers || [],
  createdAt: registration.createdAt,
  updatedAt: registration.updatedAt,
});

const getEventForRegistration = async (id) => {
  if (!mongoose.isValidObjectId(id))
    return { error: { status: 400, message: "Event id is not valid" } };
  const event = await Event.findById(id);
  if (!event) return { error: { status: 404, message: "Event not found" } };
  if (event.isArchived)
    return {
      error: {
        status: 400,
        message: "Archived events cannot be registered for",
      },
    };
  if (event.registrationMode !== "required") {
    return {
      error: {
        status: 400,
        message: "This event does not require registration",
      },
    };
  }
  if (new Date() >= event.startDate) {
    return {
      error: { status: 400, message: "Registration is closed for this event" },
    };
  }
  return { event };
};

export const getRegistrationForm = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Event id is not valid" });
    const [event, student] = await Promise.all([
      Event.findById(req.params.id).select(
        "title startDate endDate registrationMode registrationForm registrationFormId capacity isArchived",
      ),
      User.findById(req.user.sub).select(
        "firstName middleName lastName studentId email",
      ),
    ]);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!student)
      return res.status(401).json({ message: "Student account not found" });
    if (event.registrationMode !== "required")
      return res
        .status(400)
        .json({ message: "This event does not require registration" });
    const registration = await EventRegistration.findOne({
      event: event._id,
      student: student._id,
    });
    const form = await resolveEventRegistrationForm(event);
    return res.status(200).json({
      event: withStatus(event),
      form,
      // Kept as read-only metadata for existing clients; these are never form fields or client input.
      identity: {
        name: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" "),
        studentId: student.studentId,
        email: student.email,
      },
      registration: registration ? registrationPayload(registration) : null,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Unable to load registration form" });
  }
};

export const registerForEvent = async (req, res) => {
  try {
    const { event, error } = await getEventForRegistration(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });

    let registration = await EventRegistration.findOne({
      event: event._id,
      student: req.user.sub,
    });
    if (registration && registration.status !== "cancelled") {
      return res.status(200).json({
        message:
          registration.status === "waitlisted"
            ? "You are already on the waitlist"
            : "You are already registered",
        registration: registrationPayload(registration),
      });
    }

    const form = await resolveEventRegistrationForm(event);
    const validation = validateRegistrationAnswers(form, req.body?.answers);
    if (validation.issues) {
      return res.status(400).json({
        message: "Please fix the highlighted registration answers.",
        field: "answers",
        issues: validation.issues,
      });
    }

    const registeredCount = await EventRegistration.countDocuments({
      event: event._id,
      status: "registered",
    });
    const status =
      event.capacity && registeredCount >= event.capacity
        ? "waitlisted"
        : "registered";
    if (!registration) {
      registration = new EventRegistration({
        event: event._id,
        student: req.user.sub,
        status,
      });
    } else {
      registration.status = status;
      registration.registeredAt = new Date();
      registration.cancelledAt = undefined;
    }
    registration.formVersion = form.version || 1;
    registration.answers = validation.value;
    registration.submittedAt = new Date();
    await registration.save();
    await notifyStudent({
      user: req.user.sub,
      type: status === "waitlisted" ? "waitlisted" : "registered",
      title: status === "waitlisted" ? "Waitlist" : "Registration confirmed",
      message:
        status === "waitlisted"
          ? `You were added to the waitlist for ${event.title}.`
          : `You are registered for ${event.title}.`,
      event: event._id,
    });

    return res.status(201).json({
      message:
        status === "waitlisted"
          ? "You have been added to the waitlist"
          : "You are registered for this event",
      registration: registrationPayload(registration),
    });
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ message: "You already have a registration for this event" });
    console.error(error);
    return res
      .status(500)
      .json({ message: "Unable to register for this event" });
  }
};

export const cancelEventRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.isArchived)
      return res
        .status(400)
        .json({ message: "Archived events cannot change registrations" });
    if (new Date() >= event.startDate)
      return res
        .status(400)
        .json({ message: "Registration changes are closed for this event" });
    const registration = await EventRegistration.findOne({
      event: event._id,
      student: req.user.sub,
    });
    if (!registration || registration.status === "cancelled")
      return res
        .status(404)
        .json({ message: "You do not have an active registration" });
    registration.status = "cancelled";
    registration.cancelledAt = new Date();
    await registration.save();
    await notifyStudent({
      user: req.user.sub,
      type: "registration_cancelled",
      title: "Registration cancelled",
      message: `Your registration for ${event.title} was cancelled.`,
      event: event._id,
    });
    return res
      .status(200)
      .json({
        message: "Registration cancelled",
        registration: registrationPayload(registration),
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to cancel registration" });
  }
};

export const getEventRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id).select(
      "capacity registrationMode",
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    const registration = await EventRegistration.findOne({
      event: req.params.id,
      student: req.user.sub,
    });
    const registeredCount =
      event.registrationMode === "required"
        ? await EventRegistration.countDocuments({
            event: event._id,
            status: "registered",
          })
        : 0;
    return res.status(200).json({
      registration: registration ? registrationPayload(registration) : null,
      capacity: event.capacity || null,
      registeredCount,
      isFull: Boolean(event.capacity && registeredCount >= event.capacity),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load registration" });
  }
};

export const getMyEventRegistrations = async (req, res) => {
  try {
    const registrations = await EventRegistration.find({
      student: req.user.sub,
    })
      .sort({ updatedAt: -1 })
      .populate("event");
    const eventIds = registrations
      .map((registration) => registration.event?._id)
      .filter(Boolean);
    const attendanceRecords = await EventAttendance.find({
      student: req.user.sub,
      event: { $in: eventIds },
    }).select("event timeIn timeOut");
    const attendanceByEvent = new Map(
      attendanceRecords.map((attendance) => [
        String(attendance.event),
        attendance,
      ]),
    );
    return res.status(200).json({
      registrations: registrations.map((registration) => {
        const attendance = registration.event
          ? attendanceByEvent.get(String(registration.event._id))
          : null;
        return {
          ...registrationPayload(registration),
          event: registration.event ? withStatus(registration.event) : null,
          attendance: attendance
            ? {
                timeIn: attendance.timeIn,
                timeOut: attendance.timeOut || null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load your events" });
  }
};

export const getAdminRegistrationSummary = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const [registered, waitlisted, cancelled] = await Promise.all([
      EventRegistration.countDocuments({
        event: event._id,
        status: "registered",
      }),
      EventRegistration.countDocuments({
        event: event._id,
        status: "waitlisted",
      }),
      EventRegistration.countDocuments({
        event: event._id,
        status: "cancelled",
      }),
    ]);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const status = req.query.status || "all";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !["all", "registered", "waitlisted", "cancelled"].includes(status)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid registration list filters" });
    }
    const filter = {
      event: event._id,
      ...(status === "all" ? {} : { status }),
    };
    const [total, rows] = await Promise.all([
      EventRegistration.countDocuments(filter),
      EventRegistration.find(filter)
        .sort({ submittedAt: 1, createdAt: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("student", "firstName middleName lastName studentId email"),
    ]);
    const attendanceRows = await EventAttendance.find({
      event: event._id,
      student: { $in: rows.map((row) => row.student?._id).filter(Boolean) },
    }).select("student timeIn timeOut");
    const attendanceByStudent = new Map(
      attendanceRows.map((row) => [String(row.student), row]),
    );
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      registration: {
        mode: event.registrationMode || "none",
        capacity: event.capacity || null,
        registered,
        waitlisted,
        cancelled,
      },
      registrations: rows.map((row) => ({
        ...registrationPayload(row),
        student: row.student
          ? {
              name: [
                row.student.firstName,
                row.student.middleName,
                row.student.lastName,
              ]
                .filter(Boolean)
                .join(" "),
              studentId: row.student.studentId,
              email: row.student.email,
            }
          : null,
        attendance: attendanceByStudent.get(String(row.student?._id)) || null,
      })),
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
    console.error(error);
    return res
      .status(500)
      .json({ message: "Unable to load registration summary" });
  }
};

const csvCell = (value) => {
  const raw = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const exportAdminRegistrations = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id).select(
      "registrationForm registrationFormId",
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    const rows = await EventRegistration.find({ event: event._id })
      .sort({ submittedAt: 1, createdAt: 1, _id: 1 })
      .populate("student", "firstName middleName lastName studentId email");
    const form = await resolveEventRegistrationForm(event);
    const keys = (form.items || [])
      .filter((item) => item.type !== "instructions")
      .map((item) => ({ key: item.key, label: item.label }));
    const header = [
      "Name",
      "School ID",
      "Email",
      "Status",
      "Submitted at",
      "Time in",
      "Time out",
      ...keys.map((item) => item.label),
      "Signature",
    ];
    const attendance = await EventAttendance.find({ event: event._id }).select(
      "student timeIn timeOut",
    );
    const attendanceByStudent = new Map(
      attendance.map((record) => [String(record.student), record]),
    );
    const lines = [header.map(csvCell).join(",")];
    for (const row of rows) {
      const answerByKey = new Map(
        (row.answers || []).map((answer) => [answer.key, answer.value]),
      );
      const record = attendanceByStudent.get(String(row.student?._id));
      lines.push(
        [
          row.student
            ? [
                row.student.firstName,
                row.student.middleName,
                row.student.lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : "",
          row.student?.studentId || "",
          row.student?.email || "",
          row.status,
          row.submittedAt?.toISOString() || "",
          record?.timeIn?.toISOString() || "",
          record?.timeOut?.toISOString() || "",
          ...keys.map((item) => answerByKey.get(item.key) || ""),
          "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="event-${event._id}-registrations.csv"`,
    );
    return res.status(200).send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to export registrations" });
  }
};
