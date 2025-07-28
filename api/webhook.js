const axios = require("axios");
const fs = require("fs");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const SERVER_URL = process.env.SERVER_URL;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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
      console.log("[DEBUG] Incoming POST", JSON.stringify(body, null, 2), req.headers);
      // Initial verification
      if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
        console.log("[DEBUG] Verification challenge received");
        res.statusCode = 200;
        res.end(req.query["hub.challenge"]);
        return;
      }
      if (body.object === "instagram") {
        for (const entry of body.entry) {
          console.log('[DEBUG] Entry:', JSON.stringify(entry, null, 2));
          for (const messaging of entry.messaging) {
            const senderId = messaging.sender.id;
            const message = messaging.message;
            console.log('[DEBUG] Messaging:', JSON.stringify(messaging, null, 2));
            if (message.attachments) {
              console.log('[DEBUG] Attachment message detected from', senderId, message.attachments);
              try {
                await sendInstagramTextMessage(senderId, "Media received. Thank you!");
                console.log('[DEBUG] Reply attempted', senderId);
              } catch (apiErr) {
                console.error('[DEBUG] Error sending IG DM:', apiErr.response?.data || apiErr.message);
              }
            } else {
              console.log("[DEBUG] Not an attachment message");
            }
          }
        }
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

// Instagram Messaging API: Reply to Instagram DM
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID;

async function sendInstagramTextMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v19.0/${IG_BUSINESS_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text },
  };
  await axios.post(url, payload, {
    params: { access_token: ACCESS_TOKEN },
  });
  console.log(`IG DM sent to ${recipientId}`);
}


async function downloadVideo(videoUrl, messageId) {
  const response = await axios({
    url: videoUrl,
    method: "GET",
    responseType: "stream",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const baseDir = "/tmp/videos";
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  const videoPath = `${baseDir}/original_${messageId}.mp4`;
  const writer = fs.createWriteStream(videoPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(videoPath));
    writer.on("error", reject);
  });
}

async function processVideo(inputPath, messageId) {
  const outputPath = `/tmp/videos/processed_${messageId}.mp4`;
  const watermarkText = "Processed by YourCompany";
  const ffmpegCommand = `ffmpeg -i ${inputPath} -vf \"drawtext=text='${watermarkText}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2\" -c:a copy ${outputPath}`;
  await exec(ffmpegCommand);
  return outputPath;
}

async function uploadProcessedVideo(videoPath) {
  // In Vercel, it's best to upload to S3/GCS/etc. Here, return a placeholder
  // You must upload to storage that persists after function execution!
  return `${SERVER_URL}/videos/${videoPath.split("/").pop()}`;
}

async function sendVideoMessage(recipientId, videoUrl) {
  const url = `https://graph.facebook.com/v21.0/${PAGE_ID}/messages`;
  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "video",
        payload: { url: videoUrl, is_reusable: true },
      },
    },
  };
  await axios.post(url, payload, {
    params: { access_token: ACCESS_TOKEN },
  });
  console.log(`Processed video sent to ${recipientId}`);
}
