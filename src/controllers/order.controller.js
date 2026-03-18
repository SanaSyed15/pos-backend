import pool from "../config/db.js";

/* =========================
   GET ORDERS (Admin / Staff)
========================= */
const getOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { restaurant_id } = req.user;

    const result = await pool.query(
      `
      SELECT 
        o.id AS order_id,
        o.order_type,  
        o.status,
        o.payment_status,
        o.total_amount,
        o.created_at,
        o.customer_name,
        o.customer_phone,
        t.table_number,
        oi.id AS order_item_id,
        oi.quantity,
        oi.price,
        oi.subtotal,
        m.name AS item_name
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE o.restaurant_id = $1
      ORDER BY o.created_at DESC
      `,
      [restaurant_id]
    );

    const ordersMap = {};

    result.rows.forEach((row) => {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          order_type: row.order_type,
          table_number: row.table_number,
          status: row.status,
          payment_status: row.payment_status,
          total_amount: row.total_amount,
          created_at: row.created_at,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          items: [],
        };
      }

      if (row.order_item_id) {
        ordersMap[row.order_id].items.push({
          id: row.order_item_id,
          name: row.item_name,
          quantity: row.quantity,
          price: row.price,
          subtotal: row.subtotal,
        });
      }
    });

    return res.json({
      success: true,
      data: Object.values(ordersMap),
    });

  } catch (error) {
    console.error("Get orders error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   UPDATE ORDER STATUS
========================= */
const updateOrderStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;
    const { restaurant_id, role } = req.user;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    const orderResult = await pool.query(
      `SELECT status, table_id
       FROM orders
       WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurant_id]
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const currentStatus = orderResult.rows[0].status;
    const tableId = orderResult.rows[0].table_id;

    const validTransitions = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY"],
      READY: ["SERVED"],
      SERVED: ["BILLED"],
      BILLED: ["PAID"],
      PAID: [],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from ${currentStatus} to ${status}`,
      });
    }

    // Role restrictions
    if (role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot update order status",
      });
    }

    if (role === "SERVING_STAFF") {
      const allowed = ["CONFIRMED", "PREPARING", "READY", "SERVED"];
      if (!allowed.includes(status)) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to set this status",
        });
      }
    }

    if (role === "BILLING_STAFF") {
      const allowed = ["BILLED", "PAID"];
      if (!allowed.includes(status)) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to set this status",
        });
      }
    }

    const updateResult = await pool.query(
      `
      UPDATE orders
      SET 
        status = $1::text,
        payment_status = CASE 
            WHEN $1::text = 'PAID' THEN 'PAID'
            ELSE payment_status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND restaurant_id = $3
      RETURNING *
      `,
      [status, id, restaurant_id]
    );

    if (status === "PAID" || status === "CANCELLED") {
      await pool.query(
        `
        UPDATE tables
        SET table_status = 'EMPTY',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [tableId]
      );
    }

    return res.json({
      success: true,
      message: "Order status updated",
      data: updateResult.rows[0],
    });

  } catch (error) {
    console.error("Update order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET ORDER BY ID
========================= */
const getOrderById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const orderResult = await pool.query(
      `
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE o.id = $1 AND o.restaurant_id = $2
      `,
      [id, restaurant_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT 
        oi.id,
        oi.menu_item_id,
        oi.quantity,
        oi.price,
        oi.subtotal,
        m.name AS item_name
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = $1
      `,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });

  } catch (error) {
    console.error("Get order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default {
  getOrders,
  updateOrderStatus,
  getOrderById,
};