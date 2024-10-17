const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

const registerUser = async (req, res) => {
  const { name, email, phone_number, password } = req.body;
  const id_card_front = req.files["id_card_front"]
    ? req.files["id_card_front"][0].filename
    : null;
  const id_card_back = req.files["id_card_back"]
    ? req.files["id_card_back"][0].filename
    : null;

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      if (id_card_front)
        fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_front));
      if (id_card_back)
        fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_back));
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, phone_number, password, id_card_photo_front, id_card_photo_back) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone_number, hashedPassword, id_card_front, id_card_back]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error:", error);
    if (id_card_front)
      fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_front));
    if (id_card_back)
      fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_back));
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = registerUser;
