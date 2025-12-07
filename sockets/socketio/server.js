const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  console.log("Socket transport:", socket.conn.transport.name);
  socket.emit("user id", socket.id);

  socket.on("chat message", (msg) => {
    if (!msg || typeof msg !== "string" || !msg.trim()) {
      return;
    }

    // Broadcast to everyone including sender
    io.emit("chat message", {
      message: msg.trim(),
      userId: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3025, () => {
  console.log("Server listening on port 3025");
  console.log("Access the app at: http://localhost:3025");
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});
