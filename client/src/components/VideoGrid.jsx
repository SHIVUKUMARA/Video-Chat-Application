import React from "react";
import { Row, Col } from "react-bootstrap";

function VideoGrid({ localVideoRef, participants }) {
  return (
    <Row className="mt-3">
      <Col md={6}>
        <h6>Me</h6>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-100 border rounded"
        />
      </Col>

      {participants.map((p) => (
        <Col md={6} key={p.socketId}>
          <h6>{p.displayName || "Guest"}</h6>
          <video
            autoPlay
            playsInline
            className="w-100 border rounded"
            ref={(el) => {
              if (el) el.srcObject = p.stream;
            }}
          />
        </Col>
      ))}
    </Row>
  );
}

export default VideoGrid;
