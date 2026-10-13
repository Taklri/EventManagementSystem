import mongoose from 'mongoose';
import { PROGRAM_OPTIONS, YEAR_LEVEL_OPTIONS } from '../utils/authValidation.js';

const userSchema = new mongoose.Schema({
    studentId: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        trim: true,
        required: true,
    },
    middleName: {
        trim: true,
        type: String,
    },
    lastName: {
        type: String,
        trim: true,
        required: true,
    },
    yearLevel: {
        type: String,
        trim: true,
        maxlength: 40,
        enum: YEAR_LEVEL_OPTIONS,
    },
    program: {
        type: String,
        trim: true,
        enum: PROGRAM_OPTIONS,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        trim: true,
        default: null,
    },
    imagePublicId: {
        type: String,
        trim: true,
        default: null,
        select: false,
    },
    passwordChangedAt: {
        type: Date,
        default: null,
    },
    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student"
    }

}, {timestamps: true});

const User = mongoose.model('User', userSchema);

export default User;
