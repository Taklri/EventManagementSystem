import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileTypeFromBuffer } from "file-type";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import ProfileEmailOtp from "../models/ProfileEmailOtp.js";
import ProfilePasswordOtp from "../models/ProfilePasswordOtp.js";
import { sendOtpEmail } from "../services/brevoService.js";
import { resendOtpChallenge } from "../services/otpChallengeService.js";
import { uploadProfileImage, removeProfileImage } from "../services/eventImageService.js";
import { generateOtp, hashOtp, compareOtp, challengeDetails } from "../utils/otp.js";
import { isValidEmail, passwordValidationError } from "../utils/authValidation.js";
import { displayUser, issueTokens } from "./authUserController.js";

const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const studentIdPattern = /^\d{4}-\d{6}$/;

const profilePayload = (user) => ({
  id: user._id,
  ...(user.role === "student" ? { studentId: user.studentId } : {}),
  firstName: user.firstName,
  middleName: user.middleName || "",
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  imageUrl: user.imageUrl || null,
});

const loadUser = async (req) => {
  if (!mongoose.isValidObjectId(req.user?.sub)) return null;
  return User.findById(req.user.sub).select("+imagePublicId");
};

const studentIdTaken = async (studentId, userId) => {
  const [existing, pending] = await Promise.all([
    User.findOne({ studentId, _id: { $ne: userId } }),
    PendingRegistration.findOne({ studentId }),
  ]);
  return Boolean(existing || pending);
};

const emailTaken = async (email, userId) => {
  const [existing, pending] = await Promise.all([
    User.findOne({ email, _id: { $ne: userId } }),
    PendingRegistration.findOne({ email }),
  ]);
  return Boolean(existing || pending);
};

const otpWindow = () => new Date(Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000);

const rejectChallengeInput = (body) => {
  const { challengeId, otp } = body || {};
  const submittedOtp = typeof otp === "string" ? otp.trim() : "";
  if (!challengeId || !submittedOtp) return { error: { status: 400, message: "Challenge ID and OTP are required" } };
  if (typeof challengeId !== "string" || !mongoose.isValidObjectId(challengeId)) {
    return { error: { status: 400, message: "Invalid challenge ID" } };
  }
  if (!/^\d{6}$/.test(submittedOtp)) return { error: { status: 400, message: "OTP must be exactly 6 digits" } };
  return { challengeId, submittedOtp };
};

const ownedChallenge = async (model, challengeId, userId) => {
  const challenge = await model.findById(challengeId);
  if (!challenge || String(challenge.user) !== String(userId)) return null;
  return challenge;
};

const challengeStatusError = (challenge) => {
  if (!challenge || challenge.consumedAt) return { status: 401, message: "Invalid or expired OTP" };
  if (challenge.expiresAt <= new Date()) return { status: 401, message: "OTP has expired" };
  if (challenge.attempts >= 5) return { status: 429, message: "Too many incorrect OTP attempts" };
  return null;
};

const claimChallenge = async (model, challenge) => {
  const consumedAt = new Date();
  const claimed = await model.updateOne(
    { _id: challenge._id, codeHash: challenge.codeHash, consumedAt: null, expiresAt: { $gt: consumedAt }, attempts: { $lt: 5 } },
    { $set: { consumedAt } },
  );
  return claimed.modifiedCount === 1 ? consumedAt : null;
};

const releaseChallenge = async (model, challenge, consumedAt) => {
  await model.updateOne(
    { _id: challenge._id, consumedAt, codeHash: challenge.codeHash },
    { $set: { consumedAt: null } },
  );
};

