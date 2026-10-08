import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import { loginUser } from '../../controller/authUserController.js';


const router = express.Router();

router.post('/', registerUser);
router.put('/:id', updateUser);
router.post('/login', loginUser);


export default router;