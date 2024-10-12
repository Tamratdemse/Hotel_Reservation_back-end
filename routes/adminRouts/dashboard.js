require("dotenv").config();
const express = require("express");

const dashboardRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

// Admin Dashboard
dashboardRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Query to get hotel details and rating
    const [hotelDetails] = await connection.query(
      "SELECT hotel_name, rating FROM Hotel WHERE hotel_id = ?",
      [req.admin.hotel_id]
    );
    console.log(hotelDetails);

    // Query to get total rooms, booked rooms, available rooms, and pending reservations
    const [roomStats] = await connection.query(
      `SELECT 
          COUNT(r.room_id) AS total_rooms,
          SUM(CASE WHEN r.availability = 0 THEN 1 ELSE 0 END) AS available_rooms,
          SUM(CASE WHEN r.availability = 1 THEN 1 ELSE 0 END) AS booked_rooms
       FROM Rooms r
       WHERE r.hotel_id = ?`,
      [req.admin.hotel_id]
    );
    console.log(roomStats);

    const [reservations] = await connection.query(
      `SELECT 
          r.reservation_id AS id,
          u.name AS guest_name,
          r.reservation_date AS reservation_date,
          c.category_name AS category
       FROM Reservation r
       JOIN Users u ON r.user_id = u.user_id
       JOIN Category c ON r.category_id = c.category_id
       WHERE r.hotel_id = ? AND r.reservation_status = 'pending'`,
      [req.admin.hotel_id]
    );

    connection.release();
    hotel: hotelDetails[0], // Returning hotel details, including name and rating
      res.json({
        hotel: hotelDetails[0], // Returning hotel details, including name and rating
        stats: {
          averageRating: hotelDetails[0].rating,
          total_rooms: roomStats[0].total_rooms,
          booked_rooms: roomStats[0].booked_rooms,
          available_rooms: roomStats[0].available_rooms,
          pending_reservations_count: reservations.length, // Count of pending reservations
        },
        pending_reservations: reservations, // Returning all pending reservations with required details
      });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = dashboardRouter;
