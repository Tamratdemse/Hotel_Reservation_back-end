const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

const notificationRouter = express.Router();

// Get all notifications for a specific admin
notificationRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [notifications] = await connection.query(
      "SELECT * FROM Notifications WHERE admin_id = ? ORDER BY created_at DESC",
      [req.admin.admin_id]
    );

    connection.release();

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = notificationRouter;