const resendOwnedChallenge = async (model, req, res, purpose) => {
  const { challengeId } = req.body || {};
  if (typeof challengeId !== "string" || !mongoose.isValidObjectId(challengeId)) {
    return res.status(400).json({ message: "A valid challenge ID is required" });
  }
  const challenge = await ownedChallenge(model, challengeId, req.user.sub);
  if (!challenge || challenge.consumedAt) return res.status(401).json({ message: "Invalid or expired verification challenge" });
  if (challenge.expiresAt <= new Date()) {
    return res.status(410).json({ message: "This verification challenge has expired. Please start again." });
  }
  if (challenge.attempts >= 5) return res.status(429).json({ message: "Too many incorrect OTP attempts" });

  const resendCooldownSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
  const lastSentAt = challenge.lastSentAt || challenge.createdAt || new Date();
  const elapsedSeconds = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
  if (elapsedSeconds < resendCooldownSeconds) {
    return res.status(429).json({
      message: "Please wait before requesting another OTP",
      retryAfterSeconds: resendCooldownSeconds - elapsedSeconds,
    });
  }
  if (challenge.resendCount >= 3) return res.status(429).json({ message: "Verification code resend limit reached" });

  const user = await loadUser(req);
  if (!user) return res.status(401).json({ message: "Invalid session" });
  const updated = await resendOtpChallenge({
    model,
    challenge,
    recipientEmail: user.email,
    recipientName: user.firstName,
    purpose,
  });
  if (!updated) return res.status(401).json({ message: "Invalid or expired verification challenge" });
  return res.status(200).json({
    message: "Verification code sent",
    ...challengeDetails(updated),
  });
};

const validateImage = async (file) => {
  if (!file?.buffer) return { error: "A profile photo is required" };
  const detected = await fileTypeFromBuffer(file.buffer);
  const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!detected || !supported.has(detected.mime) || detected.mime !== file.mimetype) {
    return { error: "Profile photo must be a JPEG, PNG, or WebP file" };
  }
  return { value: true };
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    return res.status(200).json({ user: profilePayload(user) });
  } catch (error) {
    console.error("Profile request failed");
    return res.status(500).json({ message: "Unable to load profile" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });

    const { firstName, middleName, lastName, studentId } = req.body || {};
    if (typeof firstName !== "string" || typeof lastName !== "string" || (middleName !== undefined && typeof middleName !== "string")) {
      return res.status(400).json({ message: "Please provide valid profile fields" });
    }

    const normalizedFirstName = firstName.trim();
    const normalizedMiddleName = middleName ? middleName.trim() : "";
    const normalizedLastName = lastName.trim();
    if (!normalizedFirstName || !normalizedLastName
      || ![normalizedFirstName, normalizedLastName].every((name) => namePattern.test(name))
      || (normalizedMiddleName && !namePattern.test(normalizedMiddleName))) {
      return res.status(400).json({ message: "Names may contain letters, spaces, apostrophes, and hyphens only" });
    }

    if (user.role === "student") {
      if (typeof studentId !== "string" || !studentId.trim()) {
        return res.status(400).json({ message: "Student ID is required", field: "studentId" });
      }
      const normalizedStudentId = studentId.trim();
      if (!studentIdPattern.test(normalizedStudentId)) {
        return res.status(400).json({ message: "Student ID must use the format YYYY-######", field: "studentId" });
      }
      if (normalizedStudentId !== user.studentId && await studentIdTaken(normalizedStudentId, user._id)) {
        return res.status(409).json({ message: "A user with this student ID already exists", field: "studentId" });
      }
      user.studentId = normalizedStudentId;
    }

    user.firstName = normalizedFirstName;
    user.middleName = normalizedMiddleName;
    user.lastName = normalizedLastName;
    await user.save();

    return res.status(200).json({ message: "Profile updated", user: profilePayload(user) });
  } catch (error) {
    if (error?.code === 11000 && (error.keyPattern?.studentId || error.keyValue?.studentId)) {
      return res.status(409).json({ message: "A user with this student ID already exists", field: "studentId" });
    }
    console.error("Profile update failed");
    return res.status(500).json({ message: "Unable to update profile" });
  }
};

export const updateMyPhoto = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    const image = await validateImage(req.file);
    if (image.error) return res.status(400).json({ message: image.error, field: "photo" });

    const uploaded = await uploadProfileImage(req.file.buffer);
    const previousId = user.imagePublicId;
    user.imageUrl = uploaded.imageUrl;
    user.imagePublicId = uploaded.imagePublicId;
    try {
      await user.save();
    } catch (error) {
      await removeProfileImage(uploaded.imagePublicId).catch(() => {});
      throw error;
    }
    if (previousId) {
      removeProfileImage(previousId).catch(() => console.error("Profile image removal failed"));
    }
    return res.status(200).json({ message: "Profile photo updated", user: profilePayload(user) });
  } catch (error) {
    console.error("Profile photo update failed");
    return res.status(500).json({ message: "Unable to update profile photo" });
  }
};

