import express from "express";
import customerController from "../controllers/customer.controller.js";
import { authenticateCustomer } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

// Customer login via QR
router.post("/login", customerController.customerLogin);

/* =========================
   PROTECTED ROUTES
========================= */

// Apply authentication to all routes below
router.use(authenticateCustomer);

// Customer landing page
router.get(
  "/restaurant",
  customerController.getRestaurantDetails
);

// Menu
router.get(
  "/menu",
  customerController.getMenu
);

// Create order
router.post(
  "/orders",
  customerController.createOrder
);

// Track order
router.get(
  "/orders/:orderId",
  customerController.getOrderStatus
);

export default router;