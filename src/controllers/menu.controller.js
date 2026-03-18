import pool from "../config/db.js";

/* =========================
   CREATE CATEGORY
========================= */
const createCategory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description } = req.body;
    const { restaurant_id } = req.user;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO menu_categories (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant_id, name, description || null]
    );

    return res.status(201).json({
      success: true,
      message: "Category created",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Create category error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   GET CATEGORIES
========================= */
const getCategories = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { restaurant_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM menu_categories
       WHERE restaurant_id = $1
       ORDER BY created_at ASC`,
      [restaurant_id]
    );

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("Get categories error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   CREATE ITEM
========================= */
const createItem = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description, price, category_id, image_url } = req.body;
    const { restaurant_id } = req.user;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    if (category_id) {
      const categoryCheck = await pool.query(
        `SELECT id FROM menu_categories
         WHERE id = $1 AND restaurant_id = $2`,
        [category_id, restaurant_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid category for this restaurant",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO menu_items
       (restaurant_id, category_id, name, description, price, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        restaurant_id,
        category_id || null,
        name,
        description || null,
        price,
        image_url || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Item created",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Create item error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   GET ITEMS
========================= */
const getItems = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { restaurant_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM menu_items
       WHERE restaurant_id = $1
       ORDER BY created_at DESC`,
      [restaurant_id]
    );

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error("Get items error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   UPDATE ITEM
========================= */
const updateItem = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { restaurant_id } = req.user;

    const fields = [];
    const values = [];
    let index = 1;

    for (const key in req.body) {
      fields.push(`${key} = $${index}`);
      values.push(req.body[key]);
      index++;
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE menu_items
      SET ${fields.join(", ")}
      WHERE id = $${index} AND restaurant_id = $${index + 1}
      RETURNING *
    `;

    values.push(id, restaurant_id);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.json({
      success: true,
      message: "Item updated",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Update item error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   TOGGLE ITEM
========================= */
const toggleItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `UPDATE menu_items
       SET is_available = NOT is_available
       WHERE id = $1 AND restaurant_id = $2
       RETURNING *`,
      [id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.json({
      success: true,
      message: "Item availability toggled",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Toggle item error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   UPDATE CATEGORY
========================= */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const { restaurant_id } = req.user;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const result = await pool.query(
      `UPDATE menu_categories
       SET name = $1, description = $2
       WHERE id = $3 AND restaurant_id = $4
       RETURNING *`,
      [name, description || null, id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category updated",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Update category error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   DELETE CATEGORY
========================= */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id } = req.user;

    const itemsCheck = await pool.query(
      `SELECT COUNT(*) 
       FROM menu_items
       WHERE category_id = $1 AND restaurant_id = $2`,
      [id, restaurant_id]
    );

    if (Number(itemsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with existing items",
      });
    }

    const result = await pool.query(
      `DELETE FROM menu_categories
       WHERE id = $1 AND restaurant_id = $2
       RETURNING *`,
      [id, restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });

  } catch (error) {
    console.error("Delete category error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createItem,
  getItems,
  updateItem,
  toggleItem,
};