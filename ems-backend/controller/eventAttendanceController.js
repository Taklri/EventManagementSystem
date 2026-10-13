import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { fileTypeFromBuffer } from "file-type";
import Event from "../models/Event.js";
import EventAttendance from "../models/EventAttendance.js";
import EventRegistration from "../models/EventRegistration.js";
import User from "../models/User.js";
import {
  removeEventImage,
  uploadAttendancePhoto,
} from "../services/eventImageService.js";
import { notifyAllAdmins, notifyStudent } from "../services/notificationService.js";

const LATE_CHECKOUT_MS = 30 * 60 * 1000;
const QR_LIFETIME_SECONDS = 15 * 60;
const SUPPORTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const getEvent = async (id, { allowArchived = false } = {}) => {
  if (!mongoose.isValidObjectId(id)) return { error: { status: 400, message: "Event id is not valid" } };
  const event = await Event.findById(id);
  if (!event) return { error: { status: 404, message: "Event not found" } };
  if (event.isArchived && !allowArchived) return { error: { status: 400, message: "Archived events cannot collect attendance" } };
  if (event.registrationMode !== "required") return { error: { status: 400, message: "This event does not collect attendance" } };
  return { event };
};

export const createAttendanceSession = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    const now = Math.floor(Date.now() / 1000);
    const closesAt = Math.floor(new Date(event.endDate).getTime() / 1000) + LATE_CHECKOUT_MS / 1000;
    if (closesAt <= now) return res.status(400).json({ message: "Attendance is closed for this event" });
    const expiresAt = Math.min(closesAt, now + QR_LIFETIME_SECONDS);
    const token = jwt.sign(
      { purpose: "event-attendance", eventId: String(event._id) },
      process.env.JWT_SECRET_KEY,
      { expiresIn: expiresAt - now },
    );
    return res.status(201).json({ token, expiresAt: new Date(expiresAt * 1000).toISOString(), eventId: event._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to create attendance code" });
  }
};

const attendanceContext = async (req) => {
  const { event, error } = await getEvent(req.params.id);
  if (error) return { error };
  if (typeof req.body?.token !== "string" || !req.body.token) {
    return { error: { status: 400, message: "Attendance code is required" } };
  }
  let claims;
  try {
    claims = jwt.verify(req.body.token, process.env.JWT_SECRET_KEY);
  } catch {
    return { error: { status: 400, message: "Attendance code is invalid or expired" } };
  }
  if (claims.purpose !== "event-attendance" || claims.eventId !== String(event._id)) {
    return { error: { status: 400, message: "Attendance code is invalid for this event" } };
  }
  const registration = await EventRegistration.findOne({ event: event._id, student: req.user.sub, status: "registered" });
  if (!registration) return { error: { status: 403, message: "You must be registered for this event to record attendance" } };
  const attendance = await EventAttendance.findOne({ event: event._id, student: req.user.sub });
  const now = new Date();
  if (attendance?.timeOut) return { error: { status: 409, message: "Attendance already completed" } };
  if (!attendance && (now < event.startDate || now > event.endDate)) {
    return { error: { status: 400, message: now < event.startDate ? "Time in is not open yet" : "Time in is closed" } };
  }
  if (attendance && now.getTime() > event.endDate.getTime() + LATE_CHECKOUT_MS) {
    return { error: { status: 400, message: "Time out is closed" } };
  }
  return { event, attendance, now, action: attendance ? "timeOut" : "timeIn" };
};

const studentAttendanceContext = async (req) => {
  const { event, error } = await getEvent(req.params.id);
  if (error) return { error };
  const registration = await EventRegistration.findOne({
    event: event._id,
    student: req.user.sub,
    status: "registered",
  });
  if (!registration) {
    return {
      error: {
        status: 403,
        message: "You must be registered for this event to record attendance",
      },
    };
  }

  const attendance = await EventAttendance.findOne({
    event: event._id,
    student: req.user.sub,
  });
  const now = new Date();
  if (attendance?.timeOut) {
    return { event, attendance, now, action: "complete", canSubmit: false };
  }
  if (
    !attendance &&
    (now < event.startDate || now > event.endDate)
  ) {
    return {
      event,
      attendance,
      now,
      action: "timeIn",
      canSubmit: false,
      message:
        now < event.startDate
          ? "Time in is not open yet"
          : "Time in is closed",
    };
  }
  if (
    attendance &&
    now.getTime() > event.endDate.getTime() + LATE_CHECKOUT_MS
  ) {
    return {
      event,
      attendance,
      now,
      action: "timeOut",
      canSubmit: false,
      message: "Time out is closed",
    };
  }
  return {
    event,
    attendance,
    now,
    action: attendance ? "timeOut" : "timeIn",
    canSubmit: true,
  };
};

