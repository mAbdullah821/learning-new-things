// ============================================================================
// AUDIT_LOG.JS - The "Log Everything" Consumer
// ============================================================================
// HOW TO RUN THIS TUTORIAL:
// 1. Start RabbitMQ.
// 2. Run this script FIRST: `node audit_log.js`
//    - It will create a temporary queue and wait for messages.
// 3. In other terminals, run `node alert_service.js` and `node producer.js`.
//
// GOAL:
// This script demonstrates a consumer that receives ALL messages from the
// exchange. It's like a security camera that records everything that happens.
// ============================================================================

const amqp = require("amqplib");

async function startAuditLog() {
  // ========================================================================
  // STEP 1: CONNECTION & CHANNEL
  // ========================================================================
  // We establish a connection to RabbitMQ and create a channel.
  // 📖 For detailed explanation of connections and channels, see alert_service.js STEP 1
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  const exchangeName = "system_events";

  // ========================================================================
  // STEP 2: assertExchange() - "Make Sure Exchange Exists"
  // ========================================================================
  // Consumers MUST also assert the exchange (in case they start before producer).
  // Settings MUST match producer: same name, type, and durable setting.
  // 📖 For detailed explanation of exchanges, types, and durable settings, see alert_service.js STEP 2
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  // ========================================================================
  // STEP 3: assertQueue() - Creating Our Temporary Mailbox
  // ========================================================================
  // We create a temporary queue with an empty name (RabbitMQ generates random name)
  // and exclusive: true (queue auto-deletes when connection closes).
  // This is perfect for logging: we only want logs while the logger is running.
  //
  // 📖 For COMPLETE explanation including:
  //    - Why empty names vs static names
  //    - How exclusive: true works (automatic deletion)
  //    - The three scenarios (temporary, zombie queue, persistent)
  //    - Summary table of all queue patterns
  //    - When to use each pattern
  //    - The returned queue object structure
  //    See alert_service.js STEP 3
  const q = await channel.assertQueue("", { exclusive: true });

  // ========================================================================
  // STEP 4: bindQueue() - Connecting Queue to Exchange with Pattern "#"
  // ========================================================================
  // This connects our queue to the exchange with pattern "#" (hash).
  // The "#" pattern means "match EVERYTHING" - zero or more words.
  // This is why audit_log.js receives ALL messages from the exchange.
  //
  // Examples of what "#" matches:
  //   ✅ "payment.error" → MATCHES
  //   ✅ "user.info.login" → MATCHES
  //   ✅ "error" → MATCHES
  //   ✅ "a.b.c.d.e" → MATCHES (any number of words)
  //
  // 📖 For detailed explanation of:
  //    - How bindQueue works (the bridge between exchange and queue)
  //    - Pattern matching with "*" (star) vs "#" (hash)
  //    - How exchanges COPY messages to multiple queues
  //    - Alternative patterns like "*.error.*" and "payment.#"
  //    - The message routing process step-by-step
  //    See alert_service.js STEP 4
  await channel.bindQueue(q.queue, exchangeName, "#");

  console.log(`[*] Audit Log recording EVERYTHING on queue: ${q.queue}`);

  // ========================================================================
  // STEP 5: consume() - Listening for Messages
  // ========================================================================
  // This tells RabbitMQ to start sending us messages from the queue.
  // We use noAck: true (auto-acknowledge) for fast, fire-and-forget delivery.
  // Perfect for logging where speed > perfect reliability.
  //
  // ⚠️ NOTE: We do NOT use prefetch() here because:
  //    - With noAck: true, prefetch is IGNORED by RabbitMQ
  //    - RabbitMQ will push ALL messages as fast as possible
  //    - Messages are auto-acknowledged immediately upon delivery
  //    - For sequential processing with prefetch, see alert_service.js (uses noAck: false)
  //
  // 📖 For COMPLETE explanation including:
  //    - How consume() works and all parameters
  //    - The callback function and message object structure
  //    - noAck: true vs noAck: false (auto vs manual acknowledgment)
  //    - Message delivery guarantees and when to use each
  //    - Real-world analogies (certified mail vs regular mail)
  //    - Code examples for both acknowledgment modes
  //    - Performance considerations
  //    - When to use each approach for different use cases
  //    See alert_service.js STEP 5
  channel.consume(
    q.queue,
    (msg) => {
      // This callback runs for EVERY message (since we used pattern "#")
      console.log(
        `[Log File] ${msg.fields.routingKey}: ${msg.content.toString()}`
      );
    },
    { noAck: true }
  );
}

startAuditLog();
