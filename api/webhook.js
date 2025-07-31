const axios = require("axios");
const formidable = require("formidable");
const fs = require("fs");

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

          const userId = fields.userId;
          if (!userId) {
            res.statusCode = 400;
            res.json({ error: "Missing userId" });
            return;
          }

          let videoFile = files.video;
          console.log("Type of files.video:", typeof videoFile);
          console.log("Is files.video an array?", Array.isArray(videoFile));
          console.log("Video file object:", videoFile);

          // If files.video is an array, use the first file object
          if (Array.isArray(videoFile)) {
            videoFile = videoFile[0];
            console.log("Using first video file from array:", videoFile);
          }

          if (!videoFile) {
            res.statusCode = 400;
            res.json({ error: "Missing video file" });
            return;
          }

          try {
            const filePath =
              videoFile.filepath || videoFile.filePath || videoFile.path;
            if (!filePath) {
              throw new Error("Video file path is missing");
            }

            const mediaId = await uploadVideoToInstagram(
              userId,
              filePath,
              videoFile.originalFilename || "video.webm",
            );
            await sendInstagramVideoMessage(userId, mediaId);

            res.statusCode = 200;
            res.json({ success: true });
          } catch (uploadErr) {
            console.error("Error sending video message:", uploadErr);
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
async function uploadVideoToInstagram(recipientId, filePath, filename) {
  const url = `https://graph.facebook.com/v21.0/${IG_BUSINESS_ID}/media`;
  const form = new FormData();
  form.append("recipient", JSON.stringify({ id: recipientId }));
  form.append("media_type", "VIDEO");
  form.append("video_file", fs.createReadStream(filePath), {
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
