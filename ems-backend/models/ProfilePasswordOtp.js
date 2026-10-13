import mongoose from "mongoose";

const profilePasswordOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

profilePasswordOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProfilePasswordOtp = mongoose.model("ProfilePasswordOtp", profilePasswordOtpSchema);

export default ProfilePasswordOtp;
