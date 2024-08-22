require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const categoryRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");
const { GenerateRoomNumber } = require("../../utility/utils");

//Admin Get All categories
categoryRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [categories] = await connection.query(
      "SELECT * FROM Category WHERE hotel_id = ?",
      [req.admin.hotel_id]
    );

    connection.release();
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Add Category
categoryRouter.post("/addcategory", authenticateToken, async (req, res) => {
  const { name, price, description, rooms } = req.body;

  try {
    const connection = await pool.getConnection();

    // Insert the new category into the Category table
    const [categoryResult] = await connection.query(
      "INSERT INTO Category (category_name, price,description, hotel_id) VALUES (?, ?,?, ?)",
      [name, price, description, req.admin.hotel_id]
    );

    const categoryId = categoryResult.insertId;

    // Insert rooms into the Rooms table

    const roomValues = rooms.map((roomNumber) => [
      (roomId = GenerateRoomNumber(roomNumber, categoryId, req.admin.hotel_id)),
      roomNumber,
      categoryId,
      req.admin.hotel_id,
      1,
    ]);

    await connection.query(
      "INSERT INTO Rooms (room_id ,room_number, category_id, hotel_id, availability) VALUES ?",
      [roomValues]
    );

    connection.release();
    res.status(200).json({ message: "Category and rooms added successfully" });
  } catch (error) {
    console.error("Error adding category and rooms:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Delete Category
categoryRouter.delete(
  "/deletecategory/:id",
  authenticateToken,
  async (req, res) => {
    const categoryId = req.params.id;

    try {
      const connection = await pool.getConnection();

      // Check if any rooms in this category are reserved
      const [reservedRooms] = await connection.query(
        "SELECT COUNT(*) as reserved_count FROM Reservation WHERE category_id = ? AND hotel_id = ?",
        [categoryId, req.admin.hotel_id]
      );

      if (reservedRooms[0].reserved_count > 0) {
        connection.release();
        return res.status(400).json({
          error:
            "Cannot delete category because some rooms in this category are reserved",
        });
      }

      // Delete rooms in this category
      await connection.query(
        "DELETE FROM Rooms WHERE category_id = ? AND hotel_id = ?",
        [categoryId, req.admin.hotel_id]
      );

      // Delete the category
      await connection.query(
        "DELETE FROM Category WHERE category_id = ? AND hotel_id = ?",
        [categoryId, req.admin.hotel_id]
      );

      connection.release();
      res
        .status(200)
        .json({ message: "Category and its rooms deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = categoryRouter;