const attendancePayload = (attendance) =>
  attendance
    ? {
        _id: attendance._id,
        timeIn: attendance.timeIn,
        timeOut: attendance.timeOut || null,
        timeInPhotoUrl: attendance.timeInPhotoUrl || null,
        timeOutPhotoUrl: attendance.timeOutPhotoUrl || null,
      }
    : null;

const validatePhoto = async (file) => {
  if (!file?.buffer) return "Take a photo before submitting attendance";
  const detected = await fileTypeFromBuffer(file.buffer);
  if (
    !detected ||
    !SUPPORTED_PHOTO_TYPES.has(detected.mime) ||
    detected.mime !== file.mimetype
  ) {
    return "Attendance photo must be a JPEG, PNG, or WebP image";
  }
  return null;
};

const uploadPhotoOrThrow = async (file) => {
  const validationMessage = await validatePhoto(file);
  if (validationMessage) {
    const error = new Error(validationMessage);
    error.status = 400;
    error.field = "photo";
    throw error;
  }
  return uploadAttendancePhoto(file.buffer);
};

export const getStudentAttendance = async (req, res) => {
  try {
    const context = await studentAttendanceContext(req);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }
    return res.status(200).json({
      event: {
        _id: context.event._id,
        title: context.event.title,
        startDate: context.event.startDate,
        endDate: context.event.endDate,
      },
      action: context.action,
      canSubmit: context.canSubmit,
      message: context.message || null,
      attendance: attendancePayload(context.attendance),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load attendance status" });
  }
};

// Keep the old signed-link contract readable for already-issued QR links. New
// clients always use the camera-photo flow below and never receive a QR token.
const recordLegacyAttendance = async (req, res) => {
  try {
    const context = await attendanceContext(req);
    if (context.error)
      return res
        .status(context.error.status)
        .json({ message: context.error.message });
    if (context.action === "timeIn") {
      const student = await User.findById(req.user.sub).select(
        "firstName middleName lastName studentId",
      );
      if (!student)
        return res.status(401).json({ message: "Student account not found" });
      const attendance = await EventAttendance.create({
        event: context.event._id,
        student: student._id,
        studentName: [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" "),
        studentId: student.studentId,
        timeIn: context.now,
      });
      const actorName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
      await notifyAllAdmins({
        type: "attendance",
        title: "Time in",
        message: `${actorName || "A student"} timed in for ${context.event.title}.`,
        event: context.event._id,
        actorName,
        actorStudentId: student.studentId || "",
      });
      return res.status(201).json({ message: "Time in recorded", attendance });
    }
    const attendance = await EventAttendance.findOneAndUpdate(
      { _id: context.attendance._id, timeOut: null },
      { $set: { timeOut: context.now } },
      { new: true },
    );
    if (!attendance)
      return res.status(409).json({ message: "Attendance already completed" });
    await notifyAllAdmins({
      type: "attendance",
      title: "Time out",
      message: `${attendance.studentName || "A student"} timed out for ${context.event.title}.`,
      event: context.event._id,
      actorName: attendance.studentName || "",
      actorStudentId: attendance.studentId || "",
    });
    return res.status(200).json({ message: "Time out recorded", attendance });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({
        message: "Time in already recorded. Scan again to time out.",
      });
    console.error(error);
    return res.status(500).json({ message: "Unable to record attendance" });
  }
};

export const previewAttendance = async (req, res) => {
  try {
    const context = await attendanceContext(req);
    if (context.error) return res.status(context.error.status).json({ message: context.error.message });
    const student = await User.findById(req.user.sub).select("firstName middleName lastName studentId");
    if (!student) return res.status(401).json({ message: "Student account not found" });
    return res.status(200).json({
      action: context.action,
      event: { _id: context.event._id, title: context.event.title },
      identity: {
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
        studentId: student.studentId,
      },
      attendance: context.attendance ? { timeIn: context.attendance.timeIn, timeOut: null } : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to verify attendance" });
  }
};

export const recordAttendance = async (req, res) => {
  if (!req.file && typeof req.body?.token === "string" && req.body.token) {
    return recordLegacyAttendance(req, res);
  }
  let uploadedPhoto;
  let photoPersisted = false;
  try {
    const context = await studentAttendanceContext(req);
    if (context.error)
      return res
        .status(context.error.status)
        .json({ message: context.error.message });
    if (!context.canSubmit) {
      return res.status(context.action === "complete" ? 409 : 400).json({
        message:
          context.message ||
          (context.action === "complete"
            ? "Attendance already completed"
            : "Attendance is not open"),
      });
    }

    uploadedPhoto = await uploadPhotoOrThrow(req.file);
    if (context.action === "timeIn") {
      const student = await User.findById(req.user.sub).select("firstName middleName lastName studentId");
      if (!student) return res.status(401).json({ message: "Student account not found" });
      const attendance = await EventAttendance.create({
        event: context.event._id,
        student: student._id,
        studentName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
        studentId: student.studentId,
        timeIn: context.now,
        timeInPhotoUrl: uploadedPhoto.imageUrl,
        timeInPhotoPublicId: uploadedPhoto.imagePublicId,
      });
      photoPersisted = true;
      await notifyStudent({
        user: req.user.sub,
        type: "attendance",
        title: "Attendance recorded",
        message: `Attendance was recorded for ${context.event.title}.`,
        event: context.event._id,
      });
      const actorName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
      await notifyAllAdmins({
        type: "attendance",
        title: "Time in",
        message: `${actorName || "A student"} timed in for ${context.event.title}.`,
        event: context.event._id,
        actorName,
        actorStudentId: student.studentId || "",
      });
      return res
        .status(201)
        .json({ message: "Time in recorded", attendance: attendancePayload(attendance) });
    }
    const attendance = await EventAttendance.findOneAndUpdate(
      { _id: context.attendance._id, timeOut: null },
      {
        $set: {
          timeOut: context.now,
          timeOutPhotoUrl: uploadedPhoto.imageUrl,
          timeOutPhotoPublicId: uploadedPhoto.imagePublicId,
        },
      },
      { new: true },
    );
    if (!attendance) {
      await removeEventImage(uploadedPhoto.imagePublicId).catch(() => {});
      return res.status(409).json({ message: "Attendance already completed" });
    }
    photoPersisted = true;
    await notifyStudent({
      user: req.user.sub,
      type: "attendance",
      title: "Attendance recorded",
      message: `Attendance was recorded for ${context.event.title}.`,
      event: context.event._id,
    });
    await notifyAllAdmins({
      type: "attendance",
      title: "Time out",
      message: `${attendance.studentName || "A student"} timed out for ${context.event.title}.`,
      event: context.event._id,
      actorName: attendance.studentName || "",
      actorStudentId: attendance.studentId || "",
    });
    return res
      .status(200)
      .json({ message: "Time out recorded", attendance: attendancePayload(attendance) });
  } catch (error) {
    if (!photoPersisted && uploadedPhoto?.imagePublicId) {
      await removeEventImage(uploadedPhoto.imagePublicId).catch(() => {});
    }
    if (error.code === 11000)
      return res
        .status(409)
        .json({ message: "Time in already recorded. Submit a photo for time out." });
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
        field: error.field,
      });
    }
    console.error(error);
    return res.status(500).json({ message: "Unable to record attendance" });
  }
};

export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id, { allowArchived: true });
    if (error) return res.status(error.status).json({ message: error.message });
    const [registered, checkedIn, checkedOut] = await Promise.all([
      EventRegistration.countDocuments({ event: event._id, status: "registered" }),
      EventAttendance.countDocuments({ event: event._id }),
      EventAttendance.countDocuments({ event: event._id, timeOut: { $exists: true, $ne: null } }),
    ]);
    return res.status(200).json({ attendance: { registered, checkedIn, checkedOut, currentlyPresent: checkedIn - checkedOut } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load attendance summary" });
  }
};

export const getAdminAttendanceRecords = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id, { allowArchived: true });
    if (error) return res.status(error.status).json({ message: error.message });
    const records = await EventAttendance.find({ event: event._id })
      .sort({ timeIn: 1 })
      .populate("student", "firstName lastName studentId email");
    return res.status(200).json({ attendance: records });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load attendance records" });
  }
};
