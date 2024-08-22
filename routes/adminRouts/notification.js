const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

const notificationRouter = express.Router();

// Get all notifications for a specific admin
notificationRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [admin] = await connection.query(
      "SELECT email FROM admins WHERE admin_id = ? ",
      [req.admin.admin_id]
    );
    const [notifications] = await connection.query(
      "SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC",
      [admin[0].email]
    );

    connection.release();

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = notificationRouter;
