# Native TCP Sockets

A simple demonstration of low-level TCP socket communication using Node.js built-in `net` module.

## Overview

This project demonstrates raw TCP/IP socket programming, showing how to establish bidirectional communication between a client and server using Node.js's native networking capabilities.

## Key Concepts Demonstrated

### 1. **TCP Socket Communication**

- **Connection-oriented**: Requires explicit connection establishment before data transfer
- **Bidirectional**: Both client and server can send and receive data
- **Stream-based**: Data flows as a continuous stream of bytes
- **Reliable**: TCP guarantees delivery and ordering of data

### 2. **Socket Events**

- **`connect`**: Fired when client successfully connects to server
- **`data`**: Fired when data is received on the socket
- **`end`**: Fired when the other end sends a FIN packet (closes connection)
- **`error`**: Fired when an error occurs

### 3. **JSON Serialization**

- Messages are serialized as JSON strings before transmission
- Received data (Buffer) is converted to string and parsed as JSON
- Enables structured data exchange over raw TCP

## Architecture

```
Client → TCP Connection → Server
         (Port 8080)
         │
         ├─ Connect event
         ├─ Data event (bidirectional)
         └─ End/Error events
```

**Flow:**

1. Client establishes TCP connection to server on port 8080
2. Server accepts connection and creates socket
3. Client sends JSON message via socket
4. Server receives data, parses JSON, and sends reply
5. Client receives reply and closes connection

## Files

- `server.js` - TCP server listening on port 8080
- `client.js` - TCP client that connects to the server

## Running the Example

**1. Start the Server:**

```bash
node server.js
```

**2. Run the Client:**
In another terminal:

```bash
node client.js
```

The client will connect, send a message, receive a reply, and disconnect.

## Key Concepts

- **Low-level Protocol**: Direct TCP/IP communication without higher-level abstractions
- **Connection-oriented**: Requires explicit connection establishment
- **Binary/Text Data**: Can send any data format (JSON in this example)
- **No External Dependencies**: Uses only Node.js built-in `net` module

## When to Use

- **Custom Protocols**: When you need to implement a custom communication protocol
- **Performance**: When you need maximum performance and minimal overhead
- **Learning**: Understanding low-level networking concepts
- **System Integration**: Integrating with systems that use raw TCP sockets
