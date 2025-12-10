# Project Repository

This repository contains multiple projects, each residing in its designated directory. Here's an overview of the existing projects:

## Projects

### 1. [Protobuf Project](./protobuf/README.md)

- **Directory:** `protobuf`
- **Description:** This project focuses on Protocol Buffers (Protobuf). Inside the directory, you'll find a detailed README.md file providing a tutorial about the `protobuf` technology, and how to use it.

### 2. [gRPC Project](./gRPC/README.md)

- **Directory:** `gRPC`
- **Description:** The gRPC project is centered around gRPC technology. Navigate to the `gRPC` directory to explore the README.md file, which offers insights into the project's purpose, functionality, and a tutorial on using gRPC.

### 3. [Event-Driven Architecture Project](./event-driven-architecture/README.md)

- **Directory:** `event-driven-architecture`
- **Description:** A collection of practical examples demonstrating core Event-Driven Architecture patterns and RabbitMQ concepts. This project includes multiple sub-projects covering different EDA patterns:
  - **[basics](./event-driven-architecture/basics/README.md)**: Topic Exchange Pattern - Fundamental RabbitMQ concepts including topic exchanges, pattern matching, message acknowledgment, and flow control
  - **[dead-letter-trick](./event-driven-architecture/dead-letter-trick/README.md)**: Dead Letter Exchange (DLX) Pattern - Delayed message processing and message resequencing using the Dead Letter Exchange trick
  - **[event-sourcing-CQRS](./event-driven-architecture/event-sourcing-CQRS/README.md)**: Event Sourcing & CQRS - Complete implementation with snapshot optimization, optimistic concurrency control, and idempotency handling
  - **[resequencer-pattern](./event-driven-architecture/resequencer-pattern/README.md)**: Resequencer Pattern - Handles out-of-order message processing using in-memory buffering and sequence number tracking
  - **[SAGA-pattern](./event-driven-architecture/SAGA-pattern/README.md)**: Saga Choreography - Implements distributed transactions using the Saga pattern with choreography. Features Pivot Transactions, Compensation (Rollback), Forward Recovery, and Idempotency.
- Navigate to the `event-driven-architecture` directory to explore the README.md file for detailed information about each pattern and how to run the examples.

### 4. [Redis Project](./redis/README.md)

- **Directory:** `redis`
- **Description:** A simple demonstration of Redis Pub/Sub (Publish/Subscribe) messaging pattern. This project shows how to use Redis for real-time messaging between publishers and subscribers, including examples of channel-based messaging and pattern-based subscriptions.
- Navigate to the `redis` directory to explore the README.md file for detailed information and usage examples.

### 5. [Sockets Project](./sockets/README.md)

- **Directory:** `sockets`
- **Description:** A collection of socket programming examples demonstrating both native TCP sockets and WebSocket-based real-time communication. Includes:
  - **[native-socket](./sockets/native-socket/README.md)**: Low-level TCP socket communication using Node.js `net` module
  - **[socketio](./sockets/socketio/README.md)**: High-level WebSocket-based real-time chat application with a beautiful UI
- Navigate to the `sockets` directory to explore the README.md file for detailed information about both implementations.
