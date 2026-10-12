import Event from "../models/Event.js";
import User from "../models/User.js";
import { withStatus } from "../utils/eventStatus.js";

const DEFAULT_EVENT_PAGE_SIZE = 9;
const MAX_EVENT_PAGE_SIZE = 24;
const EVENT_STATUSES = new Set(["active", "upcoming", "ongoing", "all"]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseQueryInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
};

const hasEventListQuery = (query = {}) =>
  ["page", "limit", "search", "status"].some((key) => query[key] !== undefined);

const buildEventFilter = ({ search = "", status = "all", now = new Date() } = {}) => {
  const filter = { isArchived: { $ne: true } };
  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const expression = new RegExp(escapeRegex(trimmedSearch), "i");
    filter.$or = [
      { title: expression },
      { location: expression },
    ];
  }

  if (status === "active") {
    filter.endDate = { $gte: now };
  } else if (status === "upcoming") {
    filter.startDate = { $gt: now };
  } else if (status === "ongoing") {
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }

  return filter;
};

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
    const query = req.query || {};

    // Preserve the original collection response for existing callers that do
    // not request discovery controls. The student homepage opts into paging.
    if (!hasEventListQuery(query)) {
      const events = await Event.find({ isArchived: { $ne: true } })
        .sort({ startDate: 1, _id: 1 })
        .populate("organizer", "firstName middleName lastName email");

      return res.status(200).json({
        events: events.map((event) => withStatus(event)),
      });
    }

    const page = parseQueryInteger(query.page, 1, 1000000);
    const limit = parseQueryInteger(query.limit, DEFAULT_EVENT_PAGE_SIZE, MAX_EVENT_PAGE_SIZE);
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const status = typeof query.status === "string" ? query.status.trim().toLowerCase() : "all";

    if ((query.search !== undefined && typeof query.search !== "string")
      || (query.status !== undefined && typeof query.status !== "string")) {
      return res.status(400).json({ message: "Search and status must be strings" });
    }

    if (!page || !limit) {
      return res.status(400).json({
        message: `Page must be between 1 and 1000000 and limit must be between 1 and ${MAX_EVENT_PAGE_SIZE}`,
      });
    }

    if (search.length > 100) {
      return res.status(400).json({ message: "Search must be 100 characters or fewer" });
    }

    if (!EVENT_STATUSES.has(status)) {
      return res.status(400).json({
        message: "Status must be active, upcoming, ongoing, or all",
      });
    }

    const filter = buildEventFilter({ search, status });
    const [total, events] = await Promise.all([
      Event.countDocuments(filter),
      Event.find(filter)
        .sort({ startDate: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("organizer", "firstName middleName lastName email"),
    ]);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      events: events.map((event) => withStatus(event)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1 && totalPages > 0,
      },
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
