import crypto from "crypto";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { isValidEmailFormat, isRealEmailDomain, sendPasswordResetEmail } from "../lib/email.js";

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

// 3-20 chars, letters/numbers/dot/underscore, must start with a letter or number
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]{2,19}$/;

const normalizeUsername = (username) =>
  typeof username === "string" ? username.trim().toLowerCase() : "";

// exact match first, then case-insensitive so accounts created with
// mixed-case emails (before normalization existed) can still sign in
const findUserByEmail = async (email) => {
  let user = await User.findOne({ email });
  if (!user) {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    user = await User.findOne({ email: new RegExp(`^${escaped}$`, "i") });
  }
  return user;
};

export const signup = async (req, res) => {
  const { fullName, password } = req.body;
  const email = normalizeEmail(req.body.email);
  const username = normalizeUsername(req.body.username);
  try {
    if (!fullName || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!(await isRealEmailDomain(email))) {
      return res.status(400).json({ message: "Please use a real email address" });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        message:
          "Username must be 3-20 characters (letters, numbers, dots, underscores) and start with a letter or number",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailExists = await findUserByEmail(email);
    if (emailExists) return res.status(400).json({ message: "Email already exists" });

    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ message: "Username is already taken" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { password } = req.body;
  const username = normalizeUsername(req.body.username);
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  try {
    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await findUserByEmail(email);

    // Always respond the same way so attackers can't probe which emails exist
    const genericResponse = {
      message: "If an account exists for that email, a reset link has been sent",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json(genericResponse);
  } catch (error) {
    console.log("Error in forgotPassword controller", error.message);
    res.status(500).json({ message: "Could not send reset email. Please try again later." });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.log("Error in resetPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, username } = req.body;
    const userId = req.user._id;

    if (profilePic === undefined && bio === undefined && username === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updates = {};

    if (username !== undefined) {
      const normalized = normalizeUsername(username);
      if (!USERNAME_REGEX.test(normalized)) {
        return res.status(400).json({
          message:
            "Username must be 3-20 characters (letters, numbers, dots, underscores) and start with a letter or number",
        });
      }
      const taken = await User.findOne({ username: normalized, _id: { $ne: userId } });
      if (taken) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      updates.username = normalized;
    }

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = uploadResponse.secure_url;
    }

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 150) {
        return res.status(400).json({ message: "Bio must be 150 characters or less" });
      }
      updates.bio = bio.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    // let connected clients refresh this user's picture/bio in real time
    io.emit("profileUpdated", {
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      profilePic: updatedUser.profilePic,
      bio: updatedUser.bio,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkUsername = async (req, res) => {
  try {
    const normalized = normalizeUsername(req.params.username);

    if (!USERNAME_REGEX.test(normalized)) {
      return res.status(200).json({ available: false, reason: "invalid" });
    }

    const taken = await User.findOne({ username: normalized, _id: { $ne: req.user._id } });
    res.status(200).json({ available: !taken });
  } catch (error) {
    console.log("Error in checkUsername controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// public availability check used during signup (no authenticated user yet)
export const usernameAvailable = async (req, res) => {
  try {
    const normalized = normalizeUsername(req.params.username);

    if (!USERNAME_REGEX.test(normalized)) {
      return res.status(200).json({ available: false, reason: "invalid" });
    }

    const taken = await User.findOne({ username: normalized });
    res.status(200).json({ available: !taken });
  } catch (error) {
    console.log("Error in usernameAvailable controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const query = (req.query.query || "").trim().toLowerCase();
    if (!query) return res.status(200).json([]);

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: `^${escaped}` } },
        { fullName: { $regex: escaped, $options: "i" } },
      ],
    })
      .select("fullName username profilePic bio")
      .limit(10);

    res.status(200).json(users);
  } catch (error) {
    console.log("Error in searchUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
