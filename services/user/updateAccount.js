const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

const updateAccount = async (req, res) => {
  const userId = req.user.user_id;
  const { name, email, phone_number, password } = req.body;
  let id_card_front = req.files["id_card_front"]
    ? req.files["id_card_front"][0].path
    : null;
  let id_card_back = req.files["id_card_back"]
    ? req.files["id_card_back"][0].path
    : null;

  try {
    const connection = await pool.getConnection();

    const [currentUser] = await connection.query(
      "SELECT id_card_photo_front, id_card_photo_back FROM users WHERE user_id = ?",
      [userId]
    );

    if (id_card_front && currentUser[0].id_card_photo_front) {
      fs.unlink(path.join("", currentUser[0].id_card_photo_front), (err) => {
        if (err) console.error("Error deleting old front photo:", err);
      });
    }

    if (id_card_back && currentUser[0].id_card_photo_back) {
      fs.unlink(path.join("", currentUser[0].id_card_photo_back), (err) => {
        if (err) console.error("Error deleting old back photo:", err);
      });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        "UPDATE users SET password = ? WHERE user_id = ?",
        [hashedPassword, userId]
      );
    }

    const [result] = await connection.query(
      "UPDATE users SET name = ?, email = ?, phone_number = ?, id_card_photo_front = ?, id_card_photo_back = ? WHERE user_id = ?",
      [
        name,
        email,
        phone_number,
        id_card_front || currentUser[0].id_card_photo_front,
        id_card_back || currentUser[0].id_card_photo_back,
        userId,
      ]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "User not found or no changes made" });
    }

    res.json({ message: "Account updated successfully" });
  } catch (error) {
    console.error("Error updating database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = updateAccount;
