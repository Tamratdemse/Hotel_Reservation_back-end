const pool = require("../../config/db");
const { sendNotificationn } = require("../../utility/notificationSender");
const {
  GenerateRoomNumber,
  calculateCheckoutDate,
} = require("../../utility/utils");

// Get all reservations
async function getAllReservations(req, res) {
  try {
    const connection = await pool.getConnection();

    const [onlineReservations] = await connection.query(
      `SELECT r.*, u.name as user_name, u.email, u.phone_number, u.id_card_photo_front, u.id_card_photo_back
       FROM Reservation r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.hotel_id = ? `,
      [req.admin.hotel_id]
    );

    const [manualReservations] = await connection.query(
      `SELECT mr.*, 'manual' as reservation_type
       FROM manualReservation mr
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
}

// Get reservation details
async function getReservationDetails(req, res) {
  const reservationId = req.params.id;
  try {
    const connection = await pool.getConnection();

    const [reservationDetails] = await connection.query(
      `SELECT r.*, u.name, u.email, u.phone_number, u.id_card_photo_front, u.id_card_photo_back
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
}

// Accept or decline reservation
async function acceptDeclineReservation(req, res) {
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
        "SELECT user_id FROM reservation WHERE reservation_id = ?",
        [reservationId]
      );

      const user = userId[0].user_id;

      await sendNotificationn(
        user,
        "user",
        "Reservation Accepted",
        "Your reservation has been accepted. Proceed to payment."
      );
    } else if (action === "decline") {
      if (!reason) {
        connection.release();
        return res
          .status(400)
          .json({ error: "Reason for decline is required" });
      }

      const [reservation] = await connection.query(
        "SELECT room_number, category_id, hotel_id, user_id FROM Reservation WHERE reservation_id = ?",
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
        const user = reservation[0].user_id;
        await sendNotificationn(
          user,
          "user",
          "Reservation Declined",
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
}

// Extend reservation
async function extendReservation(req, res) {
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
      `SELECT duration, total_price, room_number, hotel_id,reservation_date FROM ${tableName} WHERE reservation_id = ?`,
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
      "SELECT price FROM Category WHERE category_id = (SELECT category_id FROM Rooms WHERE room_number = ? AND hotel_id = ?)",
      [room_number, hotel_id]
    );

    const extendedPrice = Number(roomCategory[0].price) * Number(daysToExtend);
    const newTotalPrice = Number(total_price) + Number(extendedPrice);

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

// Checkout reservation
async function checkoutReservation(req, res) {
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
    const room_id = resv.room_id;

    // Checkout logic
    await connection.query(
      `UPDATE ${
        reservation_type === "online" ? "Reservation" : "ManualReservation"
      }
       SET reservation_status = 'checkedout' WHERE reservation_id = ?`,
      [reservation_id]
    );

    // Mark room as available
    await connection.query(
      `UPDATE Rooms SET availability = 1 WHERE room_id = ?`,
      [room_id]
    );

    connection.release();
    res.status(200).json({
      message: "Checked out successfully",
    });
  } catch (error) {
    console.error("Error checking out:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
  getAllReservations,
  getReservationDetails,
  acceptDeclineReservation,
  extendReservation,
  checkoutReservation,
};
