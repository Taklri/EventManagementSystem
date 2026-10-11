import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    middleName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    codeHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastSentAt: {
        type: Date,
        required: true
    },
    resendCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

pendingRegistrationSchema.index({
    expiresAt: 1
}, {
    expireAfterSeconds: 0
});

const PendingRegistration = mongoose.model(
    'PendingRegistration',
    pendingRegistrationSchema
);

export default PendingRegistration;
