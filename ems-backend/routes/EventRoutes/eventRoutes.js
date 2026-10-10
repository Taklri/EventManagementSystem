import express from "express";
import {
  createEvent,
  getEvents,
  getArchivedEvents,
  getEventById,
  updateEvent,
  archiveEvent,
} from "../../controller/createEventController.js";
import { authenticate } from "../../middleware/auth.js";
import { authorizeRoles } from "../../middleware/authorize.js";

const router = express.Router();

router.post("/", authenticate, authorizeRoles("admin"),  createEvent);
router.get("/", getEvents);
router.get("/archived", getArchivedEvents);
router.get("/:id", getEventById);
router.put("/:id", authenticate, authorizeRoles("admin"), updateEvent);
router.patch("/:id/archive", authenticate, authorizeRoles("admin"), archiveEvent);

export default router;