export const removeMyPhoto = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    const previousId = user.imagePublicId;
    user.imageUrl = null;
    user.imagePublicId = null;
    await user.save();
    if (previousId) {
      removeProfileImage(previousId).catch(() => console.error("Profile image removal failed"));
    }
    return res.status(200).json({ message: "Profile photo removed", user: profilePayload(user) });
  } catch (error) {
    console.error("Profile photo removal failed");
    return res.status(500).json({ message: "Unable to remove profile photo" });
  }
};

const currentPasswordError = async (user, currentPassword) => {
  if (typeof currentPassword !== "string" || !currentPassword) {
    return { status: 400, message: "Current password is required", field: "currentPassword" };
  }
  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) return { status: 401, message: "Current password is incorrect", field: "currentPassword" };
  return null;
};

export const requestEmailChange = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    const { email, currentPassword } = req.body || {};
    const passwordError = await currentPasswordError(user, currentPassword);
    if (passwordError) return res.status(passwordError.status).json({ message: passwordError.message, field: passwordError.field });
    if (typeof email !== "string" || !email.trim() || !isValidEmail(email.trim().toLowerCase())) {
      return res.status(400).json({ message: "Please provide a valid email address", field: "email" });
    }
    const pendingEmail = email.trim().toLowerCase();
    if (pendingEmail === user.email) {
      return res.status(400).json({ message: "That is already your email address", field: "email" });
    }
    if (await emailTaken(pendingEmail, user._id)) {
      return res.status(409).json({ message: "A user with this email already exists", field: "email" });
    }

    const otp = generateOtp();
    const codeHash = await hashOtp(otp);
    await ProfileEmailOtp.updateMany({ user: user._id, consumedAt: null }, { $set: { consumedAt: new Date() } });
    const challenge = await ProfileEmailOtp.create({
      user: user._id,
      pendingEmail,
      codeHash,
      expiresAt: otpWindow(),
      lastSentAt: new Date(),
      resendCount: 0,
    });

    try {
      await sendOtpEmail({
        recipientEmail: user.email,
        recipientName: user.firstName,
        otp,
        purpose: "email-change",
      });
    } catch (error) {
      await ProfileEmailOtp.deleteOne({ _id: challenge._id });
      throw error;
    }

    return res.status(200).json({
      message: "Verification code sent to your current email",
      ...challengeDetails(challenge),
    });
  } catch (error) {
    console.error("Email change request failed");
    return res.status(500).json({ message: "Unable to start email change" });
  }
};

export const verifyEmailChange = async (req, res) => {
  try {
    const parsed = rejectChallengeInput(req.body);
    if (parsed.error) return res.status(parsed.error.status).json({ message: parsed.error.message });
    const challenge = await ownedChallenge(ProfileEmailOtp, parsed.challengeId, req.user.sub);
    const statusError = challengeStatusError(challenge);
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });

    const otpIsValid = await compareOtp(parsed.submittedOtp, challenge.codeHash);
    if (!otpIsValid) {
      await ProfileEmailOtp.updateOne(
        { _id: challenge._id, codeHash: challenge.codeHash, consumedAt: null, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
      );
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    const consumedAt = await claimChallenge(ProfileEmailOtp, challenge);
    if (!consumedAt) return res.status(401).json({ message: "Invalid, expired, or already used OTP" });

    if (await emailTaken(challenge.pendingEmail, user._id)) {
      await releaseChallenge(ProfileEmailOtp, challenge, consumedAt);
      return res.status(409).json({ message: "A user with this email already exists", field: "email" });
    }

    let updated;
    try {
      updated = await User.findByIdAndUpdate(
        user._id,
        { $set: { email: challenge.pendingEmail } },
        { new: true },
      );
    } catch (error) {
      await releaseChallenge(ProfileEmailOtp, challenge, consumedAt);
      if (error?.code === 11000) {
        return res.status(409).json({ message: "A user with this email already exists", field: "email" });
      }
      throw error;
    }
    if (!updated) {
      await releaseChallenge(ProfileEmailOtp, challenge, consumedAt);
      return res.status(401).json({ message: "Invalid session" });
    }

    return res.status(200).json({ message: "Email updated", user: profilePayload(updated) });
  } catch (error) {
    console.error("Email change verification failed");
    return res.status(500).json({ message: "Unable to update email" });
  }
};

