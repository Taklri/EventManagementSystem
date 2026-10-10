import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import { loginUser, verifyLoginOtp } from '../../controller/authUserController.js';
import { loginRateLimiter, otpRateLimiter } from '../../middleware/rateLimiter.js';


const router = express.Router();

router.post('/', registerUser);
router.put('/:id', updateUser);
router.post('/login', loginRateLimiter, loginUser);
router.post('/verify-otp', otpRateLimiter,  verifyLoginOtp);

export default router;
