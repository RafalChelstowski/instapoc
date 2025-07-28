const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const app = express();
app.use(express.json());

// Configuration
const ACCESS_TOKEN = "YOUR_INSTAGRAM_ACCESS_TOKEN"; // Replace with your access token
const PAGE_ID = "YOUR_PAGE_ID"; // Replace with your Facebook Page ID
const SERVER_URL = "YOUR_SERVER_URL"; // Your server URL (e.g., https://yourdomain.com)
const PORT = 3000;

// Webhook endpoint to receive Instagram messages
app.post("/webhook", async (req, res) => {
	try {
		const body = req.body;

		// Verify webhook subscription (for initial setup)
		if (req.query["hub.verify_token"] === "YOUR_VERIFY_TOKEN") {
			return res.send(req.query["hub.challenge"]);
		}

		// Check if the event is from Instagram messaging
		if (body.object === "instagram") {
			for (const entry of body.entry) {
				for (const messaging of entry.messaging) {
					const senderId = messaging.sender.id;
					const recipientId = messaging.recipient.id;
					const message = messaging.message;

					// Check if the message contains a video attachment
					if (message.attachments && message.attachments[0]?.type === "video") {
						const videoUrl = message.attachments[0].payload.url;

						// Download the video
						const videoPath = await downloadVideo(videoUrl, message.mid);

						// Process the video (example: add a watermark)
						const processedVideoPath = await processVideo(
							videoPath,
							message.mid,
						);

						// Upload the processed video to your server or a temporary URL
						const processedVideoUrl =
							await uploadProcessedVideo(processedVideoPath);

						// Send the processed video back to the user
						await sendVideoMessage(senderId, processedVideoUrl);
					}
				}
			}
		}

		res.status(200).send("EVENT_RECEIVED");
	} catch (error) {
		console.error("Webhook error:", error);
		res.status(500).send("ERROR");
	}
});

// Webhook verification endpoint
app.get("/webhook", (req, res) => {
	const mode = req.query["hub.mode"];
	const token = req.query["hub.verify_token"];
	const challenge = req.query["hub.challenge"];

	if (mode === "subscribe" && token === "YOUR_VERIFY_TOKEN") {
		console.log("Webhook verified");
		res.status(200).send(challenge);
	} else {
		res.sendStatus(403);
	}
});

// Download video from Instagram
async function downloadVideo(videoUrl, messageId) {
	const response = await axios({
		url: videoUrl,
		method: "GET",
		responseType: "stream",
		headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
	});

	const videoPath = `./videos/original_${messageId}.mp4`;
	const writer = fs.createWriteStream(videoPath);
	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on("finish", () => resolve(videoPath));
		writer.on("error", reject);
	});
}

// Process video (example: add watermark using FFmpeg)
async function processVideo(inputPath, messageId) {
	const outputPath = `./videos/processed_${messageId}.mp4`;
	const watermarkText = "Processed by YourCompany";

	// Example FFmpeg command to add a watermark
	const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "drawtext=text='${watermarkText}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2" -c:a copy ${outputPath}`;

	await execPromise(ffmpegCommand);
	return outputPath;
}

// Upload processed video (example: to your server or a cloud storage)
async function uploadProcessedVideo(videoPath) {
	// For simplicity, assume the video is accessible via a public URL after upload
	// In production, upload to a service like AWS S3 and return the public URL
	return `${SERVER_URL}/videos/${videoPath.split("/").pop()}`;
}

// Send processed video back to the user
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

// Serve processed videos (for simplicity; use a proper CDN in production)
app.use("/videos", express.static("videos"));

// Start the server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
