require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dashboardRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

// Admin Dashboard
dashboardRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [hotelDetails] = await connection.query(
      "SELECT hotel_name, rating , location, photo, subaccount_id FROM Hotel WHERE hotel_id = ?",
      [req.admin.hotel_id]
    );

    const [categories] = await connection.query(
      `SELECT c.category_id, c.category_name, c.price,
                COUNT(r.room_id) AS total_rooms,
                SUM(CASE WHEN r.availability = 1 THEN 1 ELSE 0 END) AS available_rooms
         FROM Category c
         JOIN Rooms r ON c.category_id = r.category_id
         WHERE c.hotel_id = ?
         GROUP BY c.category_id`,
      [req.admin.hotel_id]
    );

    const [reservations] = await connection.query(
      "SELECT * FROM Reservation WHERE hotel_id = ? AND reservation_status = 'pending'",
      [req.admin.hotel_id]
    );

    console.log([req.admin.admin_id]);
    console.log([req.admin.hotel_id]);

    const [notifications] = await connection.query(
      "SELECT * FROM Notifications WHERE admin_id = ?",
      [req.admin.admin_id]
    );

    connection.release();

    res.json({
      hotel: hotelDetails[0],
      categories,
      pending_reservations: reservations,
      notifications,
    });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = dashboardRouter;
