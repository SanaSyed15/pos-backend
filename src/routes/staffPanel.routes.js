import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  loginStaff,
  getStaffProfile,
} from "../controllers/staffPanel.controller.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

router.post("/login", loginStaff);

/* =========================
   PROTECTED ROUTES
========================= */

// 🔥 Apply auth to all staff actions
router.use(authenticate);

router.get("/me", getStaffProfile);

export default router;