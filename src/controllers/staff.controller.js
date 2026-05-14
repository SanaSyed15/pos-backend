import pool from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

/* =========================
   CREATE STAFF
========================= */

const createStaff = async (req, res) => {

  try {

    // 🔒 ADMIN CHECK
    if (
      !req.user ||
      req.user.role !== "ADMIN"
    ) {

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const {
      name,
      email,
      role,
      phone,
    } = req.body;

    const {
      restaurant_id
    } = req.user;

    // ✅ VALIDATION
    if (
      !name ||
      !email ||
      !role
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Name, email and role are required",
      });
    }

    // ✅ ROLE VALIDATION
    const allowedRoles = [
      "SERVING_STAFF",
      "BILLING_STAFF",
    ];

    if (
      !allowedRoles.includes(role)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid staff role",
      });
    }

    // 🔐 GENERATE SETUP TOKEN
    const setupToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const tokenExpiry =
      new Date(
        Date.now()
        + 24 * 60 * 60 * 1000
      );

    // 🔐 TEMP PASSWORD HASH
    const tempPassword =
      await bcrypt.hash(
        "SET_PASSWORD_PENDING",
        10
      );

    // ✅ INSERT STAFF
    const result =
      await pool.query(

      `
      INSERT INTO staff
      (
        restaurant_id,
        name,
        email,
        password,
        role,
        phone,
        setup_token,
        token_expiry
      )
      VALUES
      (
        $1,$2,$3,$4,
        $5,$6,$7,$8
      )

      RETURNING
        id,
        restaurant_id,
        name,
        email,
        role,
        phone,
        is_active,
        created_at
      `,

      [
        restaurant_id,
        name,
        email,
        tempPassword,
        role,
        phone || null,
        setupToken,
        tokenExpiry,
      ]
    );

    // 🔗 SET PASSWORD LINK
    const setupLink =
`${process.env.SUPERADMIN_URL}/set-password/${setupToken}`;

    // 📧 SEND EMAIL
    await sendEmail(

      email,

      "Set Your Staff Account Password",

      `
      <div
        style="
          font-family: Arial;
          padding: 20px;
        "
      >

        <h2>
          Welcome to Restaurant POS
        </h2>

        <p>
          Your staff account
          has been created.
        </p>

        <p>
          Click below to
          set your password:
        </p>

        <a href="${setupLink}">
          Set Password
        </a>

        <p>
          Link valid for
          24 hours.
        </p>

      </div>
      `
    );

    // ✅ SUCCESS
    return res.status(201).json({
      success: true,
      message:
        "Staff created successfully",
      data: result.rows[0],
    });

  } catch (error) {

    // UNIQUE EMAIL
    if (error.code === "23505") {

      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    console.error(
      "Create staff error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET ALL STAFF
========================= */
const getStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { restaurant_id } = req.user;

    const result = await pool.query(
      `SELECT id, name, email, role, phone, is_active, created_at
       FROM staff
       WHERE restaurant_id = $1
       ORDER BY created_at DESC`,
      [restaurant_id]
    );

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("Get staff error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   UPDATE STAFF
========================= */
const updateStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { name, role, phone } = req.body;
    const { restaurant_id } = req.user;

    const allowedRoles = ["SERVING_STAFF", "BILLING_STAFF"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role",
      });
    }

    const result = await pool.query(
      `UPDATE staff
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND restaurant_id = $5
       RETURNING id, name, email, role, phone, is_active, updated_at`,
      [name, role, phone, id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    return res.json({
      success: true,
      message: "Staff updated",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Update staff error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   TOGGLE STAFF ACTIVE
========================= */
const toggleStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `UPDATE staff
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id, name, role, is_active, updated_at`,
      [id, restaurant_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    return res.json({
      success: true,
      message: "Staff status updated",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Toggle staff error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   DELETE STAFF
========================= */
const deleteStaff = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `DELETE FROM staff
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    return res.json({
      success: true,
      message: "Staff deleted successfully",
    });

  } catch (error) {
    console.error("Delete staff error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default {
  createStaff,
  getStaff,
  updateStaff,
  toggleStaff,
  deleteStaff,
};