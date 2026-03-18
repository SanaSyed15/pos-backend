import express from "express";
import staffController from "../controllers/staff.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY MIDDLEWARE
========================= */

// 🔥 ADMIN only
router.use(authenticate, allowRoles("ADMIN"));

/* =========================
   STAFF MANAGEMENT
========================= */

// Create staff
router.post("/", staffController.createStaff);

// Get all staff
router.get("/", staffController.getStaff);

// Update staff
router.put("/:id", staffController.updateStaff);

// Toggle active/inactive
router.patch("/:id/toggle", staffController.toggleStaff);

// Delete staff
router.delete("/:id", staffController.deleteStaff);

export default router;