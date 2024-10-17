// File: service/dashboardService.js

const pool = require("../../config/db");

async function getHotelDetails(hotelId) {
  const connection = await pool.getConnection();
  const [hotelDetails] = await connection.query(
    "SELECT hotel_name, rating FROM Hotel WHERE hotel_id = ?",
    [hotelId]
  );
  connection.release();
  return hotelDetails[0];
}

async function getRoomStats(hotelId) {
  const connection = await pool.getConnection();
  const [roomStats] = await connection.query(
    `SELECT 
        COUNT(r.room_id) AS total_rooms,
        SUM(CASE WHEN r.availability = 0 THEN 1 ELSE 0 END) AS available_rooms,
        SUM(CASE WHEN r.availability = 1 THEN 1 ELSE 0 END) AS booked_rooms
     FROM Rooms r
     WHERE r.hotel_id = ?`,
    [hotelId]
  );
  connection.release();
  return roomStats[0];
}

async function getPendingReservations(hotelId) {
  const connection = await pool.getConnection();
  const [reservations] = await connection.query(
    `SELECT 
        r.reservation_id AS id,
        u.name AS guest_name,
        r.reservation_date AS reservation_date,
        c.category_name AS category
     FROM Reservation r
     JOIN Users u ON r.user_id = u.user_id
     JOIN Category c ON r.category_id = c.category_id
     WHERE r.hotel_id = ? AND r.reservation_status = 'pending'`,
    [hotelId]
  );
  connection.release();
  return reservations;
}

module.exports = {
  getHotelDetails,
  getRoomStats,
  getPendingReservations,
};
