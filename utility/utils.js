const calculateCheckoutDate = (reservationDate, duration) => {
  // Convert the reservationDate into a proper Date object if it isn't already
  const checkoutDate = new Date(reservationDate); // Clone the date

  // Debugging logs
  console.log("Original Reservation Date:", reservationDate);
  console.log("Cloned Reservation Date:", checkoutDate);

  // Add the duration in days to the checkoutDate
  checkoutDate.setUTCDate(checkoutDate.getUTCDate() + duration);

  console.log("Checkout Date After Adding Duration:", checkoutDate);

  // Return the resulting date in a readable format
  return checkoutDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
};

const GenerateRoomNumber = (roomNumber, categoryId, hotelId) => {
  return `${roomNumber}${categoryId}${hotelId}`;
};

module.exports = { calculateCheckoutDate, GenerateRoomNumber };
