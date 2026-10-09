import bcrypt from "bcrypt";
import User from "../models/User.js";

export const registerUser = async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Please Input Fields",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExist = await User.findOne({ email: normalizedEmail });

    if (userExist) {
      return res.status(409).json({
        message: "User already Exist",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      middleName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User Created Successfully",
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
    const { firstName, middleName, lastName, email } = req.body;

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
    console(error);

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
