import React, { useState } from "react";
import { Container, Row, Col, Navbar, Nav, Offcanvas } from "react-bootstrap";
import VideoGrid from "./components/VideoGrid";
import ChatBox from "./components/ChatBox";
import Controls from "./components/Controls";
import { useWebRTC } from "./hooks/useWebRTC";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const user = {
    userId: Math.random().toString(36).slice(2, 8),
    displayName: "Guest",
  };

  const {
    localVideoRef,
    participants,
    socket,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
    isMicOn,
    isCamOn,
    isSharing,
  } = useWebRTC(joined ? roomId : null, user);

  return (
    <Container fluid className="p-0">
      {/* Header Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand>🎥 Video Conference</Navbar.Brand>
        {joined && (
          <Nav className="ms-auto d-flex align-items-center">
            <Controls
              isMicOn={isMicOn}
              isCamOn={isCamOn}
              isSharing={isSharing}
              onMicToggle={toggleMic}
              onCamToggle={toggleCam}
              onScreenShare={startScreenShare}
              onStopScreenShare={stopScreenShare}
              onLeave={() => {
                leaveRoom();
                setJoined(false);
              }}
              onChatToggle={() => setShowChat(true)} // 👈 passed here
            />
          </Nav>
        )}
      </Navbar>

      {/* Room Join Screen */}
      {!joined ? (
        <div className="d-flex flex-column align-items-center mt-5">
          <input
            type="text"
            placeholder="Enter Room ID"
            className="form-control w-50"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            className="btn btn-primary mt-3"
            onClick={() => setJoined(true)}
            disabled={!roomId}
          >
            Join Room
          </button>
        </div>
      ) : (
        /* Main Layout */
        <Row className="g-0">
          {/* Video Section */}
          <Col lg={8} xs={12}>
            <VideoGrid localVideoRef={localVideoRef} participants={participants} />
          </Col>

          {/* Chat for desktop */}
          <Col lg={4} className="d-none d-lg-block">
            <ChatBox socket={socket} roomId={roomId} user={user} />
          </Col>
        </Row>
      )}

      {/* Mobile Chat Drawer */}
      <Offcanvas
        show={showChat}
        onHide={() => setShowChat(false)}
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Chat</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ChatBox socket={socket} roomId={roomId} user={user} />
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
}

export default App;
