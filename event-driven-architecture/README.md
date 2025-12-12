# RabbitMQ Event-Driven Architecture (EDA) Examples

A collection of practical examples demonstrating core Event-Driven Architecture patterns and RabbitMQ concepts. Each project focuses on specific EDA patterns and messaging techniques commonly used in distributed systems.

## 📁 Projects

### [basics](./basics/README.md)

**Topic Exchange Pattern** - Demonstrates fundamental RabbitMQ concepts including topic exchanges, pattern matching, message acknowledgment strategies, and flow control with prefetch.

### [dead-letter-trick](./dead-letter-trick/README.md)

**Dead Letter Exchange (DLX) Pattern** - Implements delayed message processing and message resequencing using the Dead Letter Exchange trick without external schedulers.

### [event-sourcing-CQRS](./event-sourcing-CQRS/README.md)

**Event Sourcing & CQRS** - Complete implementation of Event Sourcing and CQRS patterns with snapshot optimization, optimistic concurrency control, and idempotency handling.

### [resequencer-pattern](./resequencer-pattern/README.md)

**Resequencer Pattern** - Handles out-of-order message processing using in-memory buffering and sequence number tracking.

### [SAGA-pattern](./SAGA-pattern/README.md)

**SAGA Pattern** - Comprehensive implementation of distributed transactions using the SAGA pattern. Includes both Choreography-based (event-driven) and Orchestration-based (FSM) approaches. Features Pivot Transactions, Compensation (Rollback), Forward Recovery, Idempotency, and State Persistence.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- RabbitMQ server running locally

### Installation

```bash
npm install
```

### Running Examples

Each folder contains its own example. Navigate to the desired folder and follow the instructions in its README.md file.

## 📚 Concepts Covered

- **Message Routing**: Topic exchanges, routing keys, pattern matching
- **Reliability**: Message acknowledgment, at-least-once delivery
- **Flow Control**: Prefetch limits, sequential processing
- **Delayed Processing**: Dead Letter Exchange, TTL-based delays
- **Event Sourcing**: Event store, event replay, snapshots
- **CQRS**: Command/Query separation, read model projections
- **Concurrency**: Optimistic locking, version control
- **Idempotency**: Duplicate detection, idempotent operations
- **Message Ordering**: Resequencing, sequence tracking
- **Distributed Transactions**: SAGA Pattern (Choreography & Orchestration)
- **Error Handling**: Compensation, Forward Recovery, Pivot Transactions
- **State Management**: Finite State Machines, State Persistence, Crash Recovery

## 📖 Learn More

Each project folder contains detailed README files explaining:

- Key concepts demonstrated
- Architecture diagrams
- Code walkthroughs
- Running instructions

Start with the [basics](./basics/README.md) folder for fundamental concepts, then explore the advanced patterns.

## 🔧 Technology Stack

- **Node.js** - Runtime environment
- **RabbitMQ** - Message broker
- **amqplib** - RabbitMQ client library
