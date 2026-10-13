import express from 'express'
import eventRoutes from './EventRoutes/eventRoutes.js'
import userRoutes from './UserRoutes/userRoutes.js'
import adminRoutes from './AdminRoutes/adminRoutes.js'
import notificationRoutes from './NotificationRoutes/notificationRoutes.js'

const router = express.Router();

router.use('/events', eventRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
