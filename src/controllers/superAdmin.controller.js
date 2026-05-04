import pool from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

export const onboardRestaurant = async (req, res) => {
  const client = await pool.connect();

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /* ✅ SAFE DESTRUCTURING */
    const {
      restaurant,
      admin,

      tax = {
        gstRegistered: false,
        gstNumber: null,
        gstPercentage: 0,
      },

      settings = {
        billingMode: "BOTH",
        tablesCount: 0,
        qrEnabled: false,
      },
    } = req.body;

    /* ✅ BASIC VALIDATION */
    if (!restaurant?.name || !restaurant?.city || !admin?.name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await client.query("BEGIN");

    /* ---------- INSERT RESTAURANT ---------- */
    const restaurantResult = await client.query(
      `
      INSERT INTO restaurants
        (name, restaurant_type, description, address, city, state, pincode, phone, email, status)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
      `,
      [
        restaurant.name,
        restaurant.restaurantType || "Restaurant",
        restaurant.description || null,
        restaurant.address || null,
        restaurant.city,
        restaurant.state || null,
        restaurant.pincode || null,
        restaurant.phone || null,
        restaurant.email || null,
        restaurant.status || "INACTIVE",
      ]
    );

    const restaurantId = restaurantResult.rows[0].id;

    /* ---------- INSERT TAX DETAILS ---------- */
    await client.query(
      `
      INSERT INTO restaurant_tax_details
        (restaurant_id, gst_registered, gst_number, gst_percentage)
      VALUES
        ($1,$2,$3,$4)
      `,
      [
        restaurantId,
        tax.gstRegistered,
        tax.gstNumber,
        tax.gstPercentage,
      ]
    );

    /* ---------- INSERT SETTINGS ---------- */
    await client.query(
      `
      INSERT INTO restaurant_settings
        (restaurant_id, billing_mode, tables_count, qr_enabled)
      VALUES
        ($1,$2,$3,$4)
      `,
      [
        restaurantId,
        settings.billingMode,
        settings.tablesCount,
        settings.qrEnabled,
      ]
    );

    /* ---------- CREATE ADMIN USER ---------- */
    // 🔐 Generate setup token
const token = crypto.randomBytes(32).toString("hex");
const expiry = Date.now() + 3600000; // 1 hour

// 👤 Create admin WITHOUT password
await client.query(
  `
  INSERT INTO users
    (name, email, phone, password, role, restaurant_id, reset_token, reset_token_expiry)
  VALUES
    ($1,$2,$3,$4,'ADMIN',$5,$6,$7)
  `,
  [
    admin.name,
    admin.email || null,
    admin.phone || null,
    null, // ❗ no password
    restaurantId,
    token,
    expiry,
  ]
);

    await client.query("COMMIT");

    // 🔗 Create reset link
const resetLink = `${process.env.FRONTEND_URL}/set-password/${token}`;

// 📧 Send email
await sendEmail(
  admin.email,
  "Set Your Password",
  `
    <h3>Welcome to Restaurant POS</h3>
    <p>Your account has been created by Super Admin.</p>
    <p>Click below to set your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link expires in 1 hour.</p>
  `
);

    /* ✅ SUCCESS RESPONSE */
    return res.status(201).json({
      success: true,
      message: "Restaurant onboarded successfully",
      data: {
        restaurantId,
      },
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("ONBOARD ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Onboarding failed",
    });
  } finally {
    client.release();
  }
};

export const getRestaurants = async (req, res) => {
  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const result = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.city,
        r.status,
        u.name AS owner_name
      FROM restaurants r
      LEFT JOIN users u
        ON u.restaurant_id = r.id
        AND u.role = 'ADMIN'
      ORDER BY r.created_at DESC
    `);

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("Get restaurants error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurants",
    });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const totalRestaurants = await pool.query(
      "SELECT COUNT(*) FROM restaurants"
    );

    const activeRestaurants = await pool.query(
      "SELECT COUNT(*) FROM restaurants WHERE status = 'ACTIVE'"
    );

    const inactiveRestaurants = await pool.query(
      "SELECT COUNT(*) FROM restaurants WHERE status = 'INACTIVE'"
    );

// ✅ FIXED: Orders Today from DB
const ordersTodayResult = await pool.query(`
  SELECT COUNT(*) 
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE
`);

const ordersToday = Number(ordersTodayResult.rows[0].count);

return res.json({
  success: true,
  data: {
    totalRestaurants: Number(totalRestaurants.rows[0].count),
    activeRestaurants: Number(activeRestaurants.rows[0].count),
    inactiveRestaurants: Number(inactiveRestaurants.rows[0].count),
    ordersToday,
  },
});


  } catch (error) {
    console.error("Dashboard stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
    });
  }
};


export const getRestaurantManagePage = async (req, res) => {
  const { id } = req.params;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 1️⃣ Restaurant + Tax + Settings
    const restaurantResult = await pool.query(
      `
      SELECT
        r.id,
        r.name,
        r.restaurant_type,
        r.description,
        r.address,
        r.city,
        r.state,
        r.country,
        r.pincode,
        r.phone,
        r.email,
        r.status,
        r.created_at,
        r.updated_at,

        t.gst_registered,
        t.gst_number,
        t.gst_percentage,

        s.billing_mode,
        s.tables_count,
        s.qr_enabled

      FROM restaurants r
      LEFT JOIN restaurant_tax_details t
        ON t.restaurant_id = r.id
      LEFT JOIN restaurant_settings s
        ON s.restaurant_id = r.id
      WHERE r.id = $1
      `,
      [id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const row = restaurantResult.rows[0];

    // 2️⃣ Owner (ADMIN)
    const ownerResult = await pool.query(
      `
      SELECT id, name, email, phone, status
      FROM users
      WHERE restaurant_id = $1
        AND role = 'ADMIN'
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      success: true,
      data: {
        restaurant: {
          id: row.id,
          name: row.name,
          restaurant_type: row.restaurant_type,
          description: row.description,
          address: row.address,
          city: row.city,
          state: row.state,
          country: row.country,
          pincode: row.pincode,
          phone: row.phone,
          email: row.email,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },

        tax: {
          gst_registered: row.gst_registered ?? false,
          gst_number: row.gst_number ?? null,
          gst_percentage: row.gst_percentage ?? null,
        },

        settings: {
          billing_mode: row.billing_mode ?? "COUNTER",
          tables_count: row.tables_count ?? 0,
          qr_enabled: row.qr_enabled ?? false,
        },

        owner: ownerResult.rows[0] || null,
      },
    });

  } catch (error) {
    console.error("Manage page error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateRestaurantDetails = async (req, res) => {
  const { id } = req.params;
  const {
    restaurant_type,
    description,
    address,
    state,
    pincode,
    phone,
    email
  } = req.body;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const exists = await pool.query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [id]
    );

    if (exists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const result = await pool.query(
      `
      UPDATE restaurants
      SET
        restaurant_type = COALESCE($1, restaurant_type),
        description     = COALESCE($2, description),
        address         = COALESCE($3, address),
        state           = COALESCE($4, state),
        pincode         = COALESCE($5, pincode),
        phone           = COALESCE($6, phone),
        email           = COALESCE($7, email)
      WHERE id = $8
      RETURNING *
      `,
      [
        restaurant_type,
        description,
        address,
        state,
        pincode,
        phone,
        email,
        id
      ]
    );

    return res.json({
      success: true,
      message: "Restaurant details updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("UPDATE DETAILS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateRestaurantSettings = async (req, res) => {
  const { id } = req.params;
  const { billing_mode, tables_count, qr_enabled } = req.body;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 1️⃣ Validate restaurant exists
    const restaurant = await pool.query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [id]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 2️⃣ Validate billing rules
    if (!["COUNTER", "TABLE", "BOTH"].includes(billing_mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing_mode",
      });
    }

    if (billing_mode === "COUNTER" && tables_count > 0) {
      return res.status(400).json({
        success: false,
        message: "tables_count must be 0 for COUNTER billing mode",
      });
    }

    if (
      (billing_mode === "TABLE" || billing_mode === "BOTH") &&
      (!tables_count || tables_count <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "tables_count must be greater than 0 for TABLE or BOTH mode",
      });
    }

    // 3️⃣ Upsert settings
    const result = await pool.query(
      `
      INSERT INTO restaurant_settings
        (restaurant_id, billing_mode, tables_count, qr_enabled)
      VALUES
        ($1, $2, $3, $4)
      ON CONFLICT (restaurant_id)
      DO UPDATE SET
        billing_mode = EXCLUDED.billing_mode,
        tables_count = EXCLUDED.tables_count,
        qr_enabled   = EXCLUDED.qr_enabled
      RETURNING *
      `,
      [
        id,
        billing_mode,
        billing_mode === "COUNTER" ? 0 : tables_count,
        qr_enabled ?? false,
      ]
    );

    return res.json({
      success: true,
      message: "Operational settings updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("SETTINGS UPDATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateRestaurantTax = async (req, res) => {
  const { id } = req.params;
  const { gst_registered, gst_number, gst_percentage } = req.body;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 1️⃣ Check restaurant exists
    const restaurant = await pool.query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [id]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 2️⃣ Validation
    if (gst_registered === true) {
      if (!gst_number || gst_percentage === undefined || gst_percentage <= 0) {
        return res.status(400).json({
          success: false,
          message: "GST number and valid GST percentage are required",
        });
      }
    }

    // 3️⃣ Upsert tax config
    const result = await pool.query(
      `
      INSERT INTO restaurant_tax_details
        (restaurant_id, gst_registered, gst_number, gst_percentage)
      VALUES
        ($1, $2, $3, $4)
      ON CONFLICT (restaurant_id)
      DO UPDATE SET
        gst_registered = EXCLUDED.gst_registered,
        gst_number = CASE
          WHEN EXCLUDED.gst_registered = false THEN NULL
          ELSE EXCLUDED.gst_number
        END,
        gst_percentage = CASE
          WHEN EXCLUDED.gst_registered = false THEN NULL
          ELSE EXCLUDED.gst_percentage
        END
      RETURNING *
      `,
      [
        id,
        gst_registered,
        gst_registered ? gst_number : null,
        gst_registered ? gst_percentage : null,
      ]
    );

    return res.json({
      success: true,
      message: "Tax configuration updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("TAX UPDATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateRestaurantStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED"];

  // 🔒 SUPER ADMIN CHECK
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid restaurant status",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Check restaurant exists
    const restaurant = await client.query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [id]
    );

    if (restaurant.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 2️⃣ Update restaurant status
    await client.query(
      `
      UPDATE restaurants
      SET status = $1
      WHERE id = $2
      `,
      [status, id]
    );

    // 3️⃣ Cascade to ADMIN users
    const userStatus = status === "ACTIVE";

    await client.query(
      `
      UPDATE users
      SET status = $1
      WHERE restaurant_id = $2
        AND role = 'ADMIN'
      `,
      [userStatus, id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Restaurant status updated to ${status}`,
      data: {
        restaurantStatus: status,
        adminAccess: userStatus ? "ENABLED" : "DISABLED",
      },
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("STATUS UPDATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    client.release();
  }
};


export const deleteRestaurant = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await client.query("BEGIN");

    // 1️⃣ Check if restaurant exists
    const check = await client.query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 2️⃣ DELETE CHILD TABLES FIRST (VERY IMPORTANT)
    await client.query(
      `DELETE FROM restaurant_tax_details WHERE restaurant_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM restaurant_settings WHERE restaurant_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM users WHERE restaurant_id = $1`,
      [id]
    );

    // (Optional but recommended if you have orders)
    await client.query(
      `DELETE FROM orders WHERE restaurant_id = $1`,
      [id]
    );

    // 3️⃣ DELETE MAIN RESTAURANT
    await client.query(
      `DELETE FROM restaurants WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Restaurant permanently deleted",
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("DELETE RESTAURANT ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  } finally {
    client.release();
  }
};


export const updateRestaurantOwner = async (req, res) => {
  const { id } = req.params;
  const { name, phone, status } = req.body;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 1️⃣ Find ADMIN user for restaurant
    const ownerResult = await pool.query(
      `
      SELECT id FROM users
      WHERE restaurant_id = $1
        AND role = 'ADMIN'
      LIMIT 1
      `,
      [id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found for this restaurant",
      });
    }

    const ownerId = ownerResult.rows[0].id;

    // 2️⃣ Update owner
    const result = await pool.query(
      `
      UPDATE users
      SET
        name   = COALESCE($1, name),
        phone  = COALESCE($2, phone),
        status = COALESCE($3, status)
      WHERE id = $4
      RETURNING id, name, email, phone, status
      `,
      [name, phone, status, ownerId]
    );

    return res.json({
      success: true,
      message: "Restaurant owner updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("OWNER UPDATE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
/* ============================
   OWNERS (ADMIN USERS)
============================ */

/**
 * GET all owners (ADMIN users)
 */
export const getOwners = async (req, res) => {
  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        COUNT(r.id) AS restaurants_count
      FROM users u
      LEFT JOIN restaurants r
        ON r.id = u.restaurant_id
      WHERE u.role = 'ADMIN'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return res.json({
      success: true,
      data: result.rows.map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        phone: o.phone,
        restaurantsCount: Number(o.restaurants_count),
        status: o.status ? "Active" : "Suspended",
      })),
    });

  } catch (err) {
    console.error("Get owners error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owners",
    });
  }
};


/**
 * GET single owner details
 */
export const getOwnerDetails = async (req, res) => {
  const { id } = req.params;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const ownerResult = await pool.query(
      `
      SELECT id, name, email, phone, status, created_at, restaurant_id
      FROM users
      WHERE id = $1 AND role = 'ADMIN'
      `,
      [id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    const owner = ownerResult.rows[0];

    const restaurantsResult = await pool.query(
      `
      SELECT id, name, city, status
      FROM restaurants
      WHERE id = $1
      `,
      [owner.restaurant_id]
    );

    return res.json({
      success: true,
      data: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        status: owner.status ? "Active" : "Suspended",
        joinedOn: owner.created_at,
        restaurants: restaurantsResult.rows.map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city,
          status: r.status === "ACTIVE" ? "Active" : "Inactive",
        })),
      },
    });

  } catch (err) {
    console.error("Get owner details error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner details",
    });
  }
};


/**
 * Activate / Suspend owner
 */
export const toggleOwnerStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // 🔒 SUPER ADMIN CHECK
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET status = NOT status
      WHERE id = $1 AND role = 'ADMIN'
      RETURNING status
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    return res.json({
      success: true,
      message: "Owner status updated",
      data: {
        status: result.rows[0].status ? "Active" : "Suspended",
      },
    });

  } catch (err) {
    console.error("Toggle owner status error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update owner status",
    });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const [restaurantStats, ownersResult, topRestaurants] =
      await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
            COUNT(*) FILTER (WHERE status = 'INACTIVE') AS inactive
          FROM restaurants
        `),

        pool.query(`
          SELECT COUNT(*) FROM users WHERE role = 'ADMIN'
        `),

        pool.query(`
          SELECT r.id, r.name, r.city, COUNT(o.id) AS orders
          FROM restaurants r
          LEFT JOIN orders o ON o.restaurant_id = r.id
          GROUP BY r.id
          ORDER BY orders DESC
          LIMIT 5
        `),
      ]);

    const statsRow = restaurantStats.rows[0];

    return res.json({
      success: true,
      data: {
        stats: {
          totalRestaurants: Number(statsRow.total),
          activeRestaurants: Number(statsRow.active),
          inactiveRestaurants: Number(statsRow.inactive),
          totalOwners: Number(ownersResult.rows[0].count),
        },

        topRestaurants: topRestaurants.rows.map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city,
          orders: Number(r.orders),
        })),

        serverTime: new Date(),
      },
    });

  } catch (error) {
    console.error("ANALYTICS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load analytics",
    });
  }
};