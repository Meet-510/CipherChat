import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// returns all socket ids for a user (they may have multiple tabs open)
export function getReceiverSocketId(userId) {
  const sockets = userSocketMap[userId];
  return sockets && sockets.length > 0 ? sockets : undefined;
}

// used to store online users
const userSocketMap = {}; // {userId: [socketId, ...]} — supports multiple tabs per user

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = [];
      // first connection for this user -> mark online in DB (non-blocking)
      User.findByIdAndUpdate(userId, { isOnline: true }).catch((error) =>
        console.log("Error updating online status:", error.message)
      );
    }
    userSocketMap[userId].push(socket.id);
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId && userSocketMap[userId]) {
      userSocketMap[userId] = userSocketMap[userId].filter((id) => id !== socket.id);
      if (userSocketMap[userId].length === 0) {
        delete userSocketMap[userId];
        // last connection closed -> mark offline and record last seen (non-blocking)
        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch((error) =>
          console.log("Error updating offline status:", error.message)
        );
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
