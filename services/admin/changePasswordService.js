// File: service/changePasswordService.js

const bcrypt = require("bcrypt");
const pool = require("../../config/db");

async function getAdminById(adminId) {
  const connection = await pool.getConnection();
  const [admins] = await connection.query(
    "SELECT * FROM admins WHERE admin_id = ?",
    [adminId]
  );
  connection.release();
  return admins[0];
}

async function updateAdminPassword(adminId, newPassword) {
  const connection = await pool.getConnection();
  await connection.query("UPDATE admins SET password = ? WHERE admin_id = ?", [
    newPassword,
    adminId,
  ]);
  connection.release();
}

async function verifyCurrentPassword(currentPassword, storedPassword) {
  return bcrypt.compare(currentPassword, storedPassword);
}

async function hashNewPassword(newPassword) {
  return bcrypt.hash(newPassword, 10);
}

module.exports = {
  getAdminById,
  updateAdminPassword,
  verifyCurrentPassword,
  hashNewPassword,
};
