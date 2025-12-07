# WebSockets & TCP Sockets Examples

A collection of socket programming examples demonstrating both native TCP sockets and WebSocket-based real-time communication. Each project focuses on different socket communication patterns and use cases.

## 📁 Projects

### [native-socket](./native-socket/README.md)

**Native TCP Sockets** - Low-level TCP socket communication using Node.js `net` module. Demonstrates raw TCP/IP programming with connection-oriented, bidirectional communication.

### [socketio](./socketio/README.md)

**Socket.IO Chat Application** - High-level WebSocket-based real-time chat application with automatic fallback support and a beautiful nature-themed user interface.

## 🚀 Getting Started

### Prerequisites

- Node.js installed

### Installation

Each folder contains its own example. Navigate to the desired folder and follow the installation instructions in its README.md file.

### Running Examples

Each folder contains its own example. Navigate to the desired folder and follow the instructions in its README.md file.

## 📚 Concepts Covered

- **TCP Sockets**: Low-level connection-oriented communication
- **WebSockets**: High-level bidirectional real-time communication
- **Event-based Communication**: Using event emitters for messaging
- **Connection Management**: Handling connections, disconnections, and errors
- **Transport Fallback**: Automatic fallback from WebSocket to polling
- **Message Broadcasting**: Sending messages to multiple clients
- **JSON Serialization**: Structured data exchange over sockets

## 📖 Learn More

Each project folder contains detailed README files explaining:

- Key concepts demonstrated
- Architecture diagrams
- Code walkthroughs
- Running instructions

Start with the [native-socket](./native-socket/README.md) folder for fundamental TCP concepts, then explore the [socketio](./socketio/README.md) folder for high-level WebSocket communication.

## 🔧 Technology Stack

- **Node.js** - Runtime environment
- **net module** - Built-in TCP socket support (native-socket)
- **Express** - Web server framework (socketio)
- **Socket.IO** - WebSocket library with fallback support (socketio)
