import express from "express";
import menuController from "../controllers/menu.controller.js";
import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   APPLY MIDDLEWARE
========================= */

// 🔥 Apply to ALL menu routes
router.use(authenticate, allowRoles("ADMIN", "OWNER"));

/* =========================
   MENU CATEGORY ROUTES
========================= */

router.post("/categories", menuController.createCategory);

router.get("/categories", menuController.getCategories);

router.put("/categories/:id", menuController.updateCategory);

router.delete("/categories/:id", menuController.deleteCategory);

/* =========================
   MENU ITEM ROUTES
========================= */

router.post("/items", menuController.createItem);

router.get("/items", menuController.getItems);

router.put("/items/:id", menuController.updateItem);

router.patch("/items/:id/toggle", menuController.toggleItem);

export default router;