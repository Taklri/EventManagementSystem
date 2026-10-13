import express from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../controller/notificationController.js";
import { authenticate } from "../../middleware/auth.js";
import { authorizeRoles } from "../../middleware/authorize.js";

const router = express.Router();

router.use(authenticate, authorizeRoles("student", "admin"));
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
