# Native TCP Sockets Learning Project

A simple, beginner-friendly project demonstrating low-level TCP socket communication using Node.js built-in `net` module. This project is designed for learning purposes, showing how to establish bidirectional communication between a client and server using raw TCP/IP sockets.

## Overview

This project demonstrates raw TCP/IP socket programming, showing how to establish bidirectional communication between a client and server using Node.js's native networking capabilities. You'll learn:

- **TCP Socket Communication**: Connection-oriented, reliable data transmission
- **Socket Events**: Understanding connect, data, end, and error events
- **Buffer Handling**: Working with binary data and string conversion
- **JSON Serialization**: Structured data exchange over raw TCP
- **Connection Management**: Handling connections, disconnections, and errors
- **Low-level Networking**: Understanding the fundamentals before using higher-level abstractions

## Key Concepts

### What is TCP (Transmission Control Protocol)?

**TCP** is a connection-oriented protocol that provides:

- **Reliable Delivery**: Guarantees that data arrives in order and without errors
- **Connection-oriented**: Requires explicit connection establishment (like a phone call)
- **Bidirectional**: Both client and server can send and receive data
- **Stream-based**: Data flows as a continuous stream of bytes
- **Error Recovery**: Automatically retransmits lost packets

**Real-world analogy**: Think of TCP like a phone call:

- You must dial (connect) before talking
- Both parties can speak (bidirectional)
- You hear words in order (reliable, ordered delivery)
- If you miss something, you ask to repeat (error recovery)

### TCP vs UDP

**TCP (This Project):**

- **Connection-oriented**: Must establish connection first
- **Reliable**: Guarantees delivery and ordering
- **Slower**: More overhead for reliability
- **Use case**: Web browsing, file transfer, chat applications

**UDP (Not covered here):**

- **Connectionless**: No connection needed
- **Unreliable**: No delivery guarantees
- **Faster**: Less overhead
- **Use case**: Video streaming, online gaming, DNS

### Why Learn Native TCP Sockets?

**Benefits:**

- **Understanding Fundamentals**: Learn how network communication actually works
- **Maximum Control**: Full control over the protocol and data format
- **No Dependencies**: Uses only Node.js built-in modules
- **Performance**: Minimal overhead, maximum performance
- **Custom Protocols**: Build your own communication protocols
- **Debugging**: Better understanding helps debug higher-level issues

**When to Use:**

- Building custom communication protocols
- Integrating with systems that use raw TCP
- Learning network programming fundamentals
- Performance-critical applications
- System-level programming

## Project Structure

```
native-socket/
├── server.js    # TCP server listening on port 8080
├── client.js    # TCP client that connects to the server
└── README.md    # This file
```

## Prerequisites

- Node.js (v14 or higher)
- Basic understanding of JavaScript and Node.js
- No external dependencies required!

## Installation

No installation needed! This project uses only Node.js built-in modules.

1. Navigate to the project directory:

   ```bash
   cd native-socket
   ```

2. That's it! No `npm install` needed.

## Usage

### 1. Start the Server

In one terminal, start the TCP server:

```bash
node server.js
```

You should see:

```
TCP Server is running on port 8080
```

The server is now listening for incoming connections on port 8080.

### 2. Run the Client

In another terminal, run the client to connect to the server:

```bash
node client.js
```

**Expected Output:**

**Server terminal:**

```
TCP Server is running on port 8080
A client connected!
Received from client: { message: 'Hello Server! This is a raw TCP message.' }
Client disconnected
```

**Client terminal:**

```
Connected to server!
Server says: { message: 'Hello Client, message received!' }
Disconnected from server
```

## Architecture

```
Client (client.js)                    Server (server.js)
     │                                     │
     │                                     │  net.createServer()
     │                                     │  Listening on 8080
     │                                     │
     │  net.createConnection()             │
     │  (Port 8080)                        │
     │  ──────────────────────────────────>│  'connection' event
     │                                     │  Socket created
     │                                     │  Connection established
     │                                     │
     │  socket.write(JSON)                 │
     │  ──────────────────────────────────>│  socket.on('data')
     │                                     │  Receive Buffer
     │                                     │  Parse JSON
     │                                     │  Process message
     │  socket.on('data')                  │
     │  Receive Buffer                     │
     │  Parse JSON                         │
     │  <──────────────────────────────────│  socket.write(JSON)
     │                                     │
     │  socket.end()                       │
     │  ──────────────────────────────────>│  socket.on('end')
     │                                     │  Client disconnected
     │  socket.on('end')                   │
     │  Disconnected                       │
```

