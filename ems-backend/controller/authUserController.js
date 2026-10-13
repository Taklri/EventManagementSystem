import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// helpers
import LoginOtp from '../models/LoginOtp.js';
import PasswordResetOtp from '../models/PasswordResetOtp.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { sendOtpEmail } from '../services/brevoService.js';
import { resendOtpChallenge } from '../services/otpChallengeService.js';
import { isValidEmail, passwordValidationError } from '../utils/authValidation.js';
import { generateOtp, hashOtp, compareOtp, challengeDetails } from '../utils/otp.js';
import { tokenIssuedBeforePasswordChange } from '../middleware/auth.js';

const RESET_NOTICE = 'If an account exists for that email, we sent a verification code.';

const issueTokens = (user, res) => {
    const accessToken = jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: '15m'
        }
    );

    const refreshToken = jwt.sign(
        {
            sub: user._id.toString()
        },
        process.env.JWT_REFRESH_SECRET_KEY,
        {
            expiresIn: '7d'
        }
    );

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return accessToken;
};

const displayUser = (user) => ({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
});


export const loginUser = async (req, res) => {
    try{
        const {email, password} = req.body || {};

        if(typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password){
            return res.status(400).json({
                message: "Please Enter your Credentials"
            })
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const user = await User.findOne({email: normalizedEmail});

        if(!user){
            return res.status(400).json({
                message: "Invalid Credentials"
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch){
            return res.status(400).json({
                message: "Invalid Credentials"
            });
        }

        const otp = generateOtp();

        const otpHash = await hashOtp(otp);

        const expiresAt = new Date(
            Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
        );

        await LoginOtp.updateMany(
            {
                user: user._id,
                consumedAt: null
            },
            {
                $set: {
                    consumedAt: new Date()
                }
            }
        );

        const loginOtp = await LoginOtp.create({
            user: user._id,
            codeHash: otpHash,
            expiresAt,
            lastSentAt: new Date(),
            resendCount: 0
        });

        try {
            await sendOtpEmail({
                recipientEmail: user.email,
                recipientName: user.firstName,
                otp,
                purpose: 'login'
            });
        } catch (error) {
            await LoginOtp.deleteOne({ _id: loginOtp._id });
            throw error;
        }

        return res.status(200).json({
            message: 'OTP sent to your email',
            ...challengeDetails(loginOtp)
        });
    }
    catch (err) {
        console.error('Login request failed');

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export const resendLoginOtp = async (req, res) => {
    try {
        const { challengeId } = req.body || {};
        if (typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({ message: 'A valid challenge ID is required' });
        }

        const loginOtp = await LoginOtp.findById(challengeId);
        if (!loginOtp || loginOtp.consumedAt) {
            return res.status(401).json({ message: 'Invalid or expired login challenge' });
        }
        if (loginOtp.expiresAt <= new Date()) {
            return res.status(410).json({ message: 'Login challenge has expired. Please log in again.' });
        }
        if (loginOtp.attempts >= 5) {
            return res.status(429).json({ message: 'Too many incorrect OTP attempts' });
        }

        const resendCooldownSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
        const lastSentAt = loginOtp.lastSentAt || loginOtp.createdAt || new Date();
        const elapsedSeconds = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
        if (elapsedSeconds < resendCooldownSeconds) {
            return res.status(429).json({
                message: 'Please wait before requesting another OTP',
                retryAfterSeconds: resendCooldownSeconds - elapsedSeconds
            });
        }
        if (loginOtp.resendCount >= 3) {
            return res.status(429).json({ message: 'Login OTP resend limit reached' });
        }

        const user = await User.findById(loginOtp.user);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updated = await resendOtpChallenge({
            model: LoginOtp,
            challenge: loginOtp,
            recipientEmail: user.email,
            recipientName: user.firstName,
            purpose: 'login'
        });
        if (!updated) return res.status(409).json({ message: 'This challenge changed. Please try again.' });

        return res.status(200).json({
            message: 'Login OTP resent',
            ...challengeDetails(updated)
        });
    } catch (error) {
        console.error('Login OTP resend failed');
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: 'Refresh token required'
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET_KEY
        );

        const user = await User.findById(decoded.sub);

        if (!user || decoded.purpose || tokenIssuedBeforePasswordChange(decoded, user)) {
            return res.status(401).json({
                message: 'Invalid refresh token'
            });
        }

        const accessToken = issueTokens(user, res);

        return res.status(200).json({
            message: 'Access token refreshed',
            accesstoken: accessToken,
            user: displayUser(user)
        });
    } catch (error) {
        console.error('Refresh token request failed');

        return res.status(401).json({
            message: 'Invalid or expired refresh token'
        });
    }
};

export const verifyLoginOtp = async (req,res) => {
    try{

        const { challengeId, otp } = req.body || {};
        const submittedOtp = typeof otp === 'string' ? otp.trim() : '';

        if(!challengeId || !submittedOtp){
            return res.status(400).json({
                message: 'Challenge ID and OTP are required'
            });
        }

        if(typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)){
            return res.status(400).json({
                message: 'Invalid challenge ID'
            });
        }

        if(!/^\d{6}$/.test(submittedOtp)){
            return res.status(400).json({
                message: 'OTP must be exactly 6 digits'
            });
        }

        const loginOtp = await LoginOtp.findById(challengeId);

        if (!loginOtp) {
            return res.status(401).json({
                message: 'Invalid or expired OTP'
            });
        }

        if (loginOtp.consumedAt) {
            return res.status(401).json({
                message: 'OTP has already been used'
            });
        }

        if(loginOtp.expiresAt <= new Date()){
            return res.status(401).json({
                message: 'OTP has expired'
            });
        }

        if(loginOtp.attempts >= 5){
            return res.status(429).json({
                message: 'Too many incorrect OTP attempts'
            });
        }

        const otpIsValid = await compareOtp(
            submittedOtp,
            loginOtp.codeHash
        );

        if (!otpIsValid) {
            await LoginOtp.updateOne(
                { _id: loginOtp._id, codeHash: loginOtp.codeHash, consumedAt: null, attempts: { $lt: 5 } },
                { $inc: { attempts: 1 } }
            );

            return res.status(401).json({
                message: 'Invalid or expired OTP'
            });
        }

        const user = await User.findById(loginOtp.user);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const consumed = await LoginOtp.updateOne(
            { _id: loginOtp._id, codeHash: loginOtp.codeHash, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
            { $set: { consumedAt: new Date() } }
        );
        if (consumed.modifiedCount !== 1) {
            return res.status(401).json({ message: 'Invalid, expired, or already used OTP' });
        }

        const accessToken = issueTokens(user, res);

        return res.status(200).json({
            message: 'Login successful',
            accesstoken: accessToken,
            user: displayUser(user)
        });

    }
    catch (error) {
        console.error('Login OTP verification failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export const verifyRegistrationOtp = async (req, res) => {
    try {
        const { challengeId, otp } = req.body || {};
        const submittedOtp = typeof otp === 'string' ? otp.trim() : '';

        if (!challengeId || !submittedOtp) {
            return res.status(400).json({
                message: 'Challenge ID and OTP are required'
            });
        }

        if (typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({
                message: 'Invalid challenge ID'
            });
        }

        if (!/^\d{6}$/.test(submittedOtp)) {
            return res.status(400).json({
                message: 'OTP must be exactly 6 digits'
            });
        }

        const pendingRegistration = await PendingRegistration.findById(challengeId);

        if (!pendingRegistration || pendingRegistration.consumedAt) {
            return res.status(401).json({
                message: 'Invalid or expired registration OTP'
            });
        }

        if (pendingRegistration.expiresAt <= new Date()) {
            return res.status(401).json({
                message: 'Registration OTP has expired'
            });
        }

        if (pendingRegistration.attempts >= 5) {
            return res.status(429).json({
                message: 'Too many incorrect registration OTP attempts'
            });
        }

        const otpIsValid = await compareOtp(
            submittedOtp,
            pendingRegistration.codeHash
        );

        if (!otpIsValid) {
            await PendingRegistration.updateOne(
                { _id: pendingRegistration._id, codeHash: pendingRegistration.codeHash, attempts: { $lt: 5 } },
                { $inc: { attempts: 1 } }
            );

            return res.status(401).json({
                message: 'Invalid or expired registration OTP'
            });
        }

        const consumedAt = new Date();
        const claimed = await PendingRegistration.updateOne(
            { _id: pendingRegistration._id, codeHash: pendingRegistration.codeHash, consumedAt: null, expiresAt: { $gt: consumedAt }, attempts: { $lt: 5 } },
            { $set: { consumedAt } }
        );
        if (claimed.modifiedCount !== 1) {
            return res.status(401).json({ message: 'Invalid, expired, or already used registration OTP' });
        }

        let user;
        try {
            user = await User.create({
                studentId: pendingRegistration.studentId,
                firstName: pendingRegistration.firstName,
                middleName: pendingRegistration.middleName,
                lastName: pendingRegistration.lastName,
                yearLevel: pendingRegistration.yearLevel,
                program: pendingRegistration.program,
                email: pendingRegistration.email,
                password: pendingRegistration.passwordHash
            });
        } catch (error) {
            await PendingRegistration.updateOne(
                { _id: pendingRegistration._id, consumedAt, codeHash: pendingRegistration.codeHash },
                { $set: { consumedAt: null } }
            );
            throw error;
        }

        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

        const accessToken = issueTokens(user, res);

        return res.status(201).json({
            message: 'Registration successful',
            accesstoken: accessToken,
            user: displayUser(user)
        });
    } catch (error) {
        if (error?.code === 11000) {
            if (error.keyPattern?.studentId || error.keyValue?.studentId) {
                return res.status(409).json({
                    message: 'A user with this student ID already exists',
                    field: 'studentId'
                });
            }

            return res.status(409).json({
                message: 'A user with this email already exists',
                field: 'email'
            });
        }

        console.error('Registration OTP verification failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const resendRegistrationOtp = async (req, res) => {
    try {
        const { challengeId } = req.body || {};

        if (typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({
                message: 'A valid challenge ID is required'
            });
        }

        const pendingRegistration = await PendingRegistration.findById(challengeId);

        if (!pendingRegistration || pendingRegistration.consumedAt) {
            return res.status(404).json({
                message: 'Pending registration not found or expired'
            });
        }

        if (pendingRegistration.expiresAt <= new Date()) {
            return res.status(410).json({
                message: 'Registration challenge has expired. Please register again.'
            });
        }

        if (pendingRegistration.attempts >= 5) {
            return res.status(429).json({ message: 'Too many incorrect registration OTP attempts' });
        }

        const resendCooldownSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
        const elapsedSeconds = Math.floor(
            (Date.now() - pendingRegistration.lastSentAt.getTime()) / 1000
        );

        if (elapsedSeconds < resendCooldownSeconds) {
            return res.status(429).json({
                message: 'Please wait before requesting another OTP',
                retryAfterSeconds: resendCooldownSeconds - elapsedSeconds
            });
        }

        if (pendingRegistration.resendCount >= 3) {
            return res.status(429).json({
                message: 'Registration OTP resend limit reached'
            });
        }

        const updated = await resendOtpChallenge({
            model: PendingRegistration,
            challenge: pendingRegistration,
            recipientEmail: pendingRegistration.email,
            recipientName: pendingRegistration.firstName,
            purpose: 'registration'
        });
        if (!updated) return res.status(409).json({ message: 'This challenge changed. Please try again.' });

        return res.status(200).json({
            message: 'Registration OTP resent',
            ...challengeDetails(updated)
        });
    } catch (error) {
        console.error('Registration OTP resend failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};

        if (typeof email !== 'string' || !email.trim() || !isValidEmail(email.trim().toLowerCase())) {
            return res.status(400).json({
                message: 'Please provide a valid email address'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({
                message: RESET_NOTICE
            });
        }

        const otp = generateOtp();
        const otpHash = await hashOtp(otp);
        const expiresAt = new Date(
            Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
        );

        await PasswordResetOtp.updateMany(
            { user: user._id, consumedAt: null },
            { $set: { consumedAt: new Date() } }
        );

        const challenge = await PasswordResetOtp.create({
            user: user._id,
            codeHash: otpHash,
            expiresAt,
            lastSentAt: new Date(),
            resendCount: 0
        });

        try {
            await sendOtpEmail({
                recipientEmail: user.email,
                recipientName: user.firstName,
                otp,
                purpose: 'password-reset'
            });
        } catch (error) {
            await PasswordResetOtp.deleteOne({ _id: challenge._id });
            throw error;
        }

        return res.status(200).json({
            message: RESET_NOTICE,
            ...challengeDetails(challenge)
        });
    } catch (error) {
        console.error('Password reset request failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const verifyResetOtp = async (req, res) => {
    try {
        const { challengeId, otp } = req.body || {};
        const submittedOtp = typeof otp === 'string' ? otp.trim() : '';

        if (!challengeId || !submittedOtp) {
            return res.status(400).json({
                message: 'Challenge ID and OTP are required'
            });
        }

        if (typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({
                message: 'Invalid challenge ID'
            });
        }

        if (!/^\d{6}$/.test(submittedOtp)) {
            return res.status(400).json({
                message: 'OTP must be exactly 6 digits'
            });
        }

        const resetOtp = await PasswordResetOtp.findById(challengeId);

        if (!resetOtp) {
            return res.status(401).json({
                message: 'Invalid or expired OTP'
            });
        }

        if (resetOtp.consumedAt) {
            return res.status(401).json({
                message: 'OTP has already been used'
            });
        }

        if (resetOtp.expiresAt <= new Date()) {
            return res.status(401).json({
                message: 'OTP has expired'
            });
        }

        if (resetOtp.attempts >= 5) {
            return res.status(429).json({
                message: 'Too many incorrect OTP attempts'
            });
        }

        const otpIsValid = await compareOtp(submittedOtp, resetOtp.codeHash);

        if (!otpIsValid) {
            await PasswordResetOtp.updateOne(
                { _id: resetOtp._id, codeHash: resetOtp.codeHash, consumedAt: null, attempts: { $lt: 5 } },
                { $inc: { attempts: 1 } }
            );

            return res.status(401).json({
                message: 'Invalid or expired OTP'
            });
        }

        const user = await User.findById(resetOtp.user);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const consumed = await PasswordResetOtp.updateOne(
            { _id: resetOtp._id, codeHash: resetOtp.codeHash, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
            { $set: { consumedAt: new Date() } }
        );

        if (consumed.modifiedCount !== 1) {
            return res.status(401).json({
                message: 'Invalid, expired, or already used OTP'
            });
        }

        const resetToken = jwt.sign(
            { sub: user._id.toString(), purpose: 'password-reset' },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '10m' }
        );
        const claims = jwt.decode(resetToken);

        return res.status(200).json({
            message: 'Code verified',
            resetToken,
            expiresAt: new Date(claims.exp * 1000).toISOString()
        });
    } catch (error) {
        console.error('Password reset OTP verification failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const resendResetOtp = async (req, res) => {
    try {
        const { challengeId } = req.body || {};

        if (typeof challengeId !== 'string' || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({
                message: 'A valid challenge ID is required'
            });
        }

        const resetOtp = await PasswordResetOtp.findById(challengeId);

        if (!resetOtp || resetOtp.consumedAt) {
            return res.status(401).json({
                message: 'Invalid or expired reset challenge'
            });
        }

        if (resetOtp.expiresAt <= new Date()) {
            return res.status(410).json({
                message: 'Reset challenge has expired. Please start again.'
            });
        }

        if (resetOtp.attempts >= 5) {
            return res.status(429).json({
                message: 'Too many incorrect OTP attempts'
            });
        }

        const resendCooldownSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
        const lastSentAt = resetOtp.lastSentAt || resetOtp.createdAt || new Date();
        const elapsedSeconds = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);

        if (elapsedSeconds < resendCooldownSeconds) {
            return res.status(429).json({
                message: 'Please wait before requesting another OTP',
                retryAfterSeconds: resendCooldownSeconds - elapsedSeconds
            });
        }

        if (resetOtp.resendCount >= 3) {
            return res.status(429).json({
                message: 'Password reset OTP resend limit reached'
            });
        }

        const user = await User.findById(resetOtp.user);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const updated = await resendOtpChallenge({
            model: PasswordResetOtp,
            challenge: resetOtp,
            recipientEmail: user.email,
            recipientName: user.firstName,
            purpose: 'password-reset'
        });

        if (!updated) {
            return res.status(409).json({
                message: 'This challenge changed. Please try again.'
            });
        }

        return res.status(200).json({
            message: 'Password reset OTP resent',
            ...challengeDetails(updated)
        });
    } catch (error) {
        console.error('Password reset OTP resend failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, password } = req.body || {};

        if (typeof resetToken !== 'string' || !resetToken.trim() || typeof password !== 'string') {
            return res.status(400).json({
                message: 'Reset token and password are required'
            });
        }

        const passwordError = passwordValidationError(password);

        if (passwordError) {
            return res.status(400).json({
                message: passwordError
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY);
        } catch (error) {
            return res.status(401).json({
                message: 'Invalid or expired reset token'
            });
        }

        if (decoded.purpose !== 'password-reset' || !decoded.sub) {
            return res.status(401).json({
                message: 'Invalid or expired reset token'
            });
        }

        const user = await User.findById(decoded.sub);

        if (!user || tokenIssuedBeforePasswordChange(decoded, user)) {
            return res.status(401).json({
                message: 'Invalid or expired reset token'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword, passwordChangedAt: new Date() } }
        );

        return res.status(200).json({
            message: 'Password updated. Please sign in.'
        });
    } catch (error) {
        console.error('Password reset failed');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const logoutUser = (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });

    return res.status(200).json({
        message: 'Logout successful'
    });
};
