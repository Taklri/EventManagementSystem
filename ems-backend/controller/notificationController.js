import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { calculateStatus } from "../utils/eventStatus.js";

const eventFields = "title description location startDate endDate eventType organizerName imageUrl isArchived";

const eventSummary = (event) => {
  if (!event?.title || !event.startDate || !event.endDate) return null;
  return {
    id: event._id,
    title: event.title,
    description: event.description || "",
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    eventType: event.eventType || "Other",
    organizerName: event.organizerName || null,
    imageUrl: event.imageUrl || null,
    isArchived: Boolean(event.isArchived),
    status: calculateStatus(event),
  };
};

const notificationPayload = (notification) => {
  const populated = notification.event?.title ? notification.event : null;
  return {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    event: populated ? populated._id : notification.event || null,
    eventDetails: eventSummary(populated),
    actorName: notification.actorName || "",
    actorStudentId: notification.actorStudentId || "",
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
};

export const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.sub }).sort({ createdAt: -1, _id: -1 }).limit(100).populate("event", eventFields),
      Notification.countDocuments({ user: req.user.sub, readAt: null }),
    ]);
    return res.status(200).json({
      notifications: notifications.map(notificationPayload),
      unreadCount,
    });
  } catch (error) {
    console.error("Notification list failed");
    return res.status(500).json({ message: "Unable to load notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Notification id is not valid" });
    }
    const owned = await Notification.findOne({ _id: req.params.id, user: req.user.sub }).populate("event", eventFields);
    if (!owned) return res.status(404).json({ message: "Notification not found" });
    if (!owned.readAt) {
      owned.readAt = new Date();
      await owned.save();
    }
    const unreadCount = await Notification.countDocuments({ user: req.user.sub, readAt: null });
    return res.status(200).json({
      message: "Notification marked as read",
      notification: notificationPayload(owned),
      unreadCount,
    });
  } catch (error) {
    console.error("Notification read failed");
    return res.status(500).json({ message: "Unable to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.sub, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.status(200).json({
      message: "Notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Notification read-all failed");
    return res.status(500).json({ message: "Unable to update notifications" });
  }
};
