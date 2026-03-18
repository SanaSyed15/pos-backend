import express from "express";
import tableController from "../controllers/table.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY AUTHENTICATION
========================= */

// 🔥 All routes require login
router.use(authenticate);

/* =========================
   TABLE MANAGEMENT
========================= */

// Create table → ADMIN only
router.post(
  "/",
  allowRoles("ADMIN"),
  tableController.createTable
);

// Get tables → ADMIN + STAFF
router.get(
  "/",
  allowRoles("ADMIN", "SERVING_STAFF", "BILLING_STAFF"),
  tableController.getTables
);

// Toggle table → ADMIN only
router.patch(
  "/:id/toggle",
  allowRoles("ADMIN"),
  tableController.toggleTable
);

// Delete table → ADMIN only
router.delete(
  "/:id",
  allowRoles("ADMIN"),
  tableController.deleteTable
);

export default router;