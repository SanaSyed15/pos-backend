import express from "express";
import orderController from "../controllers/order.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY AUTHENTICATION
========================= */

// 🔥 All routes require login
router.use(authenticate);

/* =========================
   ORDER MANAGEMENT
========================= */

// View orders (Admin + Staff)
router.get(
  "/",
  allowRoles("ADMIN", "SERVING_STAFF", "BILLING_STAFF"),
  orderController.getOrders
);

// Update order status (Staff only)
router.patch(
  "/:id/status",
  allowRoles("SERVING_STAFF", "BILLING_STAFF"),
  orderController.updateOrderStatus
);

// View single order
router.get(
  "/:id",
  allowRoles("ADMIN", "SERVING_STAFF", "BILLING_STAFF"),
  orderController.getOrderById
);

router.get(
  "/",
  (req, res, next) => {
    console.log("🔥 ORDERS ROUTE HIT");
    next();
  },
  allowRoles("ADMIN", "SERVING_STAFF", "BILLING_STAFF"),
  orderController.getOrders
);
export default router;