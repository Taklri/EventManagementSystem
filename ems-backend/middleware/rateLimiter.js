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

export const apiRateLimiter =  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many requests. Please try again later.'
    }
})