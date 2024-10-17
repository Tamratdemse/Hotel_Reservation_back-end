require("dotenv").config();
const express = require("express");
const reservationRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../config/db");
const { sendNotificationn } = require("../../utility/notificationSender");
const {
  GenerateRoomNumber,
  calculateCheckoutDate,
} = require("../../utility/utils");

// Service functions (You can place them in a separate file)
const {
  getAllReservations,
  getReservationDetails,
  acceptDeclineReservation,
  extendReservation,
  checkoutReservation,
} = require("../../services/admin/reservationService");

// Admin Get All Reservations
reservationRouter.get("/", authenticateToken, getAllReservations);

// Admin Reservation Details
reservationRouter.get("/:id", authenticateToken, getReservationDetails);

// Admin Accept/Decline Reservation
reservationRouter.post(
  "/:id/action",
  authenticateToken,
  acceptDeclineReservation
);

// Admin Extend Reservation
reservationRouter.post(
  "/extendreservation",
  authenticateToken,
  extendReservation
);

// Admin Checkout Reservation
reservationRouter.post("/checkout", authenticateToken, checkoutReservation);

module.exports = reservationRouter;
