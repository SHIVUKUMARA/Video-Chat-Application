import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import SendIcon from "@mui/icons-material/Send";

function ChatBox({ socket, roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    if (!socket) return;

    // ✅ Listen for real-time messages
    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleMessage);

    return () => {
      socket.off("chat-message", handleMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    if (!newMsg.trim()) return;

    // ✅ Always send roomId + user
    socket.emit("chat-message", {
      roomId,
      userId: user.userId,
      displayName: user.displayName,
      message: newMsg,
    });

    setNewMsg(""); // clear input field
  };

  return (
    <div className="border rounded p-2 h-100 d-flex flex-column">
      <div className="flex-grow-1 overflow-auto mb-2">
        {messages.map((m, i) => (
          <p key={i}>
            <strong>{m.displayName}:</strong> {m.message}
          </p>
        ))}
      </div>
      <div className="d-flex">
        <Form.Control
          type="text"
          placeholder="Type message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage} variant="primary" className="ms-2">
          <SendIcon />
        </Button>
      </div>
    </div>
  );
}

export default ChatBox;
