import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// helpers
import LoginOtp from '../models/LoginOtp.js';
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
        maxAge: 7 * 24 * 60 * 60 * 100
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
            otp
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

export const verifyLoginOtp = async (req,res) => {
    try{

        const { challengeId, otp } = req.body;
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