require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./db");

const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");
const messageRoutes = require("./messageRoutes");
const { initSocket } = require("./socket");

connectDB();

const app = express();
const server = http.createServer(app);

// ✅ CORS (production ready)
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});

// ✅ Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);

// ✅ PORT for Render
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`✅ Backend running on port ${PORT}`)
);
