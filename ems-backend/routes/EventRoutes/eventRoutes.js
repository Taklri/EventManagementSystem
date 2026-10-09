import express from "express";
import {
  createEvent,
  getEvents,
  getArchivedEvents,
  getEventById,
  updateEvent,
  archiveEvent,
} from "../../controller/createEventController.js";

const router = express.Router();

router.post("/", createEvent);
router.get("/", getEvents);
router.get("/archived", getArchivedEvents);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.patch("/:id/archive", archiveEvent);

export default router;
