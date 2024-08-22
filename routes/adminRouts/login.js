// login.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { subscribe } = require("../../utility/notificationSender");

const loginRouter = express.Router();
const pool = require("../../configration/db");

const JWT_SECRET = process.env.JWT_SECRET;

loginRouter.post("/", async (req, res) => {
  const { email, password, subscription } = req.body;
  console.log(req.body);

  try {
    const connection = await pool.getConnection();

    const [admins] = await connection.query(
      "SELECT * FROM Admins WHERE email = ?",
      [email]
    );

    if (admins.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      connection.release();
      return res.status(400).json({ error: "Invalid email or password" });
    }

    subscribe(email, subscription);
    const token = jwt.sign(
      {
        admin_id: admin.Admin_id,
        name: admin.name,
        admin_type: admin.admin_type,
        hotel_id: admin.hotel_id,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    connection.release();
    res.json({ token });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = loginRouter;
