const { Chapa } = require("chapa-nodejs");

const chapa = new Chapa({ secretKey: process.env.secretKey });

const handlePaymentComplete = async (req, res) => {
  const { tx_ref, status } = req.query;

  try {
    const response = await chapa.verify({ tx_ref });
    res.send(
      `Payment complete! Transaction reference: ${tx_ref}, Status: ${status}, Verification: ${JSON.stringify(
        response.data,
        null,
        2
      )}`
    );
  } catch (error) {
    console.error("Verification Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = handlePaymentComplete;
