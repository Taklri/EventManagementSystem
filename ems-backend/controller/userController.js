import bcrypt from "bcrypt";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import { sendOtpEmail } from "../services/brevoService.js";
import { generateOtp, hashOtp, challengeDetails } from "../utils/otp.js";
import {
  isValidEmail,
  passwordValidationError,
  programValidationError,
  yearLevelValidationError,
} from "../utils/authValidation.js";

export const registerUser = async (req, res) => {
  try {
    const { studentId, firstName, middleName, lastName, yearLevel, program, email, password } = req.body || {};

    const requiredFieldsAreValid = [
      studentId,
      firstName,
      lastName,
      yearLevel,
      program,
      email,
      password,
    ].every((value) => typeof value === "string" && value.trim());

    if (!requiredFieldsAreValid || (middleName !== undefined && typeof middleName !== "string")) {
      return res.status(400).json({
        message: "Please provide valid registration fields",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedMiddleName = middleName ? middleName.trim() : "";
    const normalizedLastName = lastName.trim();
    const normalizedYearLevel = yearLevel.trim();
    const normalizedProgram = program.trim();
    const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

    if (!/^\d{4}-\d{6}$/.test(normalizedStudentId)) {
      return res.status(400).json({ message: "Student ID must use the format YYYY-######" });
    }

    if (![normalizedFirstName, normalizedLastName].every((name) => namePattern.test(name))
      || (normalizedMiddleName && !namePattern.test(normalizedMiddleName))) {
      return res.status(400).json({ message: "Names may contain letters, spaces, apostrophes, and hyphens only" });
    }

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    const yearLevelError = yearLevelValidationError(normalizedYearLevel);
    if (yearLevelError) return res.status(400).json({ message: yearLevelError, field: "yearLevel" });
    const programError = programValidationError(normalizedProgram);
    if (programError) return res.status(400).json({ message: programError, field: "program" });

    const userExist = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { studentId: normalizedStudentId },
      ],
    });

    if (userExist) {
      if (userExist.email === normalizedEmail) {
        return res.status(409).json({
          message: "A user with this email already exists",
          field: "email",
        });
      }

      if (userExist.studentId === normalizedStudentId) {
        return res.status(409).json({
          message: "A user with this student ID already exists",
          field: "studentId",
        });
      }
    }

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
        yearLevel: normalizedYearLevel,
        program: normalizedProgram,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
        resendCount: 0,
        consumedAt: null,
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
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id, codeHash });
      throw emailError;
    }

    return res.status(202).json({
      message: "OTP sent to your email",
      ...challengeDetails(pendingRegistration)
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.studentId || error.keyValue?.studentId) {
        return res.status(409).json({
          message: "A user with this student ID already exists",
          field: "studentId",
        });
      }

      return res.status(409).json({
        message: "A user with this email already exists",
        field: "email",
      });
    }
    console.error("Registration request failed");

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

    const { firstName, middleName, lastName } = req.body;

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
