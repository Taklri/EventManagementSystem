import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import {
    loginUser,
    verifyLoginOtp,
    resendLoginOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    refreshAccessToken,
    logoutUser,
    forgotPassword,
    verifyResetOtp,
    resendResetOtp,
    resetPassword
} from '../../controller/authUserController.js';
import {
    loginRateLimiter,
    otpRateLimiter,
    registerRateLimiter,
    registrationOtpRateLimiter,
    registrationResendRateLimiter,
    loginResendRateLimiter,
    forgotPasswordRateLimiter,
    resetOtpRateLimiter,
    resetResendRateLimiter,
    resetPasswordRateLimiter
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
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/verify-reset-otp', resetOtpRateLimiter, verifyResetOtp);
router.post('/resend-reset-otp', resetResendRateLimiter, resendResetOtp);
router.post('/reset-password', resetPasswordRateLimiter, resetPassword);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

export default router;
