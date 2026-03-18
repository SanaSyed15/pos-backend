import express from "express";
import customerController from "../controllers/customer.controller.js";
import { authenticateCustomer } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

router.post("/login", customerController.customerLogin);

/* =========================
   PROTECTED ROUTES
========================= */

// 🔥 Apply to all customer actions
router.use(authenticateCustomer);

router.get("/menu", customerController.getMenu);

router.post("/orders", customerController.createOrder);

router.get("/orders/:orderId", customerController.getOrderStatus);

export default router;