import dotenv from "dotenv";
dotenv.config();
import express from "express";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";

const app = express();

const PORT = process.env.PORT;
app.use(express.json());
app.use("/api/auth", authRoutes);
app.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
