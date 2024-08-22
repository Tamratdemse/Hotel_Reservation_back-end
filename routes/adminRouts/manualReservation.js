require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const manualreservationRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const { calculateCheckoutDate } = require("../../utility/utils");
const pool = require("../../configration/db");

// Admin Manual Reservation
manualreservationRouter.post(
  "/",
  authenticateToken,
  async (req, res) => {
    const { name, phone_number, category_id, duration } = req.body;

    try {
      const connection = await pool.getConnection();

      // Check if the category exists in the hotel
      const [categories] = await connection.query(
        "SELECT * FROM Category WHERE category_id = ? AND hotel_id = ?",
        [category_id, req.admin.hotel_id]
      );

      if (categories.length === 0) {
        connection.release();
        return res
          .status(400)
          .json({ error: "Invalid category ID for this hotel" });
      }

      // Fetch the first available room in the category and hotel
      const [rooms] = await connection.query(
        "SELECT room_number FROM Rooms WHERE category_id = ? AND hotel_id = ? AND availability = 1 LIMIT 1",
        [category_id, req.admin.hotel_id]
      );

      if (rooms.length === 0) {
        connection.release();
        return res
          .status(400)
          .json({ error: "No available rooms in this category" });
      }

      const room_number = rooms[0].room_number;

      // Insert the manual reservation
      const reservationDate = new Date();
      const checkoutDate = calculateCheckoutDate(reservationDate, duration);
      await connection.query(
        "INSERT INTO ManualReservation (name, phone_number, category_id, hotel_id, room_number, duration,reservation_date, checkout_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          phone_number,
          category_id,
          req.admin.hotel_id,
          room_number,
          duration,
          reservationDate,
          checkoutDate,
        ]
      );

      // Mark the room as unavailable
      await connection.query(
        "UPDATE Rooms SET availability = 0 WHERE room_number = ? AND hotel_id = ? AND category_id = ?",
        [room_number, req.admin.hotel_id, category_id]
      );

      connection.release();
      res
        .status(201)
        .json({ message: "Manual reservation created successfully" });
    } catch (error) {
      console.error("Error processing manual reservation:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = manualreservationRouter;