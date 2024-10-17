const bcrypt = require("bcrypt");
const pool = require("../../config/db");

const addAdmin = async (req, res) => {
  const { name, email, password, admin_type, hotel_id } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO admins (name, email, password, admin_type, hotel_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.query(query, [
      name,
      email,
      hashedPassword,
      admin_type,
      hotel_id,
    ]);

    res
      .status(201)
      .json({ message: "Admin added successfully", adminId: result.insertId });
  } catch (error) {
    console.error("Error adding admin:", error);
    return res.status(500).json({ error: "Failed to add admin" });
  }
};

module.exports = addAdmin;
