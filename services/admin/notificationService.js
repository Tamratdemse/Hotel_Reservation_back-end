// File: service/notificationService.js

const pool = require("../../config/db");

// Get the admin's email using their ID
async function getAdminEmail(adminId) {
  const connection = await pool.getConnection();
  const [admin] = await connection.query(
    "SELECT email FROM admins WHERE admin_id = ?",
    [adminId]
  );
  connection.release();
  return admin[0] ? admin[0].email : null; // Return email or null if not found
}

// Fetch all notifications for a specific admin using their email
async function getNotificationsForAdmin(adminEmail) {
  const connection = await pool.getConnection();
  const [notifications] = await connection.query(
    "SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC",
    [adminEmail]
  );
  connection.release();
  return notifications; // Return the notifications
}

module.exports = {
  getAdminEmail,
  getNotificationsForAdmin,
};
