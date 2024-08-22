require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");

const changepasswordRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

// Admin Change Password
changepasswordRouter.post("/", authenticateToken, async (req, res) => {
  const {  newPassword } = req.body;

  try {
    const connection = await pool.getConnection();

    const [admins] = await connection.query(
      "SELECT * FROM admins WHERE admin_id = ?",
      [req.admin.admin_id]
    );

    if (admins.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Admin not found" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await connection.query(
      "UPDATE admins SET password = ? WHERE admin_id = ?",
      [hashedNewPassword, req.admin.admin_id]
    );
    connection.release();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = changepasswordRouter;
