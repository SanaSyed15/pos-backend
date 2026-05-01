import express from "express";
import {
  onboardRestaurant,
  getRestaurants,
  getDashboardStats,
  getRestaurantManagePage,
  updateRestaurantDetails,
  updateRestaurantSettings,
  updateRestaurantTax,
  updateRestaurantStatus,
  updateRestaurantOwner,
  getOwners,
  getOwnerDetails,
  toggleOwnerStatus,
  getAnalytics,
  deleteRestaurant,
} from "../controllers/superAdmin.controller.js";

import {
  authenticate,
  authorizeSuperAdmin,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY GLOBAL MIDDLEWARE
========================= */

// 🔥 APPLY TO ALL ROUTES BELOW
router.use(authenticate, authorizeSuperAdmin);

/* =========================
   SUPER ADMIN ROUTES
========================= */

router.post("/onboard-restaurant", onboardRestaurant);

router.get("/restaurants", getRestaurants);

router.get("/dashboard-stats", getDashboardStats);

router.get("/restaurants/:id", getRestaurantManagePage);

router.put("/restaurants/:id/details", updateRestaurantDetails);

router.put("/restaurants/:id/settings", updateRestaurantSettings);

router.put("/restaurants/:id/tax", updateRestaurantTax);

router.put("/restaurants/:id/status", updateRestaurantStatus);

router.delete("/restaurants/:id", deleteRestaurant);

router.put("/restaurants/:id/owner", updateRestaurantOwner);

/* =========================
   OWNERS ROUTES
========================= */

router.get("/owners", getOwners);

router.get("/owners/:id", getOwnerDetails);

router.patch("/owners/:id/toggle", toggleOwnerStatus);

router.get("/analytics", getAnalytics);

export default router;