import mongoose from "mongoose";
import Notification from "../models/Notification.js";

const notificationPayload = (notification) => ({
  _id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  event: notification.event || null,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

export const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.sub }).sort({ createdAt: -1, _id: -1 }).limit(100),
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
    const owned = await Notification.findOne({ _id: req.params.id, user: req.user.sub });
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
