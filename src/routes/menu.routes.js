import express from "express";
import menuController from "../controllers/menu.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY MIDDLEWARE
========================= */

// 🔥 Apply to ALL menu routes
router.use(authenticate);


// VIEW (staff allowed)
router.get("/categories", allowRoles("ADMIN", "OWNER", "SERVING_STAFF", "BILLING_STAFF"), menuController.getCategories);
router.get("/items", allowRoles("ADMIN", "OWNER", "SERVING_STAFF", "BILLING_STAFF"), menuController.getItems);

// MODIFY (admin only)
router.post("/categories", allowRoles("ADMIN", "OWNER"), menuController.createCategory);
router.put("/categories/:id", allowRoles("ADMIN", "OWNER"), menuController.updateCategory);
router.delete("/categories/:id", allowRoles("ADMIN", "OWNER"), menuController.deleteCategory);

router.post("/items", allowRoles("ADMIN", "OWNER"), menuController.createItem);
router.put("/items/:id", allowRoles("ADMIN", "OWNER"), menuController.updateItem);
router.patch("/items/:id/toggle", allowRoles("ADMIN", "OWNER"), menuController.toggleItem);
export default router;