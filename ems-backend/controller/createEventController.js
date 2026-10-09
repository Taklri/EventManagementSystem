import Event from "../models/Event.js";
import User from "../models/User.js";
import { withStatus } from "../utils/eventStatus.js";

//creating eventss (labelan ko lang para di malito)
export const createEvent = async (req, res) => {
  try {
    const { title, description, location, organizer, startDate, endDate } =
      req.body;

    const missing = [];
    if (!title || !String(title).trim()) missing.push("title");
    if (!description || !String(description).trim())
      missing.push("description");
    if (!location || !String(location).trim()) missing.push("location");
    if (!organizer) missing.push("organizer");
    if (!startDate) missing.push("startDate");
    if (!endDate) missing.push("endDate");

    if (missing.length > 0) {
      return res.status(400).json({
        message: "Please Fill in all required fields",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        message: "Start date is not a valid date",
      });
    }
    if (Number.isNaN(end.getTime())) {
      return res.status(400).json({
        message: "End date is not a valid date",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        message: "End date must be after the start date",
      });
    }

    const user = await User.findById(organizer);

    if (!user) {
      return res.status(400).json({
        message: "Organizer not found",
      });
    }

    const event = await Event.create({
      title,
      description,
      location,
      organizer,
      startDate: start,
      endDate: end,
    });

    await event.populate("organizer", "firstName middleName lastName email");
    return res.status(201).json({
      message: "Event created successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Organizer id is not valid",
      });
    }
    return res.status(500).json({
      message: "Failed to create event",
    });
  }
};

//getting events
export const getEvents = async (req, res) => {
  try {
    const events = await Event.find({ isArchived: { $ne: true } }).populate(
      "organizer",
      "firstName middleName lastName email",
    );

    return res.status(200).json({
      events: events.map((event) => withStatus(event)),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get events",
    });
  }
};

//getting archived eventss
export const getArchivedEvents = async (req, res) => {
  try {
    const events = await Event.find({ isArchived: true }).populate(
      "organizer",
      "firstName middleName lastName email",
    );

    return res.status(200).json({
      events: events.map((event) => withStatus(event)),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get archived events",
    });
  }
};

//by id
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "firstName middleName lastName email",
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    return res.status(200).json({
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Event id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to get event",
    });
  }
};

//edit and archive eventss
export const updateEvent = async (req, res) => {
  try {
    const { title, description, location, organizer, startDate, endDate } =
      req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.isArchived) {
      return res.status(400).json({
        message: "Archived events cannot be edited",
      });
    }

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          message: "Title cannot be empty",
        });
      }
      event.title = title;
    }

    if (description !== undefined) {
      if (!String(description).trim()) {
        return res.status(400).json({
          message: "Description cannot be empty",
        });
      }
      event.description = description;
    }

    if (location !== undefined) {
      if (!String(location).trim()) {
        return res.status(400).json({
          message: "Location cannot be empty",
        });
      }
      event.location = location;
    }

    if (organizer !== undefined) {
      const user = await User.findById(organizer);
      if (!user) {
        return res.status(404).json({
          message: "Organizer not found",
        });
      }
      event.organizer = organizer;
    }

    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          message: "Start date is not a valid date",
        });
      }
      event.startDate = start;
    }

    if (endDate !== undefined) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: "End date is not a valid date",
        });
      }
      event.endDate = end;
    }

    if (event.endDate <= event.startDate) {
      return res.status(400).json({
        message: "End date must be after the start date",
      });
    }

    await event.save();
    await event.populate("organizer", "firstName middleName lastName email");

    return res.status(200).json({
      message: "Event updated successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update event",
    });
  }
};

//archiving events
export const archiveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.isArchived) {
      return res.status(400).json({
        message: "Event is already archived",
      });
    }

    event.isArchived = true;
    await event.save();
    await event.populate("organizer", "firstName middleName lastName email");

    return res.status(200).json({
      message: "Event archived successfully",
      event: withStatus(event),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Event id is not valid",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to archive event",
    });
  }
};
