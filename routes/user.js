const express = require("express");
const router = express.Router();
const uploadImage = require("../utility/uploadImage");
const { userAuthenticate } = require("../utility/auth");

const getCountsService = require("../services/user/getCounts");
const getAllHotelsService = require("../services/user/getAllHotels");
const getCategoriesByHotelIdService = require("../services/user/getCategoriesByHotelId");
const registerUserService = require("../services/user/registerUser");
const loginUserService = require("../services/user/loginUser");
const getAccountDataService = require("../services/user/getAccountData");
const updateAccountService = require("../services/user/updateAccount");
const rateHotelService = require("../services/user/rateHotel");
const makeReservationService = require("../services/user/makeReservation");
const getUserStatusService = require("../services/user/getUserStatus");
const getTopHotelsService = require("../services/user/getTopHotels");
const getNotificationsService = require("../services/user/getNotifications");
const initializePaymentService = require("../services/user/initializePayment");
const handlePaymentCompleteService = require("../services/user/handlePaymentComplete");
const handleCallbackService = require("../services/user/handleCallback");

// Get counts of users, hotels, and rooms
router.get("/", getCountsService);

// Get all hotels
router.get("/hotel", getAllHotelsService);

// Get categories by hotel ID
router.get("/hotel/:id", getCategoriesByHotelIdService);

// Register a new user with ID card images
router.post(
  "/register",
  uploadImage.fields([
    { name: "id_card_front", maxCount: 1 },
    { name: "id_card_back", maxCount: 1 },
  ]),
  registerUserService
);

// Login existing user
router.post("/login", loginUserService);

// Get user account data, authentication required
router.get("/account_data", userAuthenticate, getAccountDataService);

// Update user account information, authentication required
router.put(
  "/account_update",
  userAuthenticate,
  uploadImage.fields([
    { name: "id_card_front", maxCount: 1 },
    { name: "id_card_back", maxCount: 1 },
  ]),
  updateAccountService
);

// Rate a hotel, authentication required
router.post("/rate-hotel", userAuthenticate, rateHotelService);

// Make a reservation, authentication required
router.post("/reservation", userAuthenticate, makeReservationService);

// Get user reservation status, authentication required
router.get("/status", userAuthenticate, getUserStatusService);

// Get top-rated hotels
router.get("/top-hotels", getTopHotelsService);

// Get user notifications, authentication required
router.get("/notification", userAuthenticate, getNotificationsService);

// Initialize payment process, authentication required
router.get("/initialize", userAuthenticate, initializePaymentService);

// Handle payment completion
router.get("/payment-complete", handlePaymentCompleteService);

// Handle payment callback
router.get("/callback", handleCallbackService);

module.exports = router;
