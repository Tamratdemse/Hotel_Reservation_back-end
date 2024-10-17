// File: routes/dashboard.js

require("dotenv").config();
const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const {
  getHotelDetails,
  getRoomStats,
  getPendingReservations,
} = require("../../services/admin/dashboardService");

const dashboardRouter = express.Router();

// Admin Dashboard
dashboardRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const hotelId = req.admin.hotel_id;

    const hotelDetails = await getHotelDetails(hotelId);
    const roomStats = await getRoomStats(hotelId);
    const reservations = await getPendingReservations(hotelId);

    res.json({
      hotel: hotelDetails, // Returning hotel details, including name and rating
      stats: {
        averageRating: hotelDetails.rating,
        total_rooms: roomStats.total_rooms,
        booked_rooms: roomStats.booked_rooms,
        available_rooms: roomStats.available_rooms,
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
