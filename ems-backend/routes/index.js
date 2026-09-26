import express from 'express'
import eventRoutes from './EventRoutes/eventRoutes.js'
import userRoutes from './UserRoutes/userRoutes.js'

const router = express.Router();

router.use('/events', eventRoutes);
router.use('/users', userRoutes);

export default router;