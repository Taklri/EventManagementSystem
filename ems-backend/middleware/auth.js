import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const tokenIssuedBeforePasswordChange = (decoded, user) => {
    if (!user?.passwordChangedAt || decoded?.iat === undefined) return false;
    return decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
};

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );

        if (decoded.purpose) {
            return res.status(401).json({
                message: 'Invalid or expired token'
            });
        }

        if (mongoose.isValidObjectId(decoded.sub)) {
            const account = await User.findById(decoded.sub);
            if (!account || tokenIssuedBeforePasswordChange(decoded, account)) {
                return res.status(401).json({
                    message: 'Invalid or expired token'
                });
            }
        }

        req.user = decoded;

        next();
    } catch (err) {
        console.error('Authentication error:', err.message);

        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};
