import express from "express";
import cartController from "../controllers/cart.controller.js";
import { authenticateCustomer } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticateCustomer);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.post("/update", cartController.updateCart);
router.post("/delete", cartController.deleteCartItem);
router.post("/clear", cartController.clearCart);

export default router;