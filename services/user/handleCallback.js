const handleCallback = (req, res) => {
  const { tx_ref, status } = req.query;
  res.status(200).send("OK");
};

module.exports = handleCallback;
