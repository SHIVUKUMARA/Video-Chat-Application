// server.js
// Express + Socket.io backend for multi-user video conference (video/audio/chat/screen-share)
// Run: node server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Basic health route
app.get("/", (req, res) => {
  res.send("🎥 Video Conference Backend Running...");
});

const server = http.createServer(app);

// Allow CORS from your frontend origin in production
const io = new Server(server, {
  cors: {
    origin: "*", // change to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

/**
 Data structures:
 rooms = {
   roomId1: {
     sockets: {
       socketId1: { userId: 'user-123', displayName: 'Alice' },
       socketId2: { userId: 'user-456', displayName: 'Bob' }
     }
   },
   ...
 }
*/
const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // User joins a room
  // payload: { roomId, userId, displayName }
  socket.on("join-room", (payload) => {
    try {
      const { roomId, userId, displayName } = payload;
      if (!roomId) return;

      // Ensure room exists
      if (!rooms[roomId]) {
        rooms[roomId] = { sockets: {} };
      }

      // Save user in room
      rooms[roomId].sockets[socket.id] = {
        userId: userId || socket.id,
        displayName: displayName || `User-${userId || socket.id.slice(0, 5)}`,
      };

      // Join socket.io room
      socket.join(roomId);
      console.log(
        `📥 ${rooms[roomId].sockets[socket.id].displayName} (${
          socket.id
        }) joined room ${roomId}`
      );

      // Send to the joining client the list of existing participants (socketId + user meta)
      const existingParticipants = Object.keys(rooms[roomId].sockets)
        .filter((id) => id !== socket.id)
        .map((id) => ({ socketId: id, ...rooms[roomId].sockets[id] }));

      socket.emit("room-participants", { participants: existingParticipants });

      // Notify everyone else in the room that a new user joined
      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
        ...rooms[roomId].sockets[socket.id],
      });
    } catch (err) {
      console.error("join-room error:", err);
    }
  });

  // Signaling: offer -> server forwards to target peer
  // payload: { roomId, targetSocketId, sdp, fromUserId(optional) }
  socket.on("offer", (payload) => {
    const { targetSocketId } = payload;
    if (!targetSocketId) return;
    // forward to the target peer
    io.to(targetSocketId).emit("offer", {
      ...payload,
      fromSocketId: socket.id,
    });
  });

  // Signaling: answer -> forward to original offer sender
  // payload: { roomId, targetSocketId, sdp }
  socket.on("answer", (payload) => {
    const { targetSocketId } = payload;
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("answer", {
      ...payload,
      fromSocketId: socket.id,
    });
  });

  // Signaling: ICE candidates
  // payload: { roomId, targetSocketId, candidate }
  socket.on("ice-candidate", (payload) => {
    const { targetSocketId, candidate } = payload;
    if (!targetSocketId || !candidate) return;
    io.to(targetSocketId).emit("ice-candidate", {
      candidate,
      fromSocketId: socket.id,
    });
  });

  // Chat messages (broadcast to the room)
  // payload: { roomId, userId, displayName, message, timestamp(optional) }
  socket.on("chat-message", (payload) => {
    const { roomId, message, userId } = payload;
    if (!roomId || !message) return;
    // Broadcast to everyone in room including sender (so UI can be simple)
    io.in(roomId).emit("chat-message", {
      socketId: socket.id,
      userId:
        userId ||
        (rooms[roomId] &&
          rooms[roomId].sockets[socket.id] &&
          rooms[roomId].sockets[socket.id].userId),
      displayName:
        (rooms[roomId] &&
          rooms[roomId].sockets[socket.id] &&
          rooms[roomId].sockets[socket.id].displayName) ||
        "Anonymous",
      message,
      timestamp: Date.now(),
    });
  });

  // Leave a room explicitly
  // payload: { roomId }
  socket.on("leave-room", (payload) => {
    const { roomId } = payload;
    if (!roomId || !rooms[roomId]) return;

    // Notify others
    socket.to(roomId).emit("participant-left", { socketId: socket.id });

    // Remove from room data structure
    delete rooms[roomId].sockets[socket.id];
    socket.leave(roomId);
    console.log(`📤 Socket ${socket.id} left room ${roomId}`);

    // If room empty, delete room
    if (Object.keys(rooms[roomId].sockets).length === 0) {
      delete rooms[roomId];
      console.log(`🧹 Room ${roomId} removed (empty)`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);

    // Find and clean up from any rooms
    for (const roomId of Object.keys(rooms)) {
      if (rooms[roomId].sockets[socket.id]) {
        // Notify remaining peers
        socket.to(roomId).emit("participant-left", { socketId: socket.id });

        // Remove entry
        delete rooms[roomId].sockets[socket.id];
        socket.leave(roomId);
        console.log(
          `🧹 Removed ${socket.id} from room ${roomId} on disconnect`
        );

        if (Object.keys(rooms[roomId].sockets).length === 0) {
          delete rooms[roomId];
          console.log(`🧹 Room ${roomId} removed (empty)`);
        }
      }
    }
  });

  // Optional: list active rooms (for debugging)
  socket.on("list-rooms", () => {
    const summary = Object.keys(rooms).map((roomId) => ({
      roomId,
      participants: Object.keys(rooms[roomId].sockets).map((sId) => ({
        socketId: sId,
        ...rooms[roomId].sockets[sId],
      })),
    }));
    socket.emit("rooms-list", summary);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
