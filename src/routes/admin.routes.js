import express from "express";
import adminController from "../controllers/admin.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

router.post("/login", adminController.login);

/* =========================
   PROTECTED ROUTES
========================= */

// 🔥 Apply middleware to all below
router.use(authenticate, allowRoles("ADMIN", "OWNER"));

router.get("/me", adminController.me);

router.get("/restaurant", adminController.getRestaurant);

router.put(
  "/restaurant/details",
  allowRoles("ADMIN"),
  updateMyRestaurantDetails
);

export default router;