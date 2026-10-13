import express from "express";
import {
  createEvent,
  getEvents,
  getArchivedEvents,
  getEventById,
  updateEvent,
  archiveEvent,
  unarchiveEvent,
} from "../../controller/createEventController.js";
import { authenticate } from "../../middleware/auth.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { eventImageUpload } from "../../middleware/eventImageUpload.js";
import { attendancePhotoUpload } from "../../middleware/attendancePhotoUpload.js";
import {
  cancelEventRegistration,
  getEventRegistration,
  getRegistrationForm,
  getMyEventRegistrations,
  registerForEvent,
} from "../../controller/eventRegistrationController.js";
import {
  getStudentAttendance,
  previewAttendance,
  recordAttendance,
} from "../../controller/eventAttendanceController.js";

const router = express.Router();

router.post("/", authenticate, authorizeRoles("admin"), eventImageUpload, createEvent);
router.get("/", authenticate, authorizeRoles("student", "admin"), getEvents);
router.get("/archived", authenticate, authorizeRoles("student", "admin"), getArchivedEvents);
router.get("/my-registrations", authenticate, authorizeRoles("student"), getMyEventRegistrations);
router.get("/:id/registration", authenticate, authorizeRoles("student"), getEventRegistration);
router.get("/:id/registration/form", authenticate, authorizeRoles("student"), getRegistrationForm);
router.post("/:id/registration", authenticate, authorizeRoles("student"), registerForEvent);
router.delete("/:id/registration", authenticate, authorizeRoles("student"), cancelEventRegistration);
router.get("/:id/attendance", authenticate, authorizeRoles("student"), getStudentAttendance);
router.post(
  "/:id/attendance",
  authenticate,
  authorizeRoles("student"),
  attendancePhotoUpload,
  recordAttendance,
);
router.post("/:id/attendance/preview", authenticate, authorizeRoles("student"), previewAttendance);
router.get("/:id", authenticate, authorizeRoles("student", "admin"), getEventById);
router.put("/:id", authenticate, authorizeRoles("admin"), eventImageUpload, updateEvent);
router.patch("/:id/archive", authenticate, authorizeRoles("admin"), archiveEvent);
router.patch("/:id/unarchive", authenticate, authorizeRoles("admin"), unarchiveEvent);

export default router;
