import Notification from "../models/Notification.js";
import User from "../models/User.js";

const writeNotifications = async (documents) => {
  if (!documents.length) return;
  try {
    await Notification.insertMany(documents, { ordered: false });
  } catch (error) {
    console.error("Notification write failed");
  }
};

export const notifyStudent = async ({ user, type, title, message, event }) => {
  await writeNotifications([{ user, type, title, message, event }]);
};

export const notifyAllStudents = async ({ type, title, message, event }) => {
  try {
    const students = await User.find({ role: "student" }).select("_id");
    await writeNotifications(
      students.map((student) => ({
        user: student._id,
        type,
        title,
        message,
        event,
      })),
    );
  } catch (error) {
    console.error("Notification write failed");
  }
};
