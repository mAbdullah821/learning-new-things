# Protobuf & gRPC Learning Project

A simple, beginner-friendly project demonstrating Protocol Buffers (Protobuf) and gRPC with Node.js. This project is designed for learning purposes with detailed comments explaining key concepts.

## Overview

This project demonstrates how to build a gRPC service using Protocol Buffers. You'll learn:

- **Protocol Buffers**: A binary data format that's smaller and faster than JSON
- **gRPC**: A high-performance RPC framework that uses HTTP/2 and supports streaming
- **Service Definition**: How to define APIs using `.proto` files
- **Unary RPC**: Simple request-response pattern (like REST)
- **Server Streaming RPC**: Sending multiple responses to a single request

## Key Concepts

### What is Protocol Buffers (Protobuf)?

**Protobuf** is a binary data format developed by Google. Think of it as a more efficient alternative to JSON:

- **JSON**: Text-based, includes field names in every message
  ```json
  { "firstName": "Alice", "age": 25 }
  ```
- **Protobuf**: Binary format, uses field tags instead of names
  ```
  Tag 1: "Alice", Tag 2: 25
  ```
  (Note: Only the tag numbers (1, 2, ...etc.) are sent, not the word "Tag" - shown here for demonstration)

**Benefits:**

- 5-10x smaller payload size
- Faster serialization/deserialization
- Strongly typed (defined in `.proto` file)
- Backward compatible (can add new fields safely)

### What is gRPC?

**gRPC** (Google Remote Procedure Call) is an RPC framework that:

- Uses **HTTP/2** (instead of HTTP/1.1 like REST)
- Supports **streaming** (server can send multiple responses)
- Enables **multiplexing** (multiple requests on one connection)
- Uses **Protobuf** for data serialization
- Makes remote calls look like local function calls

**Why gRPC over REST?**

- Better performance (binary format, HTTP/2)
- Built-in streaming support
- Strongly typed contracts (`.proto` files)
- Better for microservices communication

### The `.proto` File (The Contract)

The `.proto` file is the **contract** between client and server. It defines:

1. **Messages**: Data structures (like classes or interfaces)
2. **Services**: RPC methods (like API endpoints)
3. **Field Tags**: Numbers used for binary encoding (critical for compatibility)

**Important Rule:** Once a field tag is used in production, **never change it**. This ensures backward compatibility.

## Project Structure

```
protobuf-grpc/
├── users.proto      # Service and message definitions (the contract)
├── server.js        # gRPC server implementation
├── client.js        # gRPC client implementation
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Navigate to the project directory:

   ```bash
   cd protobuf-grpc
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### 1. Start the Server

In one terminal, start the gRPC server:

```bash
npm run start-server
```

You should see:

```
🚀 gRPC Server running on 0.0.0.0:50051
📋 Available methods:
   - GetUser (Unary)
   - GetUsersStream (Server Streaming)
```

### 2. Run the Client

In another terminal, run the client to make requests:

```bash
npm run start-client
```

The client will demonstrate:

- **Unary RPC**: Simple request-response (getting a user by ID)
- **Error Handling**: What happens when a user is not found
- **Server Streaming**: Receiving all users as a stream (one complete user object per chunk)

### Development Mode

For development with auto-reload:

```bash
# Terminal 1: Server with auto-reload
npm run dev-server

# Terminal 2: Client with auto-reload
npm run dev-client
```

## Architecture

```
Client (client.js)          Server (server.js)
     │                            │
     │  Load users.proto          │  Load users.proto
     │  (Same contract!)          │  (Same contract!)
     │                            │
     │  Create Client Stub        │  Implement Methods
     │                            │
     │  GetUser({id: '1'}) ──────>│  getUser()
     │                            │  (Find user in DB)
     │  <─────────────────────────│  callback(null, user)
     │  Response received         │
     │                            │
     │  GetUsersStream({}) ──────>│  getUsersStream()
     │  <─────────────────────────│  call.write(user1)
     │  Received user 1           │
     │  <─────────────────────────│  call.write(user2)
     │  Received user 2           │
     │  <─────────────────────────│  call.write(user3)
     │  Received user 3           │
     │  <─────────────────────────│  call.end()
     │  Stream ended              │
```

