import express from "express";
import { login, superAdminForgotPassword, resetPassword,forgotPassword  } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/superadmin/forgot-password", superAdminForgotPassword);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);

export default router;