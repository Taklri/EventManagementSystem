import mongoose from "mongoose";

const profileEmailOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pendingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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

profileEmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProfileEmailOtp = mongoose.model("ProfileEmailOtp", profileEmailOtpSchema);

export default ProfileEmailOtp;
