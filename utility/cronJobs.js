const cron = require("node-cron");
const pool = require("../configration/db");
const { sendNotificationn } = require("./notificationSender");
const { GenerateRoomNumber } = require("./utils");

const scheduleCronJobs = () => {
  // Cron job to check for reservations pending for more than 30 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("Running cron job to check pending reservations...");
    try {
      // Properly await the connection object
      const connection = await pool.getConnection();

      // 1. Check for reservations pending for more than 30 minutes
      const [pendingReservations] = await connection.query(
        "SELECT reservation_id, room_number, category_id, hotel_id, user_id FROM Reservation WHERE reservation_status = 'pending' AND TIMESTAMPDIFF(MINUTE, reservation_date, NOW()) > 30"
      );

      for (const reservation of pendingReservations) {
        const roomId = GenerateRoomNumber(
          reservation.room_number,
          reservation.category_id,
          reservation.hotel_id
        );

        // Delete the pending reservation
        await connection.query(
          "DELETE FROM Reservation WHERE reservation_id = ?",
          [reservation.reservation_id]
        );

        // Free the reserved room
        await connection.query(
          "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
          [roomId]
        );

        // Notify the user that their reservation was deleted
        sendNotificationn(
          reservation.user_id,
          "user",
          "Reservation Declined",
          "Your reservation was deleted because it was not accepted within 30 minutes."
        );
      }

      // 2. Check for accepted reservations with unpaid status after 30 minutes
      const [unpaidReservations] = await connection.query(
        "SELECT reservation_id, room_number, category_id, hotel_id, user_id FROM Reservation WHERE reservation_status = 'accepted' AND payment_status = 'unpaid' AND TIMESTAMPDIFF(MINUTE, reservation_date, NOW()) > 30"
      );

      for (const reservation of unpaidReservations) {
        const roomId = GenerateRoomNumber(
          reservation.room_number,
          reservation.category_id,
          reservation.hotel_id
        );

        // Delete the unpaid reservation
        await connection.query(
          "DELETE FROM Reservation WHERE reservation_id = ?",
          [reservation.reservation_id]
        );

        // Free the reserved room
        await connection.query(
          "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
          [roomId]
        );

        // Notify the user that their reservation was deleted due to unpaid status
        sendNotificationn(
          reservation.user_id,
          "user",
          "Reservation Declined",
          "Your reservation was deleted because payment was not made on time."
        );
      }

      connection.release();
    } catch (error) {
      console.error("Error running cron job:", error);
    }
  });

  // Cron job to check for checkout dates every morning at 8:00 AM
  cron.schedule("00 08 * * *", async () => {
    console.log("Running cron job to check checkout dates...");

    try {
      const connection = await pool.getConnection();

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight to compare only the date part

      // Fetch reservations where today is the checkout date
      const [reservations] = await connection.query(
        "SELECT reservation_id, checkout_date, hotel_id, user_id FROM Reservation WHERE checkout_date = ?",
        [today]
      );

      const [manualReservations] = await connection.query(
        "SELECT manual_reservation_id, hotel_id FROM manualreservation WHERE checkout_date = ?",
        [today]
      );

      if (reservations.length) {
        for (const reservation of reservations) {
          // Fetch admin_id using hotel_id
          const [admin] = await connection.query(
            "SELECT Admin_id FROM Admins WHERE hotel_id = ?",
            [reservation.hotel_id]
          );

          const user = reservation.user_id;

          sendNotificationn(
            admin[0].Admin_id,
            "admin",
            "Checkout Day",
            `Today is the checkout day for reservation ID ${reservation.reservation_id}`
          );
          sendNotificationn(
            user,
            "user",
            "Checkout Day",
            "Today is your checkout day. Please rate our service!"
          );
        }
      }

      if (manualReservations.length) {
        for (const manualReservation of manualReservations) {
          const [admin] = await connection.query(
            "SELECT Admin_id FROM Admins WHERE hotel_id = ?",
            [manualReservation.hotel_id]
          );

          sendNotificationn(
            admin[0].Admin_id,
            "admin",
            "Checkout Day",
            `Today is the checkout day for reservation ID ${manualReservation.manual_reservation_id}`
          );
        }
      }

      connection.release();
    } catch (error) {
      console.error("Error checking checkout dates:", error);
    }
  });
};

module.exports = scheduleCronJobs;
