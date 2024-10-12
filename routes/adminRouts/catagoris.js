require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const categoryRouter = express.Router();
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../configration/db");
const { GenerateRoomNumber } = require("../../utility/utils");
const { log } = require("console");

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "hotel_image/"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

categoryRouter.get("/", authenticateToken, async (req, res) => {
  console.log(req.admin);
  console.log(req.admin.hotel_id);

  try {
    const connection = await pool.getConnection();
    const query = `
      SELECT category.*, 
             COUNT(Rooms.room_id) AS total_rooms,
             SUM(CASE WHEN Rooms.availability = 'Available' THEN 1 ELSE 0 END) AS available_rooms
      FROM category
      LEFT JOIN Rooms ON category.category_id = Rooms.category_id
      WHERE category.hotel_id = ?
      GROUP BY category.category_id;
    `;
    const [rows] = await connection.query(query, [req.admin.hotel_id]);
    connection.release();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Add Category with Image
categoryRouter.post(
  "/addcategory",
  upload.single("photo"),
  authenticateToken,
  async (req, res) => {
    const { category_name, price, description, rooms } = req.body;
    const photo = req.file ? req.file.filename : null;
    const hotel_id = req.admin.hotel_id; // Get the hotel_id from the authenticated admin

    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      // Insert the new category into the category table
      const insertCategoryQuery = `
        INSERT INTO category (category_name, price, hotel_id, description, photo)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [categoryResult] = await connection.query(insertCategoryQuery, [
        category_name,
        price,
        hotel_id,
        description,
        photo,
      ]);

      const categoryId = categoryResult.insertId;
      const roomNumbers = rooms.split(",").map((room) => room.trim());

      // Insert each room into the rooms table with a concatenated primary key
      const insertRoomQuery = `
        INSERT INTO rooms (room_id, room_number, category_id, hotel_id, availability)
        VALUES (?, ?, ?, ?, '0')
      `;

      for (const roomNumber of roomNumbers) {
        // Generate the primary key by concatenating hotel_id, room_number, and category_id
        const roomId = `${hotel_id}-${roomNumber}-${categoryId}`;
        await connection.query(insertRoomQuery, [
          roomId,
          roomNumber,
          categoryId,
          hotel_id,
        ]);
      }

      await connection.commit();
      connection.release();

      res
        .status(201)
        .json({ message: "Category and rooms added successfully" });
    } catch (err) {
      console.error("Error adding category:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

const fs = require("fs");

categoryRouter.put(
  "/update/:category_id",
  upload.single("photo"),
  authenticateToken,
  async (req, res) => {
    const { category_id } = req.params;
    const { category_name, price, description } = req.body;
    const newPhoto = req.file ? req.file.filename : null;

    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      // Fetch the current photo of the category from the database
      const getCurrentPhotoQuery = `
        SELECT photo FROM category
        WHERE category_id = ? AND hotel_id = ?
      `;
      const [currentPhotoResult] = await connection.query(
        getCurrentPhotoQuery,
        [category_id, req.admin.hotel_id]
      );

      if (currentPhotoResult.length > 0) {
        const currentPhoto = currentPhotoResult[0].photo;

        // Update the category details
        const updateCategoryQuery = `
          UPDATE category
          SET category_name = ?, price = ?, description = ?, photo = COALESCE(?, photo)
          WHERE category_id = ? AND hotel_id = ?
        `;
        await connection.query(updateCategoryQuery, [
          category_name,
          price,
          description,
          newPhoto,
          category_id,
          req.admin.hotel_id, // Ensure the category belongs to the hotel of the admin
        ]);

        // If a new photo is uploaded, delete the old one from the server
        if (newPhoto && currentPhoto && currentPhoto !== newPhoto) {
          const oldPhotoPath = path.join(
            __dirname,
            "hotel_image",
            currentPhoto
          ); // Adjust path as needed
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }
      } else {
        // If no current photo found, just update the category details
        const updateCategoryQuery = `
          UPDATE category
          SET category_name = ?, price = ?, description = ?, photo = COALESCE(?, photo)
          WHERE category_id = ? AND hotel_id = ?
        `;
        await connection.query(updateCategoryQuery, [
          category_name,
          price,
          description,
          newPhoto,
          category_id,
          req.admin.hotel_id,
        ]);
      }

      await connection.commit();
      connection.release();
      res.status(200).json({ message: "Category updated successfully" });
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

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
