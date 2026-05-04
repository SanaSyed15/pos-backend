import pool from "../config/db.js";

/* =========================
   ADD CONTACT
========================= */
export const addContact = async (req, res) => {
  try {
    const { restaurant_id } = req.user;
    const { type, value } = req.body;

    if (!["PHONE", "EMAIL"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const result = await pool.query(
      `INSERT INTO restaurant_contacts (restaurant_id, type, value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant_id, type, value]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
};

/* =========================
   GET CONTACTS
========================= */
export const getContacts = async (req, res) => {
  try {
    const { restaurant_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM restaurant_contacts WHERE restaurant_id = $1`,
      [restaurant_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* =========================
   DELETE CONTACT
========================= */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM restaurant_contacts WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};