import pool from "../config/db.js";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

/* =========================
   CUSTOMER LOGIN
========================= */
const customerLogin = async (req, res) => {
  try {
    const { qrToken, name, phone } = req.body;

    if (!qrToken || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "QR token, name and phone are required",
      });
    }

    const tableResult = await pool.query(
      `
      SELECT id, restaurant_id, table_number
      FROM tables
      WHERE qr_token = $1 AND is_active = true
      `,
      [qrToken]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive QR code",
      });
    }

    const table = tableResult.rows[0];

    const token = jwt.sign(
      {
        type: "CUSTOMER",
        table_id: table.id,
        restaurant_id: table.restaurant_id,
        name,
        phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "3h" }
    );

    return res.json({
  success: true,
  message: "Login successful",
  token,
  customer: { name, phone },
  table: {
    id: table.id,
    table_number: table.table_number, 
  },
});

  } catch (error) {
    console.error("Customer login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET MENU
========================= */
const getMenu = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { restaurant_id } = req.user;

    const categoriesResult = await pool.query(
      `SELECT id, name, description
       FROM menu_categories
       WHERE restaurant_id = $1
       ORDER BY created_at ASC`,
      [restaurant_id]
    );

    const itemsResult = await pool.query(
  `SELECT id, category_id, name, description, price, image_url, is_special
   FROM menu_items
   WHERE restaurant_id = $1 AND is_available = true`,
  [restaurant_id]
);
    const specials = itemsResult.rows.filter(item => item.is_special);
    const categories = categoriesResult.rows.map(category => ({
      
      ...category,
      items: itemsResult.rows.filter(
        item => item.category_id === category.id
      )
    }));

    return res.json({
  success: true,
  data: categories,
  specials
});

  } catch (error) {
    console.error("Get menu error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   CREATE ORDER
========================= */
const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    const { table_id, restaurant_id, name, phone } = req.user;

    await client.query("BEGIN");

    let subtotal = 0;

    const orderResult = await client.query(
      `
      INSERT INTO orders 
      (restaurant_id, table_id, order_type, customer_name, customer_phone)
      VALUES ($1, $2, 'DINE_IN', $3, $4)
      RETURNING *
      `,
      [restaurant_id, table_id, name, phone]
    );

    const order = orderResult.rows[0];

    await client.query(
      `UPDATE tables
       SET table_status = 'OCCUPIED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [table_id]
    );

    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item data");
      }

      const menuResult = await client.query(
        `SELECT price
         FROM menu_items
         WHERE id = $1 
         AND restaurant_id = $2
         AND is_available = true`,
        [item.menu_item_id, restaurant_id]
      );

      if (menuResult.rows.length === 0) {
        throw new Error("Invalid menu item");
      }

      const price = Number(menuResult.rows[0].price);
      const itemSubtotal = price * item.quantity;

      subtotal += itemSubtotal;

      await client.query(
        `INSERT INTO order_items
         (order_id, menu_item_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.menu_item_id, item.quantity, price, itemSubtotal]
      );
    }

    const taxResult = await client.query(
      `SELECT gst_percentage
       FROM restaurant_tax_details
       WHERE restaurant_id = $1`,
      [restaurant_id]
    );

    const gst = Number(taxResult.rows[0]?.gst_percentage || 0);

    const taxAmount = Number(((subtotal * gst) / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    await client.query(
      `UPDATE orders
       SET subtotal = $1,
           tax_amount = $2,
           total_amount = $3
       WHERE id = $4`,
      [subtotal, taxAmount, total, order.id]
    );

    await client.query("COMMIT");

    await pool.query(
  `DELETE FROM cart_items WHERE table_id = $1`,
  [table_id]
);

return res.status(201).json({
  success: true,
  message: "Order placed successfully",
  data: {
    order_id: order.id,
    total_amount: total,
    status: "PLACED",
  },
});

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create order error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    client.release();
  }
};

/* =========================
   GET ORDER STATUS
========================= */
const getOrderStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { orderId } = req.params;
    const { restaurant_id, table_id } = req.user;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID required",
      });
    }

    const orderResult = await pool.query(
      `
      SELECT 
        o.id,
        o.order_type,
        o.status,
        o.payment_status,
        o.subtotal,
        o.tax_amount,
        o.total_amount,
        o.created_at,
        rtd.gst_percentage
      FROM orders o
      LEFT JOIN restaurant_tax_details rtd
        ON rtd.restaurant_id = o.restaurant_id
      WHERE o.id = $1 
        AND o.restaurant_id = $2
        AND o.table_id = $3
      `,
      [orderId, restaurant_id, table_id]
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT 
        oi.id,
        oi.quantity,
        oi.price,
        oi.subtotal,
        m.name AS item_name
      FROM order_items oi
      JOIN menu_items m 
        ON oi.menu_item_id = m.id
      WHERE oi.order_id = $1
      `,
      [orderId]
    );

    return res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error("Get order status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET RESTAURANT DETAILS
========================= */
export const getRestaurantDetails = async (req, res) => {
  try {
    const { qrToken } = req.query;

    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: "QR token is required",
      });
    }

    // Validate QR token and get table + restaurant
    const tableResult = await pool.query(
      `
      SELECT
        id,
        restaurant_id,
        table_number
      FROM tables
      WHERE qr_token = $1
        AND is_active = true
      `,
      [qrToken]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive QR code",
      });
    }

    const table = tableResult.rows[0];

    // Get restaurant details
    const restaurantResult = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        restaurant_type,
        address,
        city,
        state
      FROM restaurants
      WHERE id = $1
      `,
      [table.restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Get contacts
    const contactsResult = await pool.query(
      `
      SELECT type, value
      FROM restaurant_contacts
      WHERE restaurant_id = $1
      `,
      [table.restaurant_id]
    );

    const contacts = {
      phone: null,
      email: null,
    };

    contactsResult.rows.forEach((contact) => {
      if (contact.type === "PHONE") {
        contacts.phone = contact.value;
      } else if (contact.type === "EMAIL") {
        contacts.email = contact.value;
      }
    });

    const restaurant = restaurantResult.rows[0];

    return res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          restaurant_type: restaurant.restaurant_type,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
        },
        table: {
          id: table.id,
          table_number: table.table_number,
        },
        contacts,
      },
    });

  } catch (error) {
    console.error("Get restaurant details error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default {
  customerLogin,
  getMenu,
  createOrder,
  getOrderStatus,
  getRestaurantDetails,
};