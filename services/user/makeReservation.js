const pool = require("../../config/db");
const {
  calculateCheckoutDate,
  GenerateRoomNumber,
} = require("../../utility/utils");
const { sendNotificationn } = require("../../utility/notificationSender");

const makeReservation = async (req, res) => {
  const { hotel_id, category_id, duration } = req.body;

  try {
    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      "SELECT room_number FROM Rooms WHERE hotel_id = ? AND category_id = ? AND availability = 0 LIMIT 1",
      [hotel_id, category_id]
    );

    if (rooms.length === 0) {
      connection.release();
      return res.status(400).json({ error: "No available rooms" });
    }

    const room_number = rooms[0].room_number;
    const [categories] = await connection.query(
      "SELECT * FROM Category WHERE category_id = ?",
      [category_id]
    );

    if (categories.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const price = categories[0].price;
    const total_price = price * duration;
    const reservation_date = new Date();
    const checkoutDate = calculateCheckoutDate(reservation_date, duration);

    const [result] = await connection.query(
      "INSERT INTO Reservation (user_id, hotel_id, category_id, room_number, reservation_date, duration, total_price, checkout_date, reservation_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')",
      [
        req.user.user_id,
        hotel_id,
        category_id,
        room_number,
        reservation_date,
        duration,
        total_price,
        checkoutDate,
      ]
    );

    const reservationId = result.insertId;
    const roomId = GenerateRoomNumber(room_number, category_id, hotel_id);
    await connection.query(
      "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
      [roomId]
    );
    const [admins] = await connection.query(
      "SELECT Admin_id FROM Admins WHERE hotel_id = ?",
      [hotel_id]
    );
    const admin = admins[0].Admin_id;
    sendNotificationn(
      admin,
      "admin",
      "Reservation Request",
      "You have a new reservation request. Please check the information and accept it."
    );
    res.status(201).json({ message: "Reservation created successfully" });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = makeReservation;
