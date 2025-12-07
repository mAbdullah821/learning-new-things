const net = require("net");

// Create a server
const server = net.createServer((socket) => {
  console.log("A client connected!");

  // Handle incoming data
  socket.on("data", (data) => {
    // Data comes in as a Buffer (binary), so we convert to string
    console.log("Received from client:", JSON.parse(data.toString()));

    // Reply to the client
    socket.write(
      JSON.stringify({ message: "Hello Client, message received!" })
    );
  });

  // Handle disconnection
  socket.on("end", () => {
    console.log("Client disconnected");
  });

  // Handle errors (important for sockets!)
  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });
});

// Listen on port 8080
server.listen(8080, () => {
  console.log("TCP Server is running on port 8080");
});
