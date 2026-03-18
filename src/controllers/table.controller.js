import pool from "../config/db.js";
import crypto from "crypto";

/* =========================
   CREATE TABLE
========================= */
const createTable = async (req, res) => {
  try {
    // 🔒 ADMIN CHECK
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { table_number } = req.body;
    const { restaurant_id } = req.user;

    if (!table_number) {
      return res.status(400).json({
        success: false,
        message: "Table number is required",
      });
    }

    // Generate secure QR token
    const qr_token = crypto.randomBytes(8).toString("hex");

    const result = await pool.query(
      `
      INSERT INTO tables (restaurant_id, table_number, qr_token)
      VALUES ($1, $2, $3)
      RETURNING id, table_number, qr_token, table_status, is_active, created_at
      `,
      [restaurant_id, table_number, qr_token]
    );

    return res.status(201).json({
      success: true,
      message: "Table created successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Create table error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* =========================
   GET ALL TABLES
========================= */
const getTables = async (req, res) => {
  try {
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `
      SELECT id, table_number, qr_token, table_status, is_active, created_at
      FROM tables
      WHERE restaurant_id = $1
      ORDER BY table_number ASC
      `,
      [restaurant_id]
    );

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("Get tables error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* =========================
   TOGGLE TABLE ACTIVE
========================= */
const toggleTable = async (req, res) => {
  try {
    // 🔒 ADMIN CHECK
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `
      UPDATE tables
      SET is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id, table_number, is_active
      `,
      [id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    return res.json({
      success: true,
      message: "Table status updated",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Toggle table error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* =========================
   DELETE TABLE
========================= */
const deleteTable = async (req, res) => {
  try {
    // 🔒 ADMIN CHECK
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `
      DELETE FROM tables
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id
      `,
      [id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    return res.json({
      success: true,
      message: "Table deleted successfully",
    });

  } catch (error) {
    console.error("Delete table error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export default {
  createTable,
  getTables,
  toggleTable,
  deleteTable,
};