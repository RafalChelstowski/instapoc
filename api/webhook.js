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
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  if (req.method === "POST") {
    try {
      const body = req.body;
      // Initial verification
      if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
        return res.send(req.query["hub.challenge"]);
      }
      if (body.object === "instagram") {
        for (const entry of body.entry) {
          for (const messaging of entry.messaging) {
            const senderId = messaging.sender.id;
            const message = messaging.message;
            if (message.attachments && message.attachments[0]?.type === "video") {
              const videoUrl = message.attachments[0].payload.url;
              const videoPath = await downloadVideo(videoUrl, message.mid);
              const processedVideoPath = await processVideo(videoPath, message.mid);
              const processedVideoUrl = await uploadProcessedVideo(processedVideoPath);
              await sendVideoMessage(senderId, processedVideoUrl);
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Webhook error:", error);
      return res.status(500).send("ERROR");
    }
  }
  return res.status(405).send("Method Not Allowed");
};

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