**Flow:**

1. Server starts listening on port 8080
2. Client creates connection to server
3. Server accepts connection and creates socket
4. Client sends JSON message via socket
5. Server receives data (as Buffer), parses JSON, and sends reply
6. Client receives reply, parses JSON, and closes connection
7. Server detects disconnection and cleans up

## Key Concepts Explained

### 1. TCP Socket Communication

**Connection-Oriented Protocol:**

```javascript
// Server: Create server and listen for connections
const server = net.createServer((socket) => {
  // This callback runs when a client connects
  console.log("A client connected!");
});

server.listen(8080, () => {
  console.log("TCP Server is running on port 8080");
});

// Client: Create connection to server
const client = net.createConnection({ port: 8080 }, () => {
  // This callback runs when connection is established
  console.log("Connected to server!");
});
```

**Key Points:**

- **Connection must be established** before data can be sent
- **Both sides** can send and receive data
- **Connection persists** until explicitly closed
- **Reliable**: TCP guarantees delivery and ordering

### 2. Socket Events

**Server Events:**

```javascript
const server = net.createServer((socket) => {
  // 'connection' event: Fired when client connects
  console.log("A client connected!");

  // 'data' event: Fired when data is received
  socket.on("data", (data) => {
    // data is a Buffer (binary data)
    console.log("Received:", data.toString());
  });

  // 'end' event: Fired when client closes connection
  socket.on("end", () => {
    console.log("Client disconnected");
  });

  // 'error' event: Fired when an error occurs
  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });
});
```

**Client Events:**

```javascript
const client = net.createConnection({ port: 8080 }, () => {
  // 'connect' event: Fired when connection is established
  console.log("Connected to server!");
});

// 'data' event: Fired when data is received from server
client.on("data", (data) => {
  console.log("Server says:", data.toString());
});

// 'end' event: Fired when server closes connection
client.on("end", () => {
  console.log("Disconnected from server");
});
```

**Event Summary:**

- **`connect`** (client): Connection established
- **`connection`** (server): Client connected
- **`data`**: Data received (always a Buffer)
- **`end`**: Other side closed connection
- **`error`**: Error occurred

### 3. Buffer Handling

**Understanding Buffers:**

```javascript
// Data received is ALWAYS a Buffer (binary data)
socket.on("data", (data) => {
  // data is a Buffer, not a string!
  console.log(typeof data); // "object" (Buffer is a special object)

  // Convert Buffer to string
  const message = data.toString();

  // Parse JSON string to object
  const obj = JSON.parse(message);
});
```

**Why Buffers?**

- **Network data is binary**: TCP sends bytes, not text
- **Efficiency**: Buffers are more memory-efficient than strings
- **Flexibility**: Can handle any data type (text, images, files, etc.)

**Sending Data:**

```javascript
// Convert object to JSON string, then to Buffer
const message = { text: "Hello" };
const jsonString = JSON.stringify(message);
socket.write(jsonString); // Node.js automatically converts string to Buffer
```

### 4. JSON Serialization

**Sending Structured Data:**

```javascript
// Client: Send object as JSON
const message = {
  message: "Hello Server! This is a raw TCP message.",
};
client.write(JSON.stringify(message));
```

**Receiving Structured Data:**

```javascript
// Server: Receive and parse JSON
socket.on("data", (data) => {
  // Convert Buffer to string, then parse JSON
  const message = JSON.parse(data.toString());
  console.log("Received:", message.message);
});
```

**Why JSON?**

- **Structured Data**: Send complex objects, not just strings
- **Standard Format**: Widely supported and understood
- **Human Readable**: Easy to debug and inspect
- **Flexible**: Can represent arrays, objects, nested structures

### 5. Connection Management

**Server Connection Handling:**

