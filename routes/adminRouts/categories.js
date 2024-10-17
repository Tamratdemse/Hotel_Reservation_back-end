// /routes/adminRoutes/categories.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const { authenticateToken } = require("../../utility/auth");
const categoryService = require("../../services/admin/category");

const categoryRouter = express.Router();

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/hotel_image/"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Get all categories
categoryRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const categories = await categoryService.getCategories(req.admin.hotel_id);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new category with rooms
categoryRouter.post(
  "/addcategory",
  upload.single("photo"),
  authenticateToken,
  async (req, res) => {
    const { category_name, price, description, rooms } = req.body;
    const photo = req.file ? req.file.filename : null;

    try {
      const result = await categoryService.addCategory({
        category_name,
        price,
        description,
        rooms,
        hotel_id: req.admin.hotel_id,
        photo,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update category
categoryRouter.put(
  "/update/:category_id",
  upload.single("photo"),
  authenticateToken,
  async (req, res) => {
    const { category_id } = req.params;
    const { category_name, price, description } = req.body;
    const newPhoto = req.file ? req.file.filename : null;

    try {
      const result = await categoryService.updateCategory({
        category_id,
        hotel_id: req.admin.hotel_id,
        category_name,
        price,
        description,
        newPhoto,
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = categoryRouter;
