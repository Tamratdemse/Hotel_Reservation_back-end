//utility functions
const calculateCheckoutDate = (reservationDate, duration) => {
  const checkoutDate = new Date(reservationDate);
  checkoutDate.setDate(checkoutDate.getDate() + duration);
  return checkoutDate;
};

const GenerateRoomNumber = (roomNumber, categoryId, hotelId) => {
  return `${roomNumber}${categoryId}${hotelId}`;
};
module.exports = { calculateCheckoutDate, GenerateRoomNumber };