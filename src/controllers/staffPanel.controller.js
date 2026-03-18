import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

/* =========================
   STAFF LOGIN
========================= */
export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM staff
       WHERE LOWER(email) = LOWER($1)
         AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const staff = result.rows[0];

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: staff.id,
        restaurant_id: staff.restaurant_id,
        role: staff.role,
        type: "STAFF",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "8h" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    });

  } catch (error) {
    console.error("Staff login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET STAFF PROFILE
========================= */
export const getStaffProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id, restaurant_id, type } = req.user;

    if (type !== "STAFF") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        s.id,
        s.name,
        s.email,
        s.role,
        s.phone,
        s.is_active,
        s.created_at,
        s.updated_at,
        r.name AS restaurant_name
      FROM staff s
      LEFT JOIN restaurants r 
        ON r.id = s.restaurant_id
      WHERE s.id = $1 AND s.restaurant_id = $2
      `,
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
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Get staff profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};