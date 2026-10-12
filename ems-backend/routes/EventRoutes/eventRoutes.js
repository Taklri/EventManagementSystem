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
import {
  cancelEventRegistration,
  getEventRegistration,
  getMyEventRegistrations,
  registerForEvent,
} from "../../controller/eventRegistrationController.js";
import { recordAttendance } from "../../controller/eventAttendanceController.js";

const router = express.Router();

router.post("/", authenticate, authorizeRoles("admin"), eventImageUpload, createEvent);
router.get("/", authenticate, authorizeRoles("student", "admin"), getEvents);
router.get("/archived", authenticate, authorizeRoles("student", "admin"), getArchivedEvents);
router.get("/my-registrations", authenticate, authorizeRoles("student"), getMyEventRegistrations);
router.get("/:id/registration", authenticate, authorizeRoles("student"), getEventRegistration);
router.post("/:id/registration", authenticate, authorizeRoles("student"), registerForEvent);
router.delete("/:id/registration", authenticate, authorizeRoles("student"), cancelEventRegistration);
router.post("/:id/attendance", authenticate, authorizeRoles("student"), recordAttendance);
router.get("/:id", authenticate, authorizeRoles("student", "admin"), getEventById);
router.put("/:id", authenticate, authorizeRoles("admin"), eventImageUpload, updateEvent);
router.patch("/:id/archive", authenticate, authorizeRoles("admin"), archiveEvent);
router.patch("/:id/unarchive", authenticate, authorizeRoles("admin"), unarchiveEvent);

export default router;
