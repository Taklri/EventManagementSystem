import bcrypt from "bcrypt";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import { sendOtpEmail } from "../services/brevoService.js";
import { generateOtp, hashOtp } from "../utils/otp.js";

export const registerUser = async (req, res) => {
  try {
    const { studentId, firstName, middleName, lastName, email, password } = req.body || {};

    const requiredFieldsAreValid = [
      studentId,
      firstName,
      lastName,
      email,
      password,
    ].every((value) => typeof value === "string" && value.trim());

    if (!requiredFieldsAreValid || (middleName !== undefined && typeof middleName !== "string")) {
      return res.status(400).json({
        message: "Please provide valid registration fields",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    const userExist = await User.findOne({ email: normalizedEmail });

    if (userExist) {
      return res.status(409).json({
        message: "User already Exist",
      });
    }

    const normalizedStudentId = String(studentId).trim();
    const normalizedFirstName = String(firstName).trim();
    const normalizedMiddleName = middleName ? middleName.trim() : "";
    const normalizedLastName = String(lastName).trim();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const codeHash = await hashOtp(otp);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
    );

    const pendingRegistration = await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        studentId: normalizedStudentId,
        firstName: normalizedFirstName,
        middleName: normalizedMiddleName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
        resendCount: 0,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendOtpEmail({
        recipientEmail: normalizedEmail,
        recipientName: normalizedFirstName,
        otp,
        purpose: "registration",
      });
    } catch (emailError) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      throw emailError;
    }

    return res.status(202).json({
      message: "OTP sent to your email",
      challengeId: pendingRegistration._id.toString()
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if(req.user.role !== 'admin' && req.user.sub !== id){
      return res.status(403).json({
        message: "You can only update your own profile"
      });
    }

    const { studentId, firstName, middleName, lastName, email } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (firstName !== undefined && !firstName.trim()) {
      return res.status(400).json({
        message: "First name cannot be empty",
      });
    }
    if (middleName !== undefined && !middleName.trim()) {
      return res.status(400).json({
        message: "Middle name cannot be empty",
      });
    }
    if (lastName !== undefined && !lastName.trim()) {
      return res.status(400).json({
        message: "Last name cannot be empty",
      });
    }
    if (email !== undefined && !email.trim()) {
      return res.status(400).json({
        message: "Email cannot be empty",
      });
    }

    // Email Validation if user already exist

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const emailexist = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (emailexist) {
        return res.status(409).json({
          message: "Email already exist",
        });
      }

      user.email = normalizedEmail;
    }

    // Update data

    if (firstName !== undefined) {
      user.firstName = firstName.trim();
    }
    if (lastName !== undefined) {
      user.lastName = lastName.trim();
    }
    if (middleName !== undefined) {
      user.middleName = middleName.trim();
    }

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",

      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    return res.status(200).json({
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get users",
    });
  }
};
