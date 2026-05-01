import pool from "../config/db.js";

/* =========================
   GET CART
========================= */
const getCart = async (req, res) => {
  try {
    const { table_id, restaurant_id } = req.user;

    const result = await pool.query(
      `SELECT 
         c.menu_item_id,
         c.quantity,
         m.name,
         m.price,
         m.image_url
       FROM cart_items c
       JOIN menu_items m ON c.menu_item_id = m.id
       WHERE c.table_id = $1 AND c.restaurant_id = $2`,
      [table_id, restaurant_id]
    );

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   ADD ITEM
========================= */
const addToCart = async (req, res) => {
  try {
    const { table_id, restaurant_id } = req.user;
    const { menu_item_id, quantity } = req.body;

    if (!menu_item_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "menu_item_id and quantity required"
      });
    }

    await pool.query(
      `INSERT INTO cart_items (table_id, restaurant_id, menu_item_id, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (table_id, menu_item_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [table_id, restaurant_id, menu_item_id, quantity]
    );

    return res.json({ success: true, message: "Item added to cart" });

  } catch (error) {
    console.error("Add cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   UPDATE ITEM
========================= */
const updateCart = async (req, res) => {
  try {
    const { table_id } = req.user;
    const { menu_item_id, quantity } = req.body;

    if (quantity <= 0) {
      await pool.query(
        `DELETE FROM cart_items WHERE table_id = $1 AND menu_item_id = $2`,
        [table_id, menu_item_id]
      );
    } else {
      await pool.query(
        `UPDATE cart_items 
         SET quantity = $1 
         WHERE table_id = $2 AND menu_item_id = $3`,
        [quantity, table_id, menu_item_id]
      );
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("Update cart error:", error.message);
    res.status(500).json({ success: false });
  }
};

/* =========================
   DELETE ITEM
========================= */
const deleteCartItem = async (req, res) => {
  try {
    const { table_id } = req.user;
    const { menu_item_id } = req.body;

    await pool.query(
      `DELETE FROM cart_items WHERE table_id = $1 AND menu_item_id = $2`,
      [table_id, menu_item_id]
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("Delete cart error:", error.message);
    res.status(500).json({ success: false });
  }
};

/* =========================
   CLEAR CART
========================= */
const clearCart = async (req, res) => {
  try {
    const { table_id } = req.user;

    await pool.query(
      `DELETE FROM cart_items WHERE table_id = $1`,
      [table_id]
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("Clear cart error:", error.message);
    res.status(500).json({ success: false });
  }
};

export default {
  getCart,
  addToCart,
  updateCart,
  deleteCartItem,
  clearCart
};