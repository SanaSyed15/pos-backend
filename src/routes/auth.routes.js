import express from "express";
import { login, superAdminForgotPassword, resetPassword,forgotPassword,verifyOtp,
  setPassword, } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/superadmin/forgot-password", superAdminForgotPassword);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", setPassword);
export default router;