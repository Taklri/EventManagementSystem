import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

        const accesstoken = jwt.sign({
            sub: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: '15m'
        }
        );

        const refreshtoken = jwt.sign({
            sub: user._id.toString(),
        },
        process.env.JWT_REFRESH_SECRET_KEY,
        {
            expiresIn: '7d'
        }
        );

        res.cookie('refreshToken', refreshtoken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            message: "Login successful",
            accesstoken
        });

        

    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}