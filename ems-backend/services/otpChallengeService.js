import { generateOtp, hashOtp } from '../utils/otp.js';
import { sendOtpEmail } from './brevoService.js';

// Reserve the rotation before sending so simultaneous resend requests cannot
// issue different codes or bypass the cooldown. Restore the old code on failure.
export const resendOtpChallenge = async ({ model, challenge, recipientEmail, recipientName, purpose }) => {
    const otp = generateOtp();
    const codeHash = await hashOtp(otp);
    const now = new Date();
    const previous = {
        codeHash: challenge.codeHash,
        expiresAt: challenge.expiresAt,
        attempts: challenge.attempts,
        lastSentAt: challenge.lastSentAt || challenge.createdAt,
        resendCount: challenge.resendCount || 0
    };
    const updated = await model.findOneAndUpdate(
        { _id: challenge._id, codeHash: challenge.codeHash, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: 5 } },
        {
            $set: {
                codeHash,
                expiresAt: new Date(now.getTime() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000),
                attempts: 0,
                lastSentAt: now
            },
            $inc: { resendCount: 1 }
        },
        { new: true }
    );
    if (!updated) return null;

    try {
        await sendOtpEmail({ recipientEmail, recipientName, otp, purpose });
    } catch (error) {
        await model.updateOne(
            { _id: challenge._id, codeHash, consumedAt: null },
            { $set: previous }
        );
        throw error;
    }
    return updated;
};
