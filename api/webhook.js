const axios = require("axios");

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID;

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
      const body = req.body;
      console.log(
        "[DEBUG] Incoming POST",
        JSON.stringify(body, null, 2),
        req.headers,
      );

      // Initial verification
      if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
        console.log("[DEBUG] Verification challenge received");
        res.statusCode = 200;
        res.end(req.query["hub.challenge"]);
        return;
      }

      // Handle sending message request (from React app)
      if (
        req.url === "/api/webhook/send-message" ||
        (body.userId && body.message)
      ) {
        const { userId, message } = body;
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

      // Handle Instagram webhook events
      if (body.object === "instagram") {
        for (const entry of body.entry) {
          console.log("[DEBUG] Entry:", JSON.stringify(entry, null, 2));
          for (const messaging of entry.messaging) {
            const senderId = messaging.sender.id;
            const message = messaging.message;
            console.log(
              "[DEBUG] Messaging:",
              JSON.stringify(messaging, null, 2),
            );
            if (message.attachments) {
              console.log(
                "[DEBUG] Attachment message detected from",
                senderId,
                message.attachments,
              );
              const webappUrl = `https://instapoc-lyart.vercel.app?userId=${senderId}`;
              try {
                await sendInstagramTextMessage(
                  senderId,
                  `Please visit this link: ${webappUrl}`,
                );
                console.log(
                  "[DEBUG] Reply with webapp link attempted",
                  senderId,
                );
              } catch (apiErr) {
                console.error(
                  "[DEBUG] Error sending IG DM:",
                  apiErr.response?.data || apiErr.message,
                );
              }
            } else {
              console.log("[DEBUG] Not an attachment message");
            }
          }
        }
        res.statusCode = 200;
        res.end("EVENT_RECEIVED");
        return;
      } else {
        console.log("[DEBUG] Not an Instagram object:", body.object);
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
  return;
};

async function sendInstagramTextMessage(recipientId, text) {
  const url = `https://graph.instagram.com/v21.0/${IG_BUSINESS_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: { text },
  };
  console.log(
    "[DEBUG] Sending IG DM:",
    JSON.stringify({ url, payload }, null, 2),
  );
  try {
    const resp = await axios.post(url, payload, {
      params: { access_token: ACCESS_TOKEN },
    });
    console.log("[DEBUG] IG API response:", resp.data);
    return resp.data;
  } catch (err) {
    if (err.response) {
      console.error("[DEBUG] IG API error:", err.response.data);
    } else {
      console.error("[DEBUG] IG API error:", err.message);
    }
    throw err;
  }
}
