import { rateLimit } from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts. Please try again later.'
    }
});

export const otpRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many OTP attempts. Please try again later.'
    }
})

export const loginResendRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many login OTP resend requests. Please try again later.'
    }
});

export const apiRateLimiter =  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many requests. Please try again later.'
    }
})

export const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message:{
        message: 'Too many registration attempts. Please try again later'
    }
});

export const registrationOtpRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many registration OTP attempts. Please try again later.'
    }
});

export const forgotPasswordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many password reset attempts. Please try again later.'
    }
});

export const resetOtpRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many password reset OTP attempts. Please try again later.'
    }
});

export const resetResendRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many password reset OTP resend requests. Please try again later.'
    }
});

export const resetPasswordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many password reset attempts. Please try again later.'
    }
});

const profileRequestLimit = {
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
};

const profileVerifyLimit = {
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
};

const profileResendLimit = {
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
};

export const profileEmailRequestRateLimiter = rateLimit({
    ...profileRequestLimit,
    message: { message: 'Too many email change attempts. Please try again later.' },
});

export const profileEmailVerifyRateLimiter = rateLimit({
    ...profileVerifyLimit,
    message: { message: 'Too many email verification attempts. Please try again later.' },
});

export const profileEmailResendRateLimiter = rateLimit({
    ...profileResendLimit,
    message: { message: 'Too many email verification resend requests. Please try again later.' },
});

export const profilePasswordRequestRateLimiter = rateLimit({
    ...profileRequestLimit,
    message: { message: 'Too many password change attempts. Please try again later.' },
});

export const profilePasswordVerifyRateLimiter = rateLimit({
    ...profileVerifyLimit,
    message: { message: 'Too many password verification attempts. Please try again later.' },
});

export const profilePasswordResendRateLimiter = rateLimit({
    ...profileResendLimit,
    message: { message: 'Too many password verification resend requests. Please try again later.' },
});

export const registrationResendRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many registration OTP resend requests. Please try again later.'
    }
});
