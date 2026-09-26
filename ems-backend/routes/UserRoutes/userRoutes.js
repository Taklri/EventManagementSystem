import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';


const router = express.Router();

router.post('/', registerUser);
router.put('/:id', updateUser);


export default router;