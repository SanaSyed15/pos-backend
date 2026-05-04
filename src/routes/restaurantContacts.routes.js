import express from "express";
import {
  addContact,
  getContacts,
  deleteContact
} from "../controllers/restaurantContacts.controller.js";

import { authenticate, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

// Admin/Owner only
router.post("/", allowRoles("ADMIN", "OWNER"), addContact);
router.get("/", allowRoles("ADMIN", "OWNER"), getContacts);
router.delete("/:id", allowRoles("ADMIN", "OWNER"), deleteContact);

export default router;