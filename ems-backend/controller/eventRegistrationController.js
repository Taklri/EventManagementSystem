import mongoose from "mongoose";
import Event from "../models/Event.js";
import EventAttendance from "../models/EventAttendance.js";
import EventRegistration from "../models/EventRegistration.js";
import { withStatus } from "../utils/eventStatus.js";
import { notifyStudent } from "../services/notificationService.js";

const registrationPayload = (registration) => ({
  _id: registration._id,
  event: registration.event?._id || registration.event,
  student: registration.student?._id || registration.student,
  status: registration.status,
  registeredAt: registration.registeredAt,
  cancelledAt: registration.cancelledAt,
  createdAt: registration.createdAt,
  updatedAt: registration.updatedAt,
});

const getEventForRegistration = async (id) => {
  if (!mongoose.isValidObjectId(id)) return { error: { status: 400, message: "Event id is not valid" } };
  const event = await Event.findById(id);
  if (!event) return { error: { status: 404, message: "Event not found" } };
  if (event.isArchived) return { error: { status: 400, message: "Archived events cannot be registered for" } };
  if (event.registrationMode !== "required") {
    return { error: { status: 400, message: "This event does not require registration" } };
  }
  if (new Date() >= event.startDate) {
    return { error: { status: 400, message: "Registration is closed for this event" } };
  }
  return { event };
};

export const registerForEvent = async (req, res) => {
  try {
    const { event, error } = await getEventForRegistration(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });

    let registration = await EventRegistration.findOne({ event: event._id, student: req.user.sub });
    if (registration && registration.status !== "cancelled") {
      return res.status(409).json({
        message: registration.status === "waitlisted" ? "You are already on the waitlist" : "You are already registered",
        registration: registrationPayload(registration),
      });
    }

    const registeredCount = await EventRegistration.countDocuments({
      event: event._id,
      status: "registered",
    });
    const status = event.capacity && registeredCount >= event.capacity ? "waitlisted" : "registered";
    if (!registration) {
      registration = new EventRegistration({ event: event._id, student: req.user.sub, status });
    } else {
      registration.status = status;
      registration.registeredAt = new Date();
      registration.cancelledAt = undefined;
    }
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
      message: status === "waitlisted" ? "You have been added to the waitlist" : "You are registered for this event",
      registration: registrationPayload(registration),
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You already have a registration for this event" });
    console.error(error);
    return res.status(500).json({ message: "Unable to register for this event" });
  }
};

export const cancelEventRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.isArchived) return res.status(400).json({ message: "Archived events cannot change registrations" });
    if (new Date() >= event.startDate) return res.status(400).json({ message: "Registration changes are closed for this event" });
    const registration = await EventRegistration.findOne({ event: event._id, student: req.user.sub });
    if (!registration || registration.status === "cancelled") return res.status(404).json({ message: "You do not have an active registration" });
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
    return res.status(200).json({ message: "Registration cancelled", registration: registrationPayload(registration) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to cancel registration" });
  }
};

export const getEventRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id).select("capacity registrationMode");
    if (!event) return res.status(404).json({ message: "Event not found" });
    const registration = await EventRegistration.findOne({ event: req.params.id, student: req.user.sub });
    const registeredCount = event.registrationMode === "required"
      ? await EventRegistration.countDocuments({ event: event._id, status: "registered" })
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
    const registrations = await EventRegistration.find({ student: req.user.sub })
      .sort({ updatedAt: -1 })
      .populate("event");
    const eventIds = registrations.map((registration) => registration.event?._id).filter(Boolean);
    const attendanceRecords = await EventAttendance.find({
      student: req.user.sub,
      event: { $in: eventIds },
    }).select("event timeIn timeOut");
    const attendanceByEvent = new Map(
      attendanceRecords.map((attendance) => [String(attendance.event), attendance]),
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Event id is not valid" });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const [registered, waitlisted, cancelled] = await Promise.all([
      EventRegistration.countDocuments({ event: event._id, status: "registered" }),
      EventRegistration.countDocuments({ event: event._id, status: "waitlisted" }),
      EventRegistration.countDocuments({ event: event._id, status: "cancelled" }),
    ]);
    return res.status(200).json({ registration: { mode: event.registrationMode || "none", capacity: event.capacity || null, registered, waitlisted, cancelled } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load registration summary" });
  }
};
