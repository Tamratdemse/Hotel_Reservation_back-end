// File: routes/manualReservation.js

require("dotenv").config();
const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const {
  checkCategoryExists,
  getAvailableRoom,
  createManualReservation,
  markRoomAsUnavailable,
} = require("../../services/admin/manualReservationService");
const { calculateCheckoutDate } = require("../../utility/utils");

const manualreservationRouter = express.Router();

// Admin Manual Reservation
manualreservationRouter.post("/", authenticateToken, async (req, res) => {
  const { name, phone_number, category_id, duration } = req.body;

  try {
    // Check if the category exists in the hotel
    const categoryExists = await checkCategoryExists(
      category_id,
      req.admin.hotel_id
    );
    if (!categoryExists) {
      return res
        .status(400)
        .json({ error: "Invalid category ID for this hotel" });
    }

    // Fetch the first available room in the category and hotel
    const room = await getAvailableRoom(category_id, req.admin.hotel_id);
    if (!room) {
      return res
        .status(400)
        .json({ error: "No available rooms in this category" });
    }

    const room_number = room.room_number;

    // Insert the manual reservation
    const reservationDate = new Date();
    const checkoutDate = calculateCheckoutDate(reservationDate, duration);
    await createManualReservation(
      name,
      phone_number,
      category_id,
      req.admin.hotel_id,
      room_number,
      duration,
      reservationDate,
      checkoutDate
    );

    // Mark the room as unavailable
    await markRoomAsUnavailable(room_number, req.admin.hotel_id, category_id);

    res
      .status(201)
      .json({ message: "Manual reservation created successfully" });
  } catch (error) {
    console.error("Error processing manual reservation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = manualreservationRouter;
