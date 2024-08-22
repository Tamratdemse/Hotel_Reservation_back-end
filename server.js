require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cron = require("node-cron");

const { pool } = require("./configration/db");

const users = require("./routes/user");
const admins = require("./routes/admin");
const superadmin = require("./routes/super_admin");
const { sendNotificationn } = require("./utility/notificationSender");

const app = express();
const port = process.env.port;

app.use(bodyParser.json());
app.use(cors());

// Cron job to check for checkout dates every morning at 8:00 AM
cron.schedule("00 08 * * *", async () => {
  console.log("trying cron");

  try {
    const connection = pool.getConnection();

    // Get today's date
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

    if (reservations) {
      for (const reservation of reservations) {
        // Fetch admin_id using hotel_id
        const [admin] = await connection.query(
          "SELECT Admin_id FROM Admins WHERE hotel_id = ?",
          [reservation.hotel_id]
        );

        const [user] = reservations.user_id;

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
    if (manualReservations) {
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
app.use("/user", users);
app.use("/admin", admins);
app.use("/superadmin", superadmin);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
