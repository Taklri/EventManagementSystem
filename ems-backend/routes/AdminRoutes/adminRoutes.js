import express from 'express';
import { getAdminStudents, updateAdminStudent } from '../../controller/adminStudentsController.js';
import { getAdminDashboard } from '../../controller/adminDashboardController.js';
import { getAdminEvents } from '../../controller/adminEventsController.js';
import { getAdminRegistrationSummary } from '../../controller/eventRegistrationController.js';
import {
  createAttendanceSession,
  getAdminAttendanceRecords,
  getAdminAttendanceSummary,
} from '../../controller/eventAttendanceController.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizeRoles } from '../../middleware/authorize.js';

const router = express.Router();
router.get('/students', authenticate, authorizeRoles('admin'), getAdminStudents);
router.put('/students/:id', authenticate, authorizeRoles('admin'), updateAdminStudent);

router.get('/dashboard', authenticate, authorizeRoles('admin'), getAdminDashboard);
router.get('/events', authenticate, authorizeRoles('admin'), getAdminEvents);
router.get('/events/:id/registrations', authenticate, authorizeRoles('admin'), getAdminRegistrationSummary);
router.post('/events/:id/attendance/session', authenticate, authorizeRoles('admin'), createAttendanceSession);
router.get('/events/:id/attendance', authenticate, authorizeRoles('admin'), getAdminAttendanceSummary);
router.get('/events/:id/attendance/records', authenticate, authorizeRoles('admin'), getAdminAttendanceRecords);

export default router;