```javascript
const server = net.createServer((socket) => {
  // Each connection gets its own socket
  // Multiple clients can connect simultaneously
  console.log("New client connected:", socket.remoteAddress);

  // Handle this specific connection
  socket.on("data", (data) => {
    // Process data for THIS client
  });

  socket.on("end", () => {
    // This specific client disconnected
  });
});
```

**Client Connection:**

```javascript
const client = net.createConnection({ port: 8080 }, () => {
  // Connection established, can now send data
  client.write("Hello!");
});

// Close connection when done
client.on("data", (data) => {
  console.log(data.toString());
  client.end(); // Close connection
});
```

**Important Notes:**

- **Server can handle multiple clients**: Each gets its own socket
- **Client has one connection**: One socket per connection
- **Explicit closing**: Use `socket.end()` or `client.end()` to close
- **Error handling**: Always handle 'error' events

### 6. Error Handling

**Always Handle Errors:**

```javascript
// Server
socket.on("error", (err) => {
  console.error("Socket error:", err.message);
  // Connection might be broken, handle gracefully
});

// Client
client.on("error", (err) => {
  console.error("Connection error:", err.message);
  // Connection failed, handle gracefully
});
```

**Common Errors:**

- **ECONNREFUSED**: Server not running or wrong port
- **ETIMEDOUT**: Connection timeout
- **ECONNRESET**: Connection reset by peer
- **EPIPE**: Broken pipe (connection closed unexpectedly)

## Dependencies

**None!** This project uses only Node.js built-in modules:

- **`net`**: TCP socket support (built-in)
- **No npm packages required**

## Learning Path

1. **Start here**: Understand TCP socket basics
2. **Server**: Study `server.js` to see how server accepts connections
3. **Client**: Study `client.js` to see how client connects
4. **Experiment**:
   - Modify the message format
   - Add multiple message exchanges
   - Handle multiple simultaneous clients
   - Add error handling and reconnection logic
   - Try sending binary data (images, files)

## Common Patterns

### Pattern 1: Simple Request-Response

```javascript
// Client sends request, server responds
client.write(JSON.stringify({ request: "getData" }));
client.on("data", (data) => {
  const response = JSON.parse(data.toString());
  console.log("Response:", response);
});
```

### Pattern 2: Keep Connection Open

```javascript
// Keep connection open for multiple exchanges
client.on("data", (data) => {
  const message = JSON.parse(data.toString());
  // Process message but don't close connection
  // Connection stays open for more messages
});
```

### Pattern 3: Handle Multiple Clients

```javascript
// Server handles multiple clients simultaneously
const server = net.createServer((socket) => {
  const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Client ${clientId} connected`);

  socket.on("data", (data) => {
    // Process data from THIS specific client
    socket.write(`Echo: ${data.toString()}`);
  });
});
```

## When to Use Native TCP Sockets

**Good for:**

- **Custom Protocols**: Implementing proprietary communication protocols
- **System Integration**: Connecting to systems that use raw TCP
- **Performance**: When every millisecond matters
- **Learning**: Understanding network fundamentals
- **Control**: When you need full control over the protocol

**Not ideal for:**

- **Web Applications**: Use WebSockets instead (browser support)
- **Rapid Development**: Higher-level libraries are faster to develop
- **Automatic Features**: No built-in reconnection, fallback, etc.
- **Complex Routing**: Use message brokers (RabbitMQ, Redis) instead

## Limitations

1. **No Automatic Reconnection**: Must implement manually
2. **No Transport Fallback**: TCP only, no HTTP fallback
3. **Manual Protocol Design**: You design the message format
4. **No Built-in Broadcasting**: Must implement manually
5. **Browser Incompatibility**: Browsers can't use raw TCP sockets

## Next Steps

- Learn about **WebSockets** (higher-level abstraction)
- Explore **Socket.IO** (automatic features, browser support)
- Study **HTTP Protocol** (built on TCP)
- Implement **custom protocols** (message framing, headers)
- Add **authentication** and **encryption** (TLS/SSL)
- Explore **UDP sockets** (connectionless alternative)
- Study **network programming** in other languages (C, Python, Go)
