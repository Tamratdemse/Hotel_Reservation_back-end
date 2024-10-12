require("dotenv").config();
const express = require("express");

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

module.exports = roomsRouter;
