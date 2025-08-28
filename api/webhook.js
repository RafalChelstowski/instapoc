const axios = require("axios");
const formidable = require("formidable");
const fs = require("fs");

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID;

const TEST_VIDEO_URL = "https://instapoc-lyart.vercel.app/sample.mp4";

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.statusCode = 200;
      res.end(challenge);
      return;
    }
    res.statusCode = 403;
    res.end();
    return;
  }

  if (req.method === "POST") {
    try {
      if (req.url === "/api/webhook/send-video") {
        console.log("POST /api/webhook/send-video received");

        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("Formidable parse error:", err);
            res.statusCode = 500;
            res.json({ error: "Failed to parse form data" });
            return;
          }

          // Normalize userId to string if it's an array
          let userId = fields.userId;
          if (Array.isArray(userId)) {
            userId = userId[0];
          }

          if (!userId) {
            res.statusCode = 400;
            res.json({ error: "Missing userId" });
            return;
          }

          // For testing, ignore uploaded video and use fixed public URL
          try {
            await sendInstagramVideoMessageWithUrl(userId, TEST_VIDEO_URL);

            res.statusCode = 200;
            res.json({ success: true, videoUrl: TEST_VIDEO_URL });
          } catch (sendErr) {
            console.error("Error sending video message:", sendErr);
            res.statusCode = 500;
            res.json({ error: "Failed to send video message" });
          }
        });

        return;
      }

      // Handle JSON message sending
      const body = req.body;

      if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
        res.statusCode = 200;
        res.end(req.query["hub.challenge"]);
        return;
      }

      if (
        req.url === "/api/webhook/send-message" ||
        (body.userId && body.message)
      ) {
        // Normalize userId to string if it's an array
        let userId = body.userId;
        if (Array.isArray(userId)) {
          userId = userId[0];
        }

        const { message } = body;
        if (!userId || !message) {
          res.statusCode = 400;
          res.json({ error: "Missing userId or message" });
          return;
        }
        try {
          const response = await sendInstagramTextMessage(userId, message);
          res.statusCode = 200;
          res.json({ success: true, data: response });
          return;
        } catch (err) {
          res.statusCode = 500;
          res.json({ error: "Failed to send message" });
          return;
        }
      }

      // Handle Instagram webhook events (existing logic)
      if (body.object === "instagram") {
        for (const entry of body.entry) {
          for (const messaging of entry.messaging) {
            const senderId = messaging.sender.id;
            const message = messaging.message;
            if (
              (message.attachments && message.attachments.length > 0) ||
              (message.text && message.text.toLowerCase().includes("video"))
            ) {
              const webappUrl = `https://instapoc-lyart.vercel.app?userId=${senderId}`;
              try {
                await sendInstagramTextMessage(
                  senderId,
                  `Please visit this link: ${webappUrl}`,
                );
              } catch (apiErr) {
                console.error(
                  "Error sending IG DM:",
                  apiErr.response?.data || apiErr.message,
                );
              }
            }
          }
        }
        res.statusCode = 200;
        res.end("EVENT_RECEIVED");
        return;
      }

      res.statusCode = 200;
      res.end("EVENT_RECEIVED");
      return;
    } catch (error) {
      console.error("Webhook error:", error);
      res.statusCode = 500;
      res.end("ERROR");
      return;
    }
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
};

// Send video message with a public URL
async function sendInstagramVideoMessageWithUrl(recipientId, videoUrl) {
  const url = `https://graph.instagram.com/v21.0/${IG_BUSINESS_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: {
      attachment: {
        type: "video",
        payload: {
          url: videoUrl,
        },
      },
    },
  };
  const resp = await axios.post(url, payload, {
    params: { access_token: ACCESS_TOKEN },
  });
  return resp.data;
}

// Send text message helper (existing)
async function sendInstagramTextMessage(recipientId, text) {
  const url = `https://graph.instagram.com/v21.0/${IG_BUSINESS_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: { text },
  };
  const resp = await axios.post(url, payload, {
    params: { access_token: ACCESS_TOKEN },
  });
  return resp.data;
}
