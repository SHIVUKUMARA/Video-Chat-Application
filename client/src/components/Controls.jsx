import React from "react";
import { ButtonGroup, Button } from "react-bootstrap";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ChatIcon from "@mui/icons-material/Chat";

function Controls({
  isMicOn,
  isCamOn,
  isSharing,
  onMicToggle,
  onCamToggle,
  onScreenShare,
  onStopScreenShare,
  onLeave,
  onChatToggle,
}) {
  return (
    <ButtonGroup className="me-2 flex-wrap">
      <Button
        size="sm"
        variant={isMicOn ? "primary" : "danger"}
        onClick={onMicToggle}
        className="mx-1 rounded"
      >
        {isMicOn ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
      </Button>

      <Button
        size="sm"
        variant={isCamOn ? "primary" : "danger"}
        onClick={onCamToggle}
        className="mx-1 rounded"
      >
        {isCamOn ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
      </Button>

      <Button
        size="sm"
        variant={isSharing ? "danger" : "warning"}
        onClick={isSharing ? onStopScreenShare : onScreenShare}
        className="mx-1 rounded"
      >
        {isSharing ? <StopScreenShareIcon fontSize="small" /> : <ScreenShareIcon fontSize="small" />}
      </Button>

      <Button
        size="sm"
        variant="outline-light"
        onClick={onLeave}
        className="mx-1 rounded"
      >
        <ExitToAppIcon fontSize="small" />
      </Button>

      {/* Mobile-only chat button */}
      <Button
        size="sm"
        variant="info"
        onClick={onChatToggle}
        className="d-lg-none mx-1 rounded"
      >
        <ChatIcon fontSize="small" />
      </Button>
    </ButtonGroup>
  );
}

export default Controls;
