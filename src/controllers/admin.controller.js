import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Ensure JWT secret exists
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

/* =========================
   ADMIN / OWNER LOGIN
========================= */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Fetch user + restaurant
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.status AS user_status,
        u.restaurant_id,
        r.status AS restaurant_status
      FROM users u
      LEFT JOIN restaurants r ON r.id = u.restaurant_id
      WHERE u.email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    // Role check
    if (!["ADMIN", "OWNER"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // User status check
    if (user.user_status !== true) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Contact super admin.",
      });
    }

    // Restaurant status check
    if (user.restaurant_status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Restaurant is inactive. Contact super admin.",
      });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Remove password from memory (safety)
    delete user.password;

    // JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        restaurant_id: user.restaurant_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES || "1d",
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurant_id: user.restaurant_id,
      },
    });

  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET LOGGED-IN ADMIN
========================= */
const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id, role } = req.user;

    if (!["ADMIN", "OWNER"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        email,
        role,
        status,
        restaurant_id
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Admin /me error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET ADMIN RESTAURANT
========================= */
const getRestaurant = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { restaurant_id, role } = req.user;

    if (!["ADMIN", "OWNER"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!restaurant_id) {
      return res.status(400).json({
        success: false,
        message: "No restaurant assigned",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        restaurant_type,
        description,
        address,
        city,
        state,
        country,
        pincode,
        phone,
        email,
        status
      FROM restaurants
      WHERE id = $1
      `,
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Get restaurant error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default { login, me, getRestaurant };