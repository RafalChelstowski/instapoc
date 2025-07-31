const axios = require("axios");
const Busboy = require("busboy");
const FormData = require("form-data");

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
      // Handle multipart/form-data for video upload
      if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
        const busboy = new Busboy({ headers: req.headers });
        let userId = null;
        let videoBuffer = null;
        let videoFilename = null;

        busboy.on("field", (fieldname, val) => {
          if (fieldname === "userId") {
            userId = val;
          }
        });

        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
          if (fieldname === "video") {
            videoFilename = filename;
            const chunks = [];
            file.on("data", (data) => {
              chunks.push(data);
            });
            file.on("end", () => {
              videoBuffer = Buffer.concat(chunks);
            });
          } else {
            file.resume();
          }
        });

        busboy.on("finish", async () => {
          if (!userId || !videoBuffer) {
            res.statusCode = 400;
            res.json({ error: "Missing userId or video file" });
            return;
          }
          try {
            const mediaId = await uploadVideoToInstagram(
              userId,
              videoBuffer,
              videoFilename,
            );
            await sendInstagramVideoMessage(userId, mediaId);
            res.statusCode = 200;
            res.json({ success: true });
          } catch (err) {
            console.error("Error sending video message:", err);
            res.statusCode = 500;
            res.json({ error: "Failed to send video message" });
          }
        });

        req.pipe(busboy);
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

// Upload video to Instagram media endpoint
async function uploadVideoToInstagram(recipientId, videoBuffer, filename) {
  const url = `https://graph.facebook.com/v21.0/${IG_BUSINESS_ID}/media`;

  const form = new FormData();
  form.append("recipient", JSON.stringify({ id: recipientId }));
  form.append("media_type", "VIDEO");
  form.append("video_file", videoBuffer, {
    filename,
    contentType: "video/webm",
  });
  form.append("access_token", ACCESS_TOKEN);

  const headers = form.getHeaders();

  const response = await axios.post(url, form, { headers });
  if (!response.data.id) {
    throw new Error("Failed to upload video media");
  }
  return response.data.id;
}

// Send video message with media ID
async function sendInstagramVideoMessage(recipientId, mediaId) {
  const url = `https://graph.facebook.com/v21.0/${IG_BUSINESS_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: {
      attachment: {
        type: "video",
        payload: {
          id: mediaId,
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
