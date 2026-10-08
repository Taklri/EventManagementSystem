import express from 'express';
import { createEvent } from '../../controller/createEventController.js'
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createEvent);

export default router;