// /services/admin/category.js

const pool = require("../../config/db");
const path = require("path");
const fs = require("fs");

// Fetch all categories for a given hotel
async function getCategories(hotelId) {
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
    const [rows] = await connection.query(query, [hotelId]);
    connection.release();
    return rows;
  } catch (err) {
    console.error("Error fetching categories:", err);
    throw new Error("Internal Server Error");
  }
}

// Add a new category with rooms
async function addCategory({
  category_name,
  price,
  description,
  rooms,
  hotel_id,
  photo,
}) {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

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

    const insertRoomQuery = `
      INSERT INTO rooms (room_id, room_number, category_id, hotel_id, availability)
      VALUES (?, ?, ?, ?, '0')
    `;

    for (const roomNumber of roomNumbers) {
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

    return { message: "Category and rooms added successfully" };
  } catch (err) {
    console.error("Error adding category:", err);
    throw new Error("Internal Server Error");
  }
}

// Update category details and handle photo uploads
async function updateCategory({
  category_id,
  hotel_id,
  category_name,
  price,
  description,
  newPhoto,
}) {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const getCurrentPhotoQuery = `SELECT photo FROM category WHERE category_id = ? AND hotel_id = ?`;
    const [currentPhotoResult] = await connection.query(getCurrentPhotoQuery, [
      category_id,
      hotel_id,
    ]);

    if (currentPhotoResult.length > 0) {
      const currentPhoto = currentPhotoResult[0].photo;
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
        hotel_id,
      ]);

      if (newPhoto && currentPhoto && currentPhoto !== newPhoto) {
        const oldPhotoPath = path.join(
          __dirname,
          "../../uploads/hotel_image",
          currentPhoto
        );
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    }

    await connection.commit();
    connection.release();
    return { message: "Category updated successfully" };
  } catch (err) {
    console.error("Error updating category:", err);
    throw new Error("Internal Server Error");
  }
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
};
