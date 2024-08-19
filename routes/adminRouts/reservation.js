require("dotenv").config();
const express = require("express");
const reservationRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");
const { sendNotificationn } = require("../../utility/notification");
const { GenerateRoomNumber } = require("../../utility/utils");

// Admin Get All Reservations
reservationRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [onlineReservations] = await connection.query(
      `SELECT r.*, u.name as user_name, u.email, u.phone_number, u.id_card_photo_front, u.id_card_photo_back
         FROM Reservation r
         JOIN users u ON r.user_id = u.user_id
         WHERE r.hotel_id = ?`,
      [req.admin.hotel_id]
    );

    const [manualReservations] = await connection.query(
      `SELECT mr.*, 'manual' as reservation_type
         FROM ManualReservation mr
         WHERE mr.hotel_id = ?`,
      [req.admin.hotel_id]
    );

    const categorizedReservations = {
      online_reservations: {
        pending: onlineReservations.filter(
          (r) => r.reservation_status === "pending"
        ),
        accepted: onlineReservations.filter(
          (r) => r.reservation_status === "accepted"
        ),
        checkedout: onlineReservations.filter(
          (r) => r.reservation_status === "checkedout"
        ),
      },
      manual_reservations: {
        accepted: manualReservations.filter(
          (r) => r.reservation_status === "accepted"
        ),
        checkedout: manualReservations.filter(
          (r) => r.reservation_status === "checkedout"
        ),
      },
    };

    connection.release();
    res.json(categorizedReservations);
  } catch (error) {
    console.error("Error retrieving reservations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Reservation Details
reservationRouter.get("/:id", authenticateToken, async (req, res) => {
  const reservationId = req.params.id;

  try {
    const connection = await pool.getConnection();

    const [reservationDetails] = await connection.query(
      `SELECT r.*, u.name, u.email, u.phone_number , u.id_card_photo_front  , u.id_card_photo_back 
         FROM Reservation r
         JOIN users u ON r.user_id = u.user_id
         WHERE r.reservation_id = ?`,
      [reservationId]
    );

    connection.release();
    res.json(reservationDetails[0]);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Accept/Decline Reservation
reservationRouter.post("/:id/action", authenticateToken, async (req, res) => {
  const reservationId = req.params.id;
  const { action, reason } = req.body;

  try {
    const connection = await pool.getConnection();

    if (action === "accept") {
      await connection.query(
        "UPDATE Reservation SET reservation_status = 'accepted' WHERE reservation_id = ?",
        [reservationId]
      );

      const [userId] = await connection.query(
        "SELECT user_id FROM reservation reservation_id = ? ",
        [reservationId]
      );

      const [user] = await connection.query(
        "SELECT email FROM users  WHERE user_id = ?",
        [userId]
      );

      sendNotificationn(
        user,
        "Reservatiion Accepted",
        "Your reservation has been accepted proceed to payment"
      );

      // Schedule payment status check after 30 minutes
      setTimeout(async () => {
        const [reservation] = await connection.query(
          "SELECT payment_status, room_number, category_id, hotel_id,user_id FROM Reservation WHERE reservation_id = ?",
          [reservationId]
        );

        if (
          reservation.length > 0 &&
          reservation[0].payment_status === "unpaid"
        ) {
          const roomId = GenerateRoomNumber(
            reservation[0].room_number,
            reservation[0].category_id,
            reservation[0].hotel_id
          );

          // Delete the reservation
          await connection.query(
            "DELETE FROM Reservation WHERE reservation_id = ?",
            [reservationId]
          );

          // Free the reserved room
          await connection.query(
            "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
            [roomId]
          );

          // Notify the user that their reservation was deleted
          const [user] = await connection.query(
            "SELECT email FROM users WHERE user_id = ?",
            [reservation[0].user_id]
          );
          sendNotificationn(
            user,
            "RESERVATION DECLINE",
            "Your reservatYion was deleted because payment was not made on time"
          );
        }
      }, 30 * 60 * 1000); // 30 minutes in milliseconds
    } else if (action === "decline") {
      if (!reason) {
        connection.release();
        return res
          .status(400)
          .json({ error: "Reason for decline is required" });
      }

      const [reservation] = await connection.query(
        "SELECT room_number, category_id, hotel_id,user_id FROM Reservation WHERE reservation_id = ?",
        [reservationId]
      );

      if (reservation.length > 0) {
        const roomId = GenerateRoomNumber(
          reservation[0].room_number,
          reservation[0].category_id,
          reservation[0].hotel_id
        );

        // Delete the reservation
        await connection.query(
          "DELETE FROM Reservation WHERE reservation_id = ?",
          [reservationId]
        );
        // Free the reserved room
        await connection.query(
          "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
          [roomId]
        );

        // Notify the user that their reservation was declined

        const [user] = await connection.query(
          "SELECT email FROM users  WHERE user_id = ?",
          [reservation[0].user_id]
        );
        sendNotificationn(
          user,
          "Reservation Decline",
          `Your reservation was declined: ${reason}`
        );
      }
    }
    connection.release();
    res.status(200).json({ message: `Reservation ${action}ed successfully` });
  } catch (error) {
    console.error("Error processing reservation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//Admin Extend Reservation
reservationRouter.post(
  "/extendreservation",
  authenticateToken,
  async (req, res) => {
    const { daysToExtend, reservationId, reservationType } = req.body;

    if (!daysToExtend || !reservationId || !reservationType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const connection = await pool.getConnection();

      // Determine which reservation table to query based on reservation type
      let tableName = "";
      if (reservationType === "online") {
        tableName = "reservation";
      } else if (reservationType === "manual") {
        tableName = "manualreservation";
      } else {
        connection.release();
        return res.status(400).json({ error: "Invalid reservation type" });
      }

      // Get the current reservation details
      const [reservation] = await connection.query(
        `SELECT duration, total_price, room_number, hotel_id FROM ${tableName} WHERE reservation_id = ?`,
        [reservationId]
      );

      if (reservation.length === 0) {
        connection.release();
        return res.status(404).json({ error: "Reservation not found" });
      }

      const { duration, total_price, room_number, hotel_id } = reservation[0];

      // Calculate new duration and checkout date
      const newDuration = duration + daysToExtend;
      const checkoutDate = calculateCheckoutDate(
        reservation[0].reservation_date,
        newDuration
      );

      // Calculate price for the extended days
      const [roomCategory] = await connection.query(
        "SELECT category_price FROM Categories WHERE category_id = (SELECT category_id FROM Rooms WHERE room_number = ? AND hotel_id = ?)",
        [room_number, hotel_id]
      );

      const extendedPrice = roomCategory[0].category_price * daysToExtend;
      const newTotalPrice = total_price + extendedPrice;

      // Update the reservation with new values
      await connection.query(
        `UPDATE ${tableName} SET duration = ?, total_price = ?, checkout_date = ? WHERE reservation_id = ?`,
        [newDuration, newTotalPrice, checkoutDate, reservationId]
      );

      connection.release();
      res.status(200).json({
        message: "Reservation extended successfully",
        newDuration,
        newTotalPrice,
        checkoutDate,
      });
    } catch (error) {
      console.error("Error extending reservation:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Admin Checkout Reservation
reservationRouter.post("/checkout", authenticateToken, async (req, res) => {
  const { reservation_id, reservation_type } = req.body;

  if (
    !reservation_type ||
    (reservation_type !== "online" && reservation_type !== "manual")
  ) {
    return res.status(400).json({
      error:
        "Invalid or missing reservation_type. It must be 'online' or 'manual'.",
    });
  }

  try {
    const connection = await pool.getConnection();

    let reservationQuery = "";
    if (reservation_type === "online") {
      reservationQuery = `SELECT r.*, 'online' as reservation_type
                            FROM Reservation r
                            WHERE r.reservation_id = ?`;
    } else if (reservation_type === "manual") {
      reservationQuery = `SELECT mr.*, 'manual' as reservation_type
                            FROM ManualReservation mr
                            WHERE mr.reservation_id = ?`;
    }

    const [reservation] = await connection.query(reservationQuery, [
      reservation_id,
    ]);

    if (!reservation.length) {
      connection.release();
      return res.status(404).json({ error: "Reservation not found" });
    }

    const resv = reservation[0];
    const room_id = GenerateRoomNumber(
      resv.room_number,
      resv.cat_id,
      resv.hotel_id
    );
    if (reservation_type === "online") {
      // Update the reservation status to checked out
      await connection.query(
        "UPDATE Reservation SET reservation_status = 'checkedout' WHERE reservation_id = ?",
        [reservation_id]
      );

      // Free the room by setting the room as available
      await connection.query(
        "UPDATE Rooms SET status = 'available' WHERE room_id = ?",
        [room_id]
      );

      // Send notification to the user

      const [user] = await connection.query(
        "SELECT email FROM users WHERE user_id = ?",
        [resv.user_id]
      );
      sendNotificationn(
        user,
        "Reservation Checked Out",
        req.admin.admin_id,
        "Your reservation has been checked out. We hope you enjoyed your stay! Please rate our service."
      );
    } else if (reservation_type === "manual") {
      // Update the manual reservation status to checked out
      await connection.query(
        "UPDATE ManualReservation SET reservation_status = 'checkedout' WHERE reservation_id = ?",
        [reservation_id]
      );

      // Free the room by setting the room as available
      await connection.query(
        "UPDATE Rooms SET status = 'available' WHERE room_id = ?",
        [room_id]
      );
    }

    connection.release();
    res
      .status(200)
      .json({ message: "Reservation checked out and room freed successfully" });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = reservationRouter;