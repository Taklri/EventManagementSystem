import mongoose from 'mongoose';
import User from '../models/User.js';
import EventRegistration from '../models/EventRegistration.js';
import { programValidationError, yearLevelValidationError } from '../utils/authValidation.js';

const fields = '_id studentId firstName middleName lastName yearLevel program email imageUrl';
const displayStudent = (user, eventsJoined = 0) => ({
  id: String(user._id), studentId: user.studentId,
  firstName: user.firstName, middleName: user.middleName || '',
  lastName: user.lastName, yearLevel: user.yearLevel || '', program: user.program || '',
  email: user.email, imageUrl: user.imageUrl || null, eventsJoined,
});

const registrationCounts = (ids) => EventRegistration.aggregate([
  { $match: { student: { $in: ids }, status: 'registered' } },
  { $group: { _id: '$student', count: { $sum: 1 } } },
]);

export const getAdminStudents = async (_req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select(fields)
      .sort({ lastName: 1, firstName: 1, _id: 1 }).lean();
    const counts = students.length ? await registrationCounts(students.map((user) => user._id)) : [];
    const byId = new Map(counts.map((item) => [String(item._id), item.count]));
    return res.json({ users: students.map((user) => displayStudent(user, byId.get(String(user._id)) || 0)) });
  } catch {
    return res.status(500).json({ message: 'Unable to load students. Please try again.' });
  }
};

export const updateAdminStudent = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: 'Invalid student identifier' });
  }
  const body = req.body;
  const allowed = ['studentId', 'firstName', 'middleName', 'lastName', 'yearLevel', 'program'];
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => !allowed.includes(key))) {
    return res.status(400).json({ message: 'Only student ID, name, year level, and program fields may be updated' });
  }
  const update = {};
  const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
  for (const field of Object.keys(body)) {
    if (typeof body[field] !== 'string') {
      return res.status(400).json({ message: 'Please provide valid student fields', field });
    }
    update[field] = body[field].trim();
    const yearLevelError = field === 'yearLevel' ? yearLevelValidationError(update[field]) : '';
    const invalid = field === 'studentId' ? !/^\d{4}-\d{6}$/.test(update[field])
      : field === 'yearLevel' ? Boolean(yearLevelError)
        : field === 'program' ? Boolean(programValidationError(update[field]))
          : update[field].length > 100 || (!(field === 'middleName' && !update[field]) && !namePattern.test(update[field]));
    if (invalid) {
      const message = field === 'studentId'
        ? 'Student ID must use the format YYYY-######'
        : field === 'yearLevel'
          ? yearLevelError
          : field === 'program'
            ? 'Please select a valid program'
            : 'Names must contain letters, spaces, apostrophes, or hyphens (maximum 100 characters)';
      return res.status(400).json({ message, field });
    }
  }
  try {
    const duplicate = update.studentId
      ? await User.exists({ studentId: update.studentId, _id: { $ne: req.params.id } })
      : false;
    if (duplicate) return res.status(409).json({ message: 'This Student ID already belongs to another user.', field: 'studentId' });
    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' }, { $set: update },
      { new: true, runValidators: true },
    ).select(fields).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const user = displayStudent(student);
    delete user.eventsJoined;
    return res.json({ message: 'Student information updated.', user });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'This Student ID already belongs to another user.', field: 'studentId' });
    return res.status(500).json({ message: 'Unable to update student. Please try again.' });
  }
};
