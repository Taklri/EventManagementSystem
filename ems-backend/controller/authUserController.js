import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// helpers
import LoginOtp from '../models/LoginOtp.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { sendOtpEmail } from '../services/brevoService.js';
import { generateOtp, hashOtp, compareOtp } from '../utils/otp.js';

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


export const loginUser = async (req, res) => {
    try{
        const {email, password} = req.body

        if(!email || !password){
            return res.status(400).json({
                message: "Please Enter your Credentials"
            })
        }

        const normalizedEmail = email.trim().toLowerCase();

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
            expiresAt
        });

        await sendOtpEmail({
            recipientEmail: user.email,
            recipientName: user.firstName,
            otp,
            purpose: 'login'
        });

        return res.status(200).json({
            message: 'OTP sent to your email',
            challengeId: loginOtp._id.toString()
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

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

        if (!user) {
            return res.status(401).json({
                message: 'Invalid refresh token'
            });
        }

        const accessToken = issueTokens(user, res);

        return res.status(200).json({
            message: 'Access token refreshed',
            accesstoken: accessToken
        });
    } catch (error) {
        console.error('Refresh token error:', error.message);

        return res.status(401).json({
            message: 'Invalid or expired refresh token'
        });
    }
};

export const verifyLoginOtp = async (req,res) => {
    try{

        const { challengeId, otp } = req.body || {};
        const submittedOtp = String(otp || '').trim();

        if(!challengeId || !submittedOtp){
            return res.status(400).json({
                message: 'Challenge ID and OTP are required'
            });
        }

        if(!mongoose.isValidObjectId(challengeId)){
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
                message: 'Too many incorrect OTp attempts'
            });
        }

        const otpIsValid = await compareOtp(
            submittedOtp,
            loginOtp.codeHash
        );

        if (!otpIsValid) {
            loginOtp.attempts += 1;
            await loginOtp.save();

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

        loginOtp.consumedAt = new Date();
        await loginOtp.save();

        const accessToken = issueTokens(user, res);

        return res.status(200).json({
            message: 'Login successful',
            accesstoken: accessToken
        });

    }
    catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export const verifyRegistrationOtp = async (req, res) => {
    try {
        const { challengeId, otp } = req.body;
        const submittedOtp = String(otp || '').trim();

        if (!challengeId || !submittedOtp) {
            return res.status(400).json({
                message: 'Challenge ID and OTP are required'
            });
        }

        if (!mongoose.isValidObjectId(challengeId)) {
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

        if (!pendingRegistration) {
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
            pendingRegistration.attempts += 1;
            await pendingRegistration.save();

            return res.status(401).json({
                message: 'Invalid or expired registration OTP'
            });
        }

        const user = await User.create({
            studentId: pendingRegistration.studentId,
            firstName: pendingRegistration.firstName,
            middleName: pendingRegistration.middleName,
            lastName: pendingRegistration.lastName,
            email: pendingRegistration.email,
            password: pendingRegistration.passwordHash
        });

        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

        const accessToken = issueTokens(user, res);

        return res.status(201).json({
            message: 'Registration successful',
            accesstoken: accessToken
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: 'A user with this email or student ID already exists'
            });
        }

        console.error(error);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const resendRegistrationOtp = async (req, res) => {
    try {
        const { challengeId } = req.body || {};

        if (!challengeId || !mongoose.isValidObjectId(challengeId)) {
            return res.status(400).json({
                message: 'A valid challenge ID is required'
            });
        }

        const pendingRegistration = await PendingRegistration.findById(challengeId);

        if (!pendingRegistration) {
            return res.status(404).json({
                message: 'Pending registration not found or expired'
            });
        }

        if (pendingRegistration.expiresAt <= new Date()) {
            return res.status(410).json({
                message: 'Registration challenge has expired. Please register again.'
            });
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

        const otp = generateOtp();
        const codeHash = await hashOtp(otp);
        const now = new Date();
        const expiresAt = new Date(
            now.getTime() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
        );

        pendingRegistration.codeHash = codeHash;
        pendingRegistration.expiresAt = expiresAt;
        pendingRegistration.attempts = 0;
        pendingRegistration.lastSentAt = now;
        pendingRegistration.resendCount += 1;
        await pendingRegistration.save();

        await sendOtpEmail({
            recipientEmail: pendingRegistration.email,
            recipientName: pendingRegistration.firstName,
            otp,
            purpose: 'registration'
        });

        return res.status(200).json({
            message: 'Registration OTP resent',
            challengeId: pendingRegistration._id.toString()
        });
    } catch (error) {
        console.error(error);

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
