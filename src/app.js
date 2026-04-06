import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import orderRoutes from "./routes/order.routes.js";
import tableRoutes from "./routes/table.routes.js";
import staffPanelRoutes from "./routes/staffPanel.routes.js";

import pool from "./config/db.js";

const app = express();

/* =====================
   CORS CONFIG
===================== */
app.use(
  cors({
    origin: [
      "https://pojectfinalrepo.vercel.app", // frontend deployed
      "http://localhost:3000",              // local testing
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

/* =====================
   MIDDLEWARE
===================== */
app.use(express.json());

/* =====================
   HEALTH CHECK
===================== */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend running 🚀",
  });
});

/* =====================
   DATABASE HEALTH CHECK
===================== */
app.get("/db-health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      db: "connected",
      time: result.rows[0],
    });
  } catch (error) {
    console.error("DB HEALTH ERROR:", error.message);

    res.status(500).json({
      success: false,
      db: "failed",
      error: error.message,
    });
  }
});

/* =====================
   ROUTES
===================== */
app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/menu", menuRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/admin/staff", staffRoutes);
app.use("/api/admin/orders", orderRoutes);
app.use("/api/admin/tables", tableRoutes);
app.use("/api/staff", staffPanelRoutes);

/* =====================
   FALLBACK (404)
===================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;