import React, { useState, useEffect } from "react";
import './App.css'

function App() {

  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Parse userId from URL query params
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userId");
    if (id) {
      setUserId(id);
    }
  }, []);

  const sendMessage = async () => {
    if (!userId) {
      setStatus("User ID not found");
      return;
    }
    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: "hello from web app" }),
      });
      if (response.ok) {
        setStatus("Message sent!");
      } else {
        setStatus("Failed to send message");
      }
    } catch (error) {
      setStatus("Error sending message");
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Instagram Video Capture Webapp</h1>
      {userId ? (
        <>
          <p>User ID: {userId}</p>
          <button onClick={sendMessage}>Send Message</button>
          <p>{status}</p>
        </>
      ) : (
        <p>No user ID found in URL</p>
      )}
    </div>
  );
}

export default App