**Flow:**

1. Both client and server load the same `.proto` file
2. Server implements the service methods
3. Client creates a stub (proxy) that makes network calls
4. Client calls methods as if they were local functions
5. Server processes requests and sends responses
6. For streaming, server can send multiple responses

## Key Concepts Explained

### 1. Unary RPC (Request-Response)

**Pattern:** 1 Request → 1 Response

```javascript
// Client
client.GetUser({ id: "1" }, (error, response) => {
  // Handle response
});

// Server
function getUser(call, callback) {
  const user = findUser(call.request.id);
  callback(null, user); // Send response
}
```

**Use Cases:**

- Getting a single resource (like REST GET)
- Creating/updating a resource
- Simple queries

### 2. Server Streaming RPC

**Pattern:** 1 Request → Multiple Responses

```javascript
// Client
const stream = client.GetUsersStream({}); // Empty object = no parameters
stream.on("data", (user) => {
  // Each chunk is a complete user object
  console.log("Received user:", user.name);
});

// Server
function getUsersStream(call, callback) {
  // Stream all users, one complete user object per chunk
  usersDB.forEach((user) => {
    call.write(user); // Send complete user object
  });
  call.end(); // Close stream after all users sent
}
```

**Use Cases:**

- Streaming collections (all users, all products, etc.)
- Live data feeds (stock prices, notifications)
- Large file downloads (chunked)
- Real-time updates

### 3. Field Tags in Protobuf

Field tags are **critical** for binary encoding:

```protobuf
message UserResponse {
  string id = 1;      // Tag 1 - NEVER change this!
  string name = 2;    // Tag 2 - NEVER change this!
  int32 age = 3;      // Tag 3 - NEVER change this!
}
```

**Why tags matter:**

- In binary format, fields are identified by tags, not names
- Changing a tag breaks compatibility with old clients
- You can rename fields in code, but tags must stay the same

### 4. Error Handling

gRPC uses status codes (similar to HTTP, but different):

```javascript
// Server sends error
callback({
  code: grpc.status.NOT_FOUND, // Like HTTP 404
  details: "User not found",
});

// Client receives error
client.GetUser({ id: "999" }, (error, response) => {
  if (error) {
    console.log(error.code); // Status code
    console.log(error.details); // Error message
  }
});
```

## Dependencies

- **@grpc/grpc-js**: Official gRPC library for Node.js
- **@grpc/proto-loader**: Loads and parses `.proto` files

## Learning Path

1. **Start here**: Read `users.proto` to understand the contract
2. **Server**: Study `server.js` to see how methods are implemented
3. **Client**: Study `client.js` to see how to make RPC calls
4. **Experiment**:
   - Add new fields to messages
   - Create new RPC methods
   - Try client streaming or bidirectional streaming

## Common gRPC Status Codes

- `OK` (0): Success
- `NOT_FOUND` (5): Resource not found
- `INVALID_ARGUMENT` (3): Invalid request data
- `INTERNAL` (13): Server error
- `UNAVAILABLE` (14): Service unavailable

## When to Use gRPC

**Good for:**

- Microservices communication (backend-to-backend)
- High-performance APIs
- Real-time streaming
- Strongly typed APIs

**Not ideal for:**

- Browser clients (need gRPC-Web proxy)
- Public APIs (REST is more universal)
- Simple CRUD operations (REST might be simpler)

## Next Steps

- Learn about **Client Streaming** (client sends multiple requests)
- Learn about **Bidirectional Streaming** (both sides stream)
- Explore **gRPC-Web** for browser clients
- Study **Protobuf versioning** and backward compatibility
- Implement authentication and authorization

## Resources

- [gRPC Official Documentation](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers)
- [gRPC Node.js Tutorial](https://grpc.io/docs/languages/node/)
