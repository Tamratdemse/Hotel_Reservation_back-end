const { Chapa } = require("chapa-nodejs");
const pool = require("../../config/db");

const chapa = new Chapa({ secretKey: process.env.secretKey });

const initializePayment = async (req, res) => {
  const first_name = req.user.name;
  const { total_price, hotel_id } = req.query;

  try {
    const connection = await pool.getConnection();
    const [hotel] = await connection.query(
      "SELECT subaccount_id FROM hotel WHERE hotel_id = ?",
      [hotel_id]
    );
    connection.release();

    if (hotel.length === 0) {
      return res
        .status(404)
        .json({ error: "Hotel not found or no subaccount_id associated." });
    }

    const subaccount_id = hotel[0].subaccount_id;
    const tx_ref = await chapa.generateTransactionReference();

    const payload = {
      amount: total_price,
      currency: "ETB",
      email: "",
      first_name: first_name,
      last_name: "",
      tx_ref: tx_ref,
      callback_url: "http://www.google.com",
      return_url: "http://www.chelsea.com",
      customization: {
        title: "Test Title",
        description: "Test Description",
      },
      subaccounts: {
        id: subaccount_id,
      },
    };

    const options = {
      method: "POST",
      url: "https://api.chapa.co/v1/transaction/initialize",
      headers: {
        Authorization: `Bearer ${process.env.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    request(options, (error, response) => {
      if (error) {
        console.error("Request Error:", error.message);
        return res.status(500).json({ error: error.message });
      }

      const data = JSON.parse(response.body);
      if (data.status === "failed" || !data.data || !data.data.checkout_url) {
        return res.status(400).json({
          error: data.message?.["subaccounts.id"]
            ? data.message["subaccounts.id"][0]
            : "Failed to initialize transaction.",
          response: data,
        });
      }

      res.status(200).json({ checkout_url: data.data.checkout_url });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
};

module.exports = initializePayment;
