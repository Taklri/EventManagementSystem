import express from 'express';
import { registerUser, updateUser } from '../../controller/userController.js';
import {
    getMyProfile,
    updateMyProfile,
    updateMyPhoto,
    removeMyPhoto,
    requestEmailChange,
    verifyEmailChange,
    resendEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    resendPasswordChange,
} from '../../controller/profileController.js';
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
    resetPasswordRateLimiter,
    profileEmailRequestRateLimiter,
    profileEmailVerifyRateLimiter,
    profileEmailResendRateLimiter,
    profilePasswordRequestRateLimiter,
    profilePasswordVerifyRateLimiter,
    profilePasswordResendRateLimiter,
} from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';
import { profileImageUpload } from '../../middleware/profileImageUpload.js';


const router = express.Router();

router.post('/', registerRateLimiter, registerUser);
router.get('/me', authenticate, getMyProfile);
router.patch('/me', authenticate, updateMyProfile);
router.put('/me/photo', authenticate, profileImageUpload, updateMyPhoto);
router.delete('/me/photo', authenticate, removeMyPhoto);
router.post('/me/email/otp', profileEmailRequestRateLimiter, authenticate, requestEmailChange);
router.post('/me/email/verify', profileEmailVerifyRateLimiter, authenticate, verifyEmailChange);
router.post('/me/email/resend', profileEmailResendRateLimiter, authenticate, resendEmailChange);
router.post('/me/password/otp', profilePasswordRequestRateLimiter, authenticate, requestPasswordChange);
router.post('/me/password/verify', profilePasswordVerifyRateLimiter, authenticate, verifyPasswordChange);
router.post('/me/password/resend', profilePasswordResendRateLimiter, authenticate, resendPasswordChange);
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
