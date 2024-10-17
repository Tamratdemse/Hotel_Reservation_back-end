// File: routes/notification.js

const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const {
  getAdminEmail,
  getNotificationsForAdmin,
} = require("../../services/admin/notificationService");

const notificationRouter = express.Router();

// Get all notifications for a specific admin
notificationRouter.get("/", authenticateToken, async (req, res) => {
  try {
    // Get admin email using the admin ID from the request
    const adminEmail = await getAdminEmail(req.admin.admin_id);
    if (!adminEmail) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Fetch notifications for the admin
    const notifications = await getNotificationsForAdmin(adminEmail);
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = notificationRouter;
