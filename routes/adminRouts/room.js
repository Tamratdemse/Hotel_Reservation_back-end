require("dotenv").config();
const express = require("express");
const { authenticateToken } = require("../../utility/auth");
const pool = require("../../config/db");
const {
  getAllRooms,
  getRoomDetails,
  addRoom,
  updateRoom,
  deleteRoom,
} = require("../../services/admin/roomService");

const roomsRouter = express.Router();

// Admin Get All Rooms
roomsRouter.get("/", authenticateToken, getAllRooms);

// Admin Get Room Details
roomsRouter.get("/:id", authenticateToken, getRoomDetails);

// Admin Add Room
roomsRouter.post("/", authenticateToken, addRoom);

// Admin Update Room
roomsRouter.put("/:id", authenticateToken, updateRoom);

// Admin Delete Room
roomsRouter.delete("/:id", authenticateToken, deleteRoom);

module.exports = roomsRouter;
