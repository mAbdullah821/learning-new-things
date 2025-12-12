# SAGA Pattern Examples

A collection of practical examples demonstrating the **SAGA Pattern** for managing distributed transactions in microservices architectures. This project includes both **Choreography-based** and **Orchestration-based** implementations, each showcasing different approaches to coordinating distributed workflows.

## 📁 Projects

### [choreography-based](./choreography-based/README.md)

**Decentralized SAGA Pattern** - Services communicate asynchronously via RabbitMQ events. Each service listens for events and decides what action to take independently. Features Pivot Transactions, Compensation (Rollback), Forward Recovery, and Idempotency.

### [orchestration-based](./orchestration-based/README.md)

**Centralized SAGA Pattern** - A central orchestrator manages the entire workflow using a Finite State Machine. Services communicate via direct method calls (simulating RPC/HTTP). Features State Persistence, Crash Recovery, and unified execution model.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- RabbitMQ server running (for choreography-based implementation)
  - Default: `localhost:5672`
  - Or update `choreography-based/infrastructure/config.js`

### Installation

```bash
npm install
```

### Running Examples

Each folder contains its own example. Navigate to the desired folder and follow the instructions in its README.md file.

## 📚 Concepts Covered

- **SAGA Pattern**: Breaking distributed transactions into local transactions with compensation
- **Choreography**: Decentralized coordination through events
- **Orchestration**: Centralized coordination through an orchestrator
- **Pivot Transaction**: The point of no return (typically payment)
- **Backward Recovery**: Compensation/rollback before the pivot point
- **Forward Recovery**: Retry after the pivot point
- **Idempotency**: Safe retry of operations
- **State Machine**: Managing workflow states and transitions
- **Crash Recovery**: Handling zombie sagas through state persistence

## 📖 Learn More

Each project folder contains detailed README files explaining:

- Key concepts demonstrated
- Architecture diagrams
- Code walkthroughs
- Running instructions

Start with the [orchestration-based](./orchestration-based/README.md) folder for centralized workflow management, then explore the [choreography-based](./choreography-based/README.md) folder for event-driven coordination.

## 🔧 Technology Stack

- **Node.js** - Runtime environment
- **RabbitMQ** - Message broker (choreography-based)
- **amqplib** - RabbitMQ client library (choreography-based)
