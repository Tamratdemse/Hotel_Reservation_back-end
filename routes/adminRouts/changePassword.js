// File: routes/admin/changePassword.js

require("dotenv").config();
const express = require("express");
const changepasswordRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const {
  getAdminById,
  updateAdminPassword,
  verifyCurrentPassword,
  hashNewPassword,
} = require("../../services/admin/changePasswordService");

// Admin Change Password
changepasswordRouter.post("/", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Retrieve admin details using the service
    const admin = await getAdminById(req.admin.admin_id);

    if (!admin) {
      return res.status(400).json({ error: "Admin not found" });
    }

    // Verify the current password
    const passwordMatch = await verifyCurrentPassword(
      currentPassword,
      admin.password
    );
    if (!passwordMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash the new password and update it in the database using the service
    const hashedNewPassword = await hashNewPassword(newPassword);
    await updateAdminPassword(req.admin.admin_id, hashedNewPassword);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = changepasswordRouter;
