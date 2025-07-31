const axios = require("axios");

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { userId, message } = req.body;

  if (!userId || !message) {
    res.status(400).json({ error: "Missing userId or message in request body" });
    return;
  }

  try {
    const url = `https://graph.instagram.com/v21.0/${IG_BUSINESS_ID}/messages`;
    const payload = {
      recipient: { id: userId },
      messaging_type: 'RESPONSE',
      message: { text: message },
    };

    const response = await axios.post(url, payload, {
      params: { access_token: ACCESS_TOKEN },
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error sending Instagram message:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send message" });
  }
};
