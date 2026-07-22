import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// running behind Render's TLS-terminating proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// allowed browser origin — same-origin in production (monolith), localhost in dev
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// large limit so base64-encoded photos/videos can be sent as message payloads
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// lightweight health check for the hosting platform (always 200)
app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendDist));

  // SPA fallback: serve index.html for any non-API GET request.
  // Uses middleware (not app.get("*")) so it works on both Express 4 and 5.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
