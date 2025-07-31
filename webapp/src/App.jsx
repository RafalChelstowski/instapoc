import React, { useState, useEffect, useRef } from "react";
import './App.css'

function App() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [stream, setStream] = useState(null);

  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Request webcam access
    async function getWebcam() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
    getWebcam();

    return () => {
      // Cleanup: stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!stream) return;
    const options = { mimeType: 'video/webm' };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoURL(url);
      setVideoBlob(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendVideoMessage = async () => {
    if (!userId) {
      setStatus("User ID not found");
      return;
    }
    if (!videoBlob) {
      setStatus("No video recorded");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("video", videoBlob, "video.webm");

      const response = await fetch("/api/webhook/send-video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setStatus("Video message sent!");
      } else {
        setStatus("Failed to send video message");
      }
    } catch (error) {
      setStatus("Error sending video message");
      console.error(error);
    }
  };

  useEffect(() => {
    // Request webcam access
    async function getWebcam() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
    getWebcam();

    return () => {
      // Cleanup: stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Parse userId from URL query params
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userId");
    if (id) {
      setUserId(id);
    }
  }, []);

  return (
    <div>
      <h1>Instagram Video Capture Webapp</h1>
      {userId ? (
        <>
          <p>User ID: {userId}</p>
          <button onClick={sendVideoMessage} disabled={!videoBlob || recording}>
            Send Video Message
          </button>
          <p>{status}</p>

          <div>
            <video ref={videoRef} autoPlay muted style={{ width: "320px", height: "240px", border: "1px solid black" }}></video>
          </div>

          <div>
            {!recording ? (
              <button onClick={startRecording}>Start Recording</button>
            ) : (
              <button onClick={stopRecording}>Stop Recording</button>
            )}
          </div>

          {videoURL && (
            <div>
              <h3>Recorded Video:</h3>
              <video src={videoURL} controls style={{ width: "320px", height: "240px", border: "1px solid black" }}></video>
            </div>
          )}
        </>
      ) : (
        <p>No user ID found in URL</p>
      )}
    </div>
  );
}

export default App
