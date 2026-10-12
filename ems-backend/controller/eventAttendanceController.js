import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import EventAttendance from "../models/EventAttendance.js";
import EventRegistration from "../models/EventRegistration.js";

const getEvent = async (id) => {
  if (!mongoose.isValidObjectId(id)) return { error: { status: 400, message: "Event id is not valid" } };
  const event = await Event.findById(id);
  if (!event) return { error: { status: 404, message: "Event not found" } };
  if (event.isArchived) return { error: { status: 400, message: "Archived events cannot collect attendance" } };
  if (event.registrationMode !== "required") return { error: { status: 400, message: "This event does not collect attendance" } };
  return { event };
};

export const createAttendanceSession = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.floor(new Date(event.endDate).getTime() / 1000);
    if (expiresAt <= now) return res.status(400).json({ message: "Attendance is closed for this event" });
    const token = jwt.sign(
      { purpose: "event-attendance", eventId: String(event._id) },
      process.env.JWT_SECRET_KEY,
      { expiresIn: Math.max(60, expiresAt - now) },
    );
    return res.status(201).json({ token, expiresAt: new Date(expiresAt * 1000).toISOString(), eventId: event._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to create attendance code" });
  }
};

export const recordAttendance = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    if (typeof req.body?.token !== "string" || !req.body.token) return res.status(400).json({ message: "Attendance code is required" });
    let claims;
    try {
      claims = jwt.verify(req.body.token, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(400).json({ message: "Attendance code is invalid or expired" });
    }
    if (claims.purpose !== "event-attendance" || claims.eventId !== String(event._id)) {
      return res.status(400).json({ message: "Attendance code is invalid for this event" });
    }
    const now = new Date();
    if (now < event.startDate || now > event.endDate) return res.status(400).json({ message: "Attendance is only available while the event is ongoing" });
    const registration = await EventRegistration.findOne({ event: event._id, student: req.user.sub, status: "registered" });
    if (!registration) return res.status(403).json({ message: "You must be registered for this event to record attendance" });
    let attendance = await EventAttendance.findOne({ event: event._id, student: req.user.sub });
    if (!attendance) {
      attendance = await EventAttendance.create({ event: event._id, student: req.user.sub, timeIn: now });
      return res.status(201).json({ message: "Time in recorded", attendance });
    }
    if (attendance.timeOut) return res.status(409).json({ message: "You have already recorded time in and time out", attendance });
    attendance.timeOut = now;
    await attendance.save();
    return res.status(200).json({ message: "Time out recorded", attendance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to record attendance" });
  }
};

export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const { event, error } = await getEvent(req.params.id);
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
    const { event, error } = await getEvent(req.params.id);
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
