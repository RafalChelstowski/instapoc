import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [stream, setStream] = useState(null);
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);

  // Function to start webcam on user action
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraStarted(true);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setStatus("Error accessing webcam");
    }
  };

  useEffect(() => {
    // Cleanup: stop all tracks when component unmounts or stream changes
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startRecording = () => {
    if (!stream) return;
    const options = { mimeType: "video/webm" };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
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
         setStatus("Thank you for sending the video!");
         // Stop camera and clean up
         if (stream) {
           stream.getTracks().forEach((track) => track.stop());
         }
         setCameraStarted(false);
         setStream(null);
       } else {
         setStatus("Failed to send video message");
       }
     } catch (error) {
       setStatus("Error sending video message");
       console.error(error);
     }
   };

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
            {!cameraStarted && (
              <button onClick={startCamera}>Start Camera</button>
            )}
            <>
              {!videoURL && (
                <div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "320px",
                      height: "240px",
                      border: "1px solid black",
                      transform: "scaleX(-1)",
                    }}
                  ></video>
                </div>
              )}
              {videoURL && (
                <div>
                  <video
                    playsInline
                    src={videoURL}
                    controls
                    style={{
                      width: "320px",
                      height: "240px",
                      border: "1px solid black",
                      transform: "scaleX(-1)",
                    }}
                  ></video>
                </div>
              )}
            </>
          </div>

          <div>
            {!recording ? (
              <button onClick={startRecording} disabled={!cameraStarted}>
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording}>Stop Recording</button>
            )}
          </div>
        </>
      ) : (
        <p>No user ID found in URL</p>
      )}
    </div>
  );
}

export default App;
