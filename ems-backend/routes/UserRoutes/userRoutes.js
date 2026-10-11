import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import {
    loginUser,
    verifyLoginOtp,
    resendLoginOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    refreshAccessToken,
    logoutUser
} from '../../controller/authUserController.js';
import {
    loginRateLimiter,
    otpRateLimiter,
    registerRateLimiter,
    registrationOtpRateLimiter,
    registrationResendRateLimiter,
    loginResendRateLimiter
} from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';


const router = express.Router();

router.post('/', registerRateLimiter, registerUser);
router.put('/:id', authenticate, updateUser);
router.post('/login', loginRateLimiter, loginUser);
router.post('/verify-otp', otpRateLimiter,  verifyLoginOtp);
router.post('/resend-login-otp', loginResendRateLimiter, resendLoginOtp);
router.post('/verify-registration-otp', registrationOtpRateLimiter, verifyRegistrationOtp);
router.post('/resend-registration-otp', registrationResendRateLimiter, resendRegistrationOtp);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

export default router;
