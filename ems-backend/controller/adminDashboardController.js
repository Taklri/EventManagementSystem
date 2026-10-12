import Event from '../models/Event.js';
import EventAttendance from '../models/EventAttendance.js';
import EventRegistration from '../models/EventRegistration.js';
import { withStatus } from '../utils/eventStatus.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const [total, upcoming, ongoing, archived, registrations, attendees, recentEvents] = await Promise.all([
      Event.countDocuments({ isArchived: { $ne: true } }),
      Event.countDocuments({ isArchived: { $ne: true }, startDate: { $gt: now } }),
      Event.countDocuments({ isArchived: { $ne: true }, startDate: { $lte: now }, endDate: { $gte: now } }),
      Event.countDocuments({ isArchived: true }),
      EventRegistration.countDocuments({ status: 'registered' }),
      EventAttendance.countDocuments({}),
      Event.find({ isArchived: { $ne: true } })
        .sort({ updatedAt: -1, _id: -1 })
        .limit(6)
        .populate('organizer', 'firstName middleName lastName'),
    ]);

    return res.status(200).json({
      metrics: { total, upcoming, ongoing, archived, registrations, attendees },
      recentEvents: recentEvents.map(withStatus),
    });
  } catch {
    console.error('Admin dashboard request failed');
    return res.status(500).json({ message: 'Failed to load admin dashboard' });
  }
};
