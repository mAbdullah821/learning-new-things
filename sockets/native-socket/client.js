const net = require("net");

// Connect to the server on localhost:8080
const client = net.createConnection({ port: 8080 }, () => {
  console.log("Connected to server!");

  client.write(
    JSON.stringify({ message: "Hello Server! This is a raw TCP message." })
  );
});

client.on("data", (data) => {
  console.log("Server says:", JSON.parse(data.toString()));
  client.end(); // Close connection after receiving reply
});

client.on("end", () => {
  console.log("Disconnected from server");
});
