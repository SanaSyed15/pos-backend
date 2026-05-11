import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

// Ensure JWT secret exists
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Fetch user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND status = true",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Remove password from memory
    delete user.password;

    // JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        restaurant_id: user.restaurant_id || null,
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
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurant_id: user.restaurant_id || null,
      },
    });

  } catch (error) {
    console.error("Auth login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const superAdminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND role='SUPER_ADMIN'",
      [email]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE email=$3",
      [token, expiry, email]
    );

    // 🔥 CREATE RESET LINK
    const resetLink = `${process.env.SUPERADMIN_URL}/reset-password/${token}`;

    // 🔥 SEND EMAIL
    await sendEmail(
      email,
      "Reset Your Password",
      `
        <h3>Password Reset</h3>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `
    );

    return res.json({
      success: true,
      message: "Reset email sent",
    });

  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token=$1 AND reset_token_expiry > $2",
      [token, Date.now()]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = result.rows[0];

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL, reset_token_expiry=NULL WHERE id=$2",
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND role IN ('ADMIN','STAFF')",
      [email]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3",
      [token, expiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await sendEmail(
  user.email,
  "Reset Your Password",
  `
    <h3>Password Reset</h3>
    <p>Click below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link expires in 1 hour.</p>
  `
);

    res.json({
      success: true,
      message: "Reset link sent",
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM otp_codes
      WHERE email = $1
        AND otp = $2
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // delete OTP after success
    await pool.query(
      `
      DELETE FROM otp_codes
      WHERE email = $1
      `,
      [email]
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE email = $2
      `,
      [hashedPassword, email]
    );

    return res.json({
      success: true,
      message: "Password set successfully",
    });

  } catch (error) {
    console.error(
      "SET PASSWORD ERROR:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to set password",
    });
  }
};