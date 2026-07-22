import express from "express";
import {
  checkAuth,
  checkUsername,
  forgotPassword,
  getUserProfile,
  login,
  logout,
  resetPassword,
  searchUsers,
  signup,
  updateProfile,
  usernameAvailable,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// public: live username availability during signup
router.get("/username-available/:username", usernameAvailable);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

router.get("/profile/:id", protectRoute, getUserProfile);

router.get("/check-username/:username", protectRoute, checkUsername);
router.get("/search", protectRoute, searchUsers);

export default router;