export const resendEmailChange = async (req, res) => {
  try {
    return await resendOwnedChallenge(ProfileEmailOtp, req, res, "email-change");
  } catch (error) {
    console.error("Email change resend failed");
    return res.status(500).json({ message: "Unable to resend verification code" });
  }
};

export const requestPasswordChange = async (req, res) => {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    const { password, currentPassword } = req.body || {};
    const currentError = await currentPasswordError(user, currentPassword);
    if (currentError) return res.status(currentError.status).json({ message: currentError.message, field: currentError.field });
    if (typeof password !== "string") return res.status(400).json({ message: "Password is required", field: "password" });
    const passwordError = passwordValidationError(password);
    if (passwordError) return res.status(400).json({ message: passwordError, field: "password" });

    const otp = generateOtp();
    const [codeHash, passwordHash] = await Promise.all([hashOtp(otp), bcrypt.hash(password, 10)]);
    await ProfilePasswordOtp.updateMany({ user: user._id, consumedAt: null }, { $set: { consumedAt: new Date() } });
    const challenge = await ProfilePasswordOtp.create({
      user: user._id,
      passwordHash,
      codeHash,
      expiresAt: otpWindow(),
      lastSentAt: new Date(),
      resendCount: 0,
    });

    try {
      await sendOtpEmail({
        recipientEmail: user.email,
        recipientName: user.firstName,
        otp,
        purpose: "password-change",
      });
    } catch (error) {
      await ProfilePasswordOtp.deleteOne({ _id: challenge._id });
      throw error;
    }

    return res.status(200).json({
      message: "Verification code sent to your current email",
      ...challengeDetails(challenge),
    });
  } catch (error) {
    console.error("Password change request failed");
    return res.status(500).json({ message: "Unable to start password change" });
  }
};

export const verifyPasswordChange = async (req, res) => {
  try {
    const parsed = rejectChallengeInput(req.body);
    if (parsed.error) return res.status(parsed.error.status).json({ message: parsed.error.message });
    const challenge = await ownedChallenge(ProfilePasswordOtp, parsed.challengeId, req.user.sub);
    const statusError = challengeStatusError(challenge);
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });

    const otpIsValid = await compareOtp(parsed.submittedOtp, challenge.codeHash);
    if (!otpIsValid) {
      await ProfilePasswordOtp.updateOne(
        { _id: challenge._id, codeHash: challenge.codeHash, consumedAt: null, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
      );
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const consumedAt = await claimChallenge(ProfilePasswordOtp, challenge);
    if (!consumedAt) return res.status(401).json({ message: "Invalid, expired, or already used OTP" });

    let updated;
    try {
      updated = await User.findByIdAndUpdate(
        req.user.sub,
        { $set: { password: challenge.passwordHash, passwordChangedAt: new Date() } },
        { new: true },
      );
    } catch (error) {
      await releaseChallenge(ProfilePasswordOtp, challenge, consumedAt);
      throw error;
    }
    if (!updated) {
      await releaseChallenge(ProfilePasswordOtp, challenge, consumedAt);
      return res.status(401).json({ message: "Invalid session" });
    }

    const accessToken = issueTokens(updated, res);
    return res.status(200).json({
      message: "Password updated",
      accesstoken: accessToken,
      user: displayUser(updated),
    });
  } catch (error) {
    console.error("Password change verification failed");
    return res.status(500).json({ message: "Unable to update password" });
  }
};

export const resendPasswordChange = async (req, res) => {
  try {
    return await resendOwnedChallenge(ProfilePasswordOtp, req, res, "password-change");
  } catch (error) {
    console.error("Password change resend failed");
    return res.status(500).json({ message: "Unable to resend verification code" });
  }
};
