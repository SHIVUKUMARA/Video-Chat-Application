import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // backend URL

export function useWebRTC(roomId, user) {
  const [participants, setParticipants] = useState([]); // {socketId, displayName, stream}
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const localVideoRef = useRef();
  const peerConnections = useRef({});
  const localStream = useRef();

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // ----------------- INIT & SIGNALING -----------------
  useEffect(() => {
    if (!roomId) return;

    async function init() {
      // Get local camera/mic
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      // Join backend room
      socket.emit("join-room", {
        roomId,
        userId: user.userId,
        displayName: user.displayName,
      });

      // Existing participants
      socket.on("room-participants", ({ participants }) => {
        participants.forEach((p) => createOffer(p.socketId));
      });

      // New participant joined
      socket.on("participant-joined", (data) => {
        createOffer(data.socketId);
      });

      // Handle offer
      socket.on("offer", async ({ fromSocketId, sdp }) => {
        const pc = createPeerConnection(fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          roomId,
          targetSocketId: fromSocketId,
          sdp: answer,
        });
      });

      // Handle answer
      socket.on("answer", async ({ fromSocketId, sdp }) => {
        const pc = peerConnections.current[fromSocketId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      // Handle ICE
      socket.on("ice-candidate", async ({ fromSocketId, candidate }) => {
        const pc = peerConnections.current[fromSocketId];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      // Handle participant leaving
      socket.on("participant-left", ({ socketId }) => {
        if (peerConnections.current[socketId]) {
          peerConnections.current[socketId].close();
          delete peerConnections.current[socketId];
          setParticipants((prev) =>
            prev.filter((p) => p.socketId !== socketId)
          );
        }
      });
    }

    init();

    return () => {
      socket.emit("leave-room", { roomId });
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      if (localStream.current) {
        localStream.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [roomId]);

  // ----------------- PEER CONNECTION -----------------
  function createPeerConnection(socketId) {
    if (peerConnections.current[socketId])
      return peerConnections.current[socketId];

    const pc = new RTCPeerConnection(iceServers);

    // Local tracks
    localStream.current
      .getTracks()
      .forEach((track) => pc.addTrack(track, localStream.current));

    // Remote stream
    pc.ontrack = (event) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.socketId === socketId);
        if (exists) return prev;
        return [...prev, { socketId, stream: event.streams[0] }];
      });
    };

    // ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          targetSocketId: socketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnections.current[socketId] = pc;
    return pc;
  }

  async function createOffer(socketId) {
    const pc = createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { roomId, targetSocketId: socketId, sdp: offer });
  }

  // ----------------- MEDIA CONTROLS -----------------
  function toggleMic() {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
    });
  }

  function toggleCam() {
    if (!localStream.current) return;
    localStream.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsCamOn(track.enabled);
    });
  }

  async function startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getTracks()[0];

      const sender = Object.values(peerConnections.current)
        .flatMap((pc) => pc.getSenders())
        .find((s) => s.track && s.track.kind === "video");

      if (sender) sender.replaceTrack(screenTrack);

      localVideoRef.current.srcObject = screenStream;
      setIsSharing(true);

      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share error:", err);
    }
  }

  async function stopScreenShare() {
    if (!localStream.current) return;

    const camTrack = localStream.current.getVideoTracks()[0];
    const sender = Object.values(peerConnections.current)
      .flatMap((pc) => pc.getSenders())
      .find((s) => s.track && s.track.kind === "video");

    if (sender && camTrack) sender.replaceTrack(camTrack);

    localVideoRef.current.srcObject = localStream.current;
    setIsSharing(false);
  }

  function leaveRoom() {
    socket.emit("leave-room", { roomId });
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
    }
    setParticipants([]);
  }

  // ----------------- RETURN API -----------------
  return {
    localVideoRef,
    participants,
    socket,
    localStream,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
    isMicOn,
    isCamOn,
    isSharing,
  };
}
