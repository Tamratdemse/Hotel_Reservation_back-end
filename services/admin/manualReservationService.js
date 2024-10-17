// File: service/manualReservationService.js

const pool = require("../../config/db");

// Check if the category exists in the hotel
async function checkCategoryExists(categoryId, hotelId) {
  const connection = await pool.getConnection();
  const [categories] = await connection.query(
    "SELECT * FROM Category WHERE category_id = ? AND hotel_id = ?",
    [categoryId, hotelId]
  );
  connection.release();
  return categories.length > 0; // Return true if category exists
}

// Fetch the first available room in the category and hotel
async function getAvailableRoom(categoryId, hotelId) {
  const connection = await pool.getConnection();
  const [rooms] = await connection.query(
    "SELECT room_number FROM Rooms WHERE category_id = ? AND hotel_id = ? AND availability = 0 LIMIT 1",
    [categoryId, hotelId]
  );
  connection.release();
  return rooms[0]; // Return the first available room
}

// Create a manual reservation
async function createManualReservation(
  name,
  phoneNumber,
  categoryId,
  hotelId,
  roomNumber,
  duration,
  reservationDate,
  checkoutDate
) {
  const connection = await pool.getConnection();
  await connection.query(
    "INSERT INTO ManualReservation (user_name, phone_number, category_id, hotel_id, room_number, duration, reservation_date, checkout_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      name,
      phoneNumber,
      categoryId,
      hotelId,
      roomNumber,
      duration,
      reservationDate,
      checkoutDate,
    ]
  );
  connection.release();
}

// Mark the room as unavailable
async function markRoomAsUnavailable(roomNumber, hotelId, categoryId) {
  const connection = await pool.getConnection();
  await connection.query(
    "UPDATE Rooms SET availability = 1 WHERE room_number = ? AND hotel_id = ? AND category_id = ?",
    [roomNumber, hotelId, categoryId]
  );
  connection.release();
}

module.exports = {
  checkCategoryExists,
  getAvailableRoom,
  createManualReservation,
  markRoomAsUnavailable,
};
