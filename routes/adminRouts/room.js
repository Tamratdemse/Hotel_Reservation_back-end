require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const roomsRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");

// Admin Get All Rooms
roomsRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rooms] = await connection.query(
      `SELECT r.room_id, r.room_number, r.availability, 
                c.category_name, c.price 
         FROM Rooms r
         JOIN Category c ON r.category_id = c.category_id
         WHERE r.hotel_id = ?`,
      [req.admin.hotel_id]
    );

    connection.release();
    res.json(rooms);
  } catch (error) {
    console.error("Error retrieving rooms:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Delete Room
roomsRouter.delete("/deleteroom/:id", authenticateToken, async (req, res) => {
  const roomId = req.params.id;

  try {
    const connection = await pool.getConnection();

    // Check if the room is reserved
    const [reservedRooms] = await connection.query(
      "SELECT COUNT(*) as reserved_count FROM Reservation WHERE room_number = (SELECT room_id FROM Rooms WHERE room_number = ?) AND hotel_id = ?",
      [roomId, req.admin.hotel_id]
    );

    if (reservedRooms[0].reserved_count > 0) {
      connection.release();
      return res.status(400).json({
        error: "Cannot delete room because it is reserved",
      });
    }

    // Delete the room
    await connection.query(
      "DELETE FROM Rooms WHERE room_id = ? AND hotel_id = ?",
      [roomId, req.admin.hotel_id]
    );

    connection.release();
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Add Room
roomsRouter.post("/addroom", authenticateToken, async (req, res) => {
  const { category_id, room_number } = req.body;

  try {
    const connection = await pool.getConnection();

    // Check if the category exists
    const [categories] = await connection.query(
      "SELECT * FROM Category WHERE category_id = ? AND hotel_id = ?",
      [category_id, req.admin.hotel_id]
    );

    if (categories.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Category not found" });
    }

    // Add the room to the Rooms table
    const generateRoomId = function (roomNum, catId, hotId) {
      return String(roomNum) + String(catId) + String(hotId);
    };

    const roomID = generateRoomId(room_number, category_id, req.admin.hotel_id);
    await connection.query(
      "INSERT INTO Rooms (room_id , room_number, category_id, hotel_id, availability) VALUES (?, ?, ?, ?, ?)",
      [roomID, room_number, category_id, req.admin.hotel_id, true]
    );

    connection.release();
    res.status(200).json({ message: "Room added successfully" });
  } catch (error) {
    console.error("Error adding room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = roomsRouter;
