import Event from '../models/Event.js';
import { withStatus } from '../utils/eventStatus.js';

const STATUSES = new Set(['all', 'upcoming', 'ongoing', 'ended', 'archived']);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePageNumber = (value, fallback, maximum) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= maximum ? number : null;
};

export const getAdminEvents = async (req, res) => {
  const page = parsePageNumber(req.query.page, 1, 1000000);
  const limit = parsePageNumber(req.query.limit, 10, 24);
  const search = req.query.search === undefined ? '' : req.query.search;
  const status = req.query.status === undefined ? 'all' : req.query.status;

  if (!page || !limit || typeof search !== 'string' || search.trim().length > 100
    || typeof status !== 'string' || !STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid event list filters' });
  }

  const now = new Date();
  const filter = {};
  if (status === 'archived') filter.isArchived = true;
  if (status === 'upcoming') {
    filter.isArchived = { $ne: true };
    filter.startDate = { $gt: now };
  }
  if (status === 'ongoing') {
    filter.isArchived = { $ne: true };
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }
  if (status === 'ended') {
    filter.isArchived = { $ne: true };
    filter.endDate = { $lt: now };
  }
  if (search.trim()) {
    const expression = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: expression }, { location: expression }, { organizerName: expression }];
  }

  try {
    const [total, events] = await Promise.all([
      Event.countDocuments(filter),
      Event.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('organizer', 'firstName middleName lastName'),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      events: events.map(withStatus),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1 && totalPages > 0,
      },
    });
  } catch {
    console.error('Admin event list request failed');
    return res.status(500).json({ message: 'Failed to load events' });
  }
};
