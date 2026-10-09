import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import { loginUser, verifyLoginOtp } from '../../controller/authUserController.js';


const router = express.Router();

router.post('/', registerUser);
router.put('/:id', updateUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyLoginOtp);

export default router;
