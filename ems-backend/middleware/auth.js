import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
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

        req.user = decoded;

        next();
    } catch (err) {
        console.error('Authentication error:', err.message);

        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};