import express from 'express';
import { getAdminStudents, updateAdminStudent } from '../../controller/adminStudentsController.js';
import { getAdminDashboard } from '../../controller/adminDashboardController.js';
import { getAdminEvents } from '../../controller/adminEventsController.js';
import { exportAdminRegistrations, getAdminRegistrationSummary } from '../../controller/eventRegistrationController.js';
import {
  createAttendanceSession,
  getAdminAttendanceRecords,
  getAdminAttendanceSummary,
} from '../../controller/eventAttendanceController.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import {
  archiveRegistrationForm,
  createRegistrationForm,
  exportRegistrationFormResponses,
  getRegistrationFormResponseById,
  getRegistrationFormResponses,
  getRegistrationFormById,
  listRegistrationForms,
  unarchiveRegistrationForm,
  updateRegistrationForm,
} from '../../controller/registrationFormController.js';

const router = express.Router();
router.get('/students', authenticate, authorizeRoles('admin'), getAdminStudents);
router.put('/students/:id', authenticate, authorizeRoles('admin'), updateAdminStudent);

router.get('/dashboard', authenticate, authorizeRoles('admin'), getAdminDashboard);
router.get('/events', authenticate, authorizeRoles('admin'), getAdminEvents);
router.get('/events/:id/registrations', authenticate, authorizeRoles('admin'), getAdminRegistrationSummary);
router.get('/events/:id/registrations/export', authenticate, authorizeRoles('admin'), exportAdminRegistrations);
router.post('/events/:id/attendance/session', authenticate, authorizeRoles('admin'), createAttendanceSession);
router.get('/events/:id/attendance', authenticate, authorizeRoles('admin'), getAdminAttendanceSummary);
router.get('/events/:id/attendance/records', authenticate, authorizeRoles('admin'), getAdminAttendanceRecords);
router.get('/registration-forms', authenticate, authorizeRoles('admin'), listRegistrationForms);
router.post('/registration-forms', authenticate, authorizeRoles('admin'), createRegistrationForm);
router.get('/registration-forms/:id/responses', authenticate, authorizeRoles('admin'), getRegistrationFormResponses);
router.get('/registration-forms/:id/responses/export', authenticate, authorizeRoles('admin'), exportRegistrationFormResponses);
router.get('/registration-forms/:id/responses/:responseId', authenticate, authorizeRoles('admin'), getRegistrationFormResponseById);
router.get('/registration-forms/:id', authenticate, authorizeRoles('admin'), getRegistrationFormById);
router.put('/registration-forms/:id', authenticate, authorizeRoles('admin'), updateRegistrationForm);
router.patch('/registration-forms/:id/archive', authenticate, authorizeRoles('admin'), archiveRegistrationForm);
router.patch('/registration-forms/:id/unarchive', authenticate, authorizeRoles('admin'), unarchiveRegistrationForm);

export default router;
