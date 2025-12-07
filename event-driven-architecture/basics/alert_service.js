// ============================================================================
// ALERT_SERVICE.JS - The "Error Alert" Consumer
// ============================================================================
// HOW TO RUN THIS TUTORIAL:
// 1. Start RabbitMQ.
// 2. Run this script: `node alert_service.js`
// 3. Run `node producer.js` to send messages.
//
// GOAL:
// This script demonstrates a SELECTIVE consumer that only receives ERROR
// messages. It's like a security alarm that only goes off for problems,
// not for normal events.
// ============================================================================

const amqp = require("amqplib");

async function startAlertService() {
  // ========================================================================
  // STEP 1: CONNECTION & CHANNEL (Same as Other Files)
  // ========================================================================
  // Same setup as producer and audit_log - we need a connection and channel.
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  const exchangeName = "system_events";

  // ========================================================================
  // STEP 2: assertExchange() - "Make Sure Exchange Exists"
  // ========================================================================
  // Always assert the exchange here too, in case the consumer starts before
  // the producer. This ensures the exchange exists regardless of startup order.
  //
  // The settings MUST match exactly:
  //   - Same name: "system_events"
  //   - Same type: "topic" (allows pattern matching)
  //   - Same durable: false (temporary, deleted on restart)
  await channel.assertExchange(exchangeName, "topic", { durable: false });

  // ========================================================================
  // STEP 3: assertQueue() - Creating Our Temporary Mailbox
  // ========================================================================
  // This is the SAME pattern as audit_log.js:
  //   - Empty string '' = Let RabbitMQ generate a random queue name
  //   - exclusive: true = Queue is deleted when connection closes
  //
  // Why the same pattern?
  //   - Each consumer instance needs its own queue
  //   - We want temporary queues that clean up automatically
  //   - Random names prevent conflicts if multiple alert services run
  //
  // The key difference from audit_log.js is NOT the queue setup, but the
  // BINDING PATTERN we'll use next. The queue itself works the same way.
  //
  // ========================================================================
  // CRITICAL: Understanding exclusive: false and Queue Names
  // ========================================================================
  // IMPORTANT: If you want a queue to survive a crash and allow the SAME
  // consumer to pick up exactly where it left off, you MUST provide a
  // STATIC (hardcoded) queue name, NOT an empty string!
  //
  // --- THE THREE SCENARIOS ---
  //
  // SCENARIO 1: assertQueue("", { exclusive: true })
  //   - Empty name + exclusive = Temporary queue (what we're using here)
  //   - What happens on crash & restart:
  //     * Old queue is AUTOMATICALLY DELETED when connection closed
  //     * New queue created with a NEW random name
  //     * No messages lost (because old queue was deleted)
  //   - Use case: Temporary logging, real-time monitoring (like this example)
  //
  // SCENARIO 2: assertQueue("", { exclusive: false })
  //   - Empty name + NOT exclusive = ZOMBIE QUEUE PROBLEM!
  //   - What happens on crash & restart:
  //     * Old queue SURVIVES (because exclusive: false)
  //     * But you don't know its name (it was random: "amq.gen-...")
  //     * Script creates a NEW queue with a DIFFERENT random name
  //     * Old queue becomes INACCESSIBLE (a "zombie") - messages are LOST!
  //   - Result: BAD PRACTICE - Never use this combination!
  //
  // SCENARIO 3: assertQueue("my_queue", { exclusive: false })
  //   - Static name + NOT exclusive = Persistent queue
  //   - What happens on crash & restart:
  //     * Old queue SURVIVES (because exclusive: false)
  //     * Script reconnects to the SAME queue (because name is known)
  //     * All messages are preserved and processed
  //   - Use case: Task queues, worker queues, billing systems
  //   - Example:
  //     const queueName = "billing_service_queue"; // Static, known name
  //     const q = await channel.assertQueue(queueName, {
  //       exclusive: false,  // Allows reconnection
  //       durable: true      // Ensures queue survives RabbitMQ restart too
  //     });
  //
  // SUMMARY TABLE:
  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ Code Pattern              │ After Crash & Restart                    │
  // ├─────────────────────────────────────────────────────────────────────┤
  // │ assertQueue("",           │ Old queue DELETED automatically.         │
  // │  { exclusive: true })     │ New queue created.                       │
  // │                           │ ✅ Good for temp logs (this example)     │
  // ├─────────────────────────────────────────────────────────────────────┤
  // │ assertQueue("",           │ Old queue SURVIVES but INACCESSIBLE.     │
  // │  { exclusive: false })    │ New queue created with different name.   │
  // │                           │ ❌ BAD: Messages lost in zombie queue!   │
  // ├─────────────────────────────────────────────────────────────────────┤
  // │ assertQueue("my_q",       │ Old queue SURVIVES.                       │
  // │  { exclusive: false })    │ Script reconnects to OLD queue.          │
  // │                           │ ✅ Good: No messages lost (standard)      │
  // └─────────────────────────────────────────────────────────────────────┘
  //
  // KEY TAKEAWAY:
  //   - exclusive: true + empty name = Temporary (auto-deleted)
  //   - exclusive: false + empty name = Zombie queue (BAD!)
  //   - exclusive: false + static name = Persistent queue (GOOD for workers)
  const q = await channel.assertQueue("", {
    exclusive: true,
  });

  console.log(`[*] Alert Service waiting on temporary queue: ${q.queue}`);

  // ========================================================================
  // STEP 4: bindQueue() - The SELECTIVE Filter (This is the Key Difference!)
  // ========================================================================
  // This is where alert_service.js differs from audit_log.js:
  //   - audit_log.js uses pattern "#" (matches EVERYTHING)
  //   - alert_service.js uses pattern "*.error.*" (matches ONLY errors)
  //
  // Our routing key format is: "service.severity.type"
  //   Example: "payment.error.insufficient_funds"
  //            "user.error.db_timeout"
  //
  // We want to match messages where:
  //   - service: ANY service (payment, user, order, etc.)
  //   - severity: MUST be "error"
  //   - type: ANY type (timeout, db_failure, etc.)
  //
  // ========================================================================
  // UNDERSTANDING THE PATTERN: "*.error.*"
  // ========================================================================
  // The pattern uses TWO wildcard symbols:
  //
  //   * (Star/Asterisk):
  //     - Matches EXACTLY ONE word
  //     - NOT zero words, NOT multiple words - exactly ONE
  //
  //   # (Hash/Pound):
  //     - Matches ZERO or MORE words
  //     - Can match nothing, one word, or many words
  //
  // Pattern breakdown: "*.error.*"
  //   - First "*": Matches exactly one word (the service name)
  //   - ".error": Matches the literal word "error"
  //   - Second "*": Matches exactly one word (the type)
  //
  // What matches "*.error.*"?
  //   ✅ "payment.error.timeout"     → 3 words: payment (match), error (match), timeout (match)
  //   ✅ "user.error.db"             → 3 words: user (match), error (match), db (match)
  //   ✅ "order.error.payment_failed"→ 3 words: order (match), error (match), payment_failed (match)
  //
  // What does NOT match "*.error.*"?
  //   ❌ "payment.error"             → Only 2 words (needs 3: service.error.type)
  //   ❌ "error"                      → Only 1 word (needs 3)
  //   ❌ "payment.info.started"       → Has "info" not "error"
  //   ❌ "payment.error.timeout.fatal"→ 4 words (second * only matches ONE word, not two)
  //
  // Alternative patterns (for reference):
  //   - "#.error.#": Matches errors anywhere
  //     ✅ "payment.error" (hash can match zero words)
  //     ✅ "payment.error.timeout"
  //     ✅ "payment.error.timeout.fatal" (hash can match multiple words)
  //     ✅ "error" (both hashes can match zero words)
  //
  //   - "*.error": Matches errors at the end
  //     ✅ "payment.error"
  //     ✅ "user.error"
  //     ❌ "payment.error.timeout" (has an extra word after error)
  //
  //   - "error.#": Matches errors at the start
  //     ✅ "error"
  //     ✅ "error.fatal"
  //     ❌ "payment.error" (error is not at the start)
  //
  // For our use case (service.severity.type format), "*.error.*" is perfect
  // because it ensures we have exactly 3 words with "error" in the middle.
  const bindingKey = "*.error.*";

  // This connects our queue to the exchange with the selective filter.
  // Now, ONLY messages matching "*.error.*" will be copied to our queue.
  await channel.bindQueue(q.queue, exchangeName, bindingKey);

  // ========================================================================
  // STEP 4.5: prefetch(1) - Limiting Unacknowledged Messages
  // ========================================================================
  // This is a CRITICAL setting for controlling message flow and ensuring
  // sequential processing. It limits how many unacknowledged messages
  // RabbitMQ will send to this consumer at once.
  //
  // ⚠️ CRITICAL UNDERSTANDING: prefetch ONLY works with noAck: false (manual ack)
  //
  //   noAck: true (Auto Acknowledgment):
  //     - "I trust the network. Send me everything you have as fast as possible."
  //     - prefetch is IGNORED by RabbitMQ
  //     - RabbitMQ pushes ALL available messages one by one as fast as possible
  //     - Messages are auto-acknowledged immediately upon delivery
  //     - No limit on how many messages can be in transit
  //
  //   noAck: false (Manual Acknowledgment):
  //     - "I don't trust myself. Wait until I confirm I'm done."
  //     - prefetch WORKS and limits unacknowledged messages
  //     - RabbitMQ waits for explicit acknowledgment before sending more
  //     - prefetch(1) means: send only 1 message, wait for ack, then send next
  //
  // What prefetch(1) means (with noAck: false):
  //   - RabbitMQ will send ONLY 1 unacknowledged message at a time
  //   - The consumer must call channel.ack(msg) before RabbitMQ sends the next one
  //   - This ensures messages are processed SEQUENTIALLY, one after another
  //   - Prevents overwhelming the consumer with multiple messages
  //
  // Why use prefetch(1) with manual acknowledgment?
  //   1. SEQUENTIAL PROCESSING:
  //      - Ensures messages are processed in order, one at a time
  //      - Prevents a consumer from being overwhelmed with multiple messages
  //      - Important for maintaining message order and preventing race conditions
  //
  //   2. FAIR DISTRIBUTION:
  //      - If you have multiple consumers, prefetch(1) ensures fair distribution
  //      - Without prefetch, RabbitMQ might send all messages to one fast consumer
  //      - With prefetch(1), messages are distributed evenly among consumers
  //
  //   3. MEMORY MANAGEMENT:
  //      - Prevents a single consumer from holding too many messages in memory
  //      - Each consumer only holds one unacknowledged message at a time
  //      - Reduces memory usage, especially important for high-volume systems
  //
  //   4. ERROR HANDLING:
  //      - If a consumer crashes, only 1 message needs to be requeued
  //      - Easier to debug and recover from failures
  //      - Unacknowledged messages are automatically requeued by RabbitMQ
  //
  // Example scenarios:
  //
  //   Scenario 1: prefetch(1) with noAck: false (what we're using here)
  //     - RabbitMQ sends message 1 → consumer processes → calls ack(msg)
  //     - After ack, RabbitMQ sends message 2
  //     - Consumer processes message 2 → calls ack(msg)
  //     - Result: Sequential, one at a time, guaranteed delivery
  //
  //   Scenario 2: noAck: true (prefetch is IGNORED)
  //     - RabbitMQ sends message 1 → auto-acknowledged immediately
  //     - RabbitMQ sends message 2 → auto-acknowledged immediately
  //     - RabbitMQ sends message 3 → auto-acknowledged immediately
  //     - All messages pushed as fast as possible, no limit
  //     - Result: Fast, but no control over flow, prefetch has no effect
  //
  //   Scenario 3: prefetch(0) or no prefetch with noAck: false
  //     - RabbitMQ sends ALL available messages immediately
  //     - Consumer receives messages 1, 2, 3, 4, 5... all at once
  //     - All messages held in memory waiting for acknowledgment
  //     - Result: Fast but potentially overwhelming, no sequential guarantee
  //
  // When to use different prefetch values (with noAck: false):
  //   - prefetch(1): Sequential processing, fair distribution, low memory
  //     * Use for: Critical operations, ordered processing, alerts
  //   - prefetch(10): Batch processing, moderate parallelism
  //     * Use for: Moderate throughput, some parallelism needed
  //   - prefetch(0) or no prefetch: Unlimited, maximum throughput
  //     * Use for: High-throughput, can handle parallel processing
  //
  // IMPORTANT: prefetch applies per consumer `channel.consume()`, not per queue.
  //            If you have 3 consumers on the same queue with prefetch(1),
  //            RabbitMQ can send up to 3 messages total (1 per consumer).
  await channel.prefetch(1);

  // ========================================================================
  // STEP 5: consume() - Listening for Messages
  // ========================================================================
  // This tells RabbitMQ: "Start sending me messages from this queue."
  // Whenever a message arrives in our queue, the callback function runs.
  //
  // Parameters:
  //   1. q.queue: Which queue to listen to
  //   2. (msg) => { ... }: The callback function that runs for each message
  //   3. { noAck: false }: Options object (we use manual acknowledgment)
  //
  // --- THE CALLBACK FUNCTION ---
  // When a message arrives, RabbitMQ calls this function with a message object.
  // The message object contains:
  //   - msg.content: The actual message data (a Buffer)
  //     * This is binary data - we convert it back to string with .toString()
  //     * To send JSON, use: Buffer.from(JSON.stringify(myObj))
  //     * To receive JSON, use: JSON.parse(msg.content.toString())
  //   - msg.fields.routingKey: The routing key that was used (e.g., "payment.error")
  //   - msg.properties: Message metadata (headers, timestamps, etc.)
  //   - msg.fields.deliveryTag: Unique identifier for this message delivery
  //     * Used for manual acknowledgment: channel.ack(msg) or channel.nack(msg)
  //
  // --- noAck: false (Manual Acknowledgment) - "Wait for Confirmation" ---
  // This is a CRITICAL setting that determines message delivery guarantees.
  // We use noAck: false (manual ack) in this file to demonstrate prefetch(1).
  //
  //   noAck: false (Manual Acknowledgment) - WHAT WE'RE USING HERE:
  //     - RabbitMQ waits for you to explicitly say "I finished processing"
  //     - You do this by calling: channel.ack(msg)
  //     - If your script crashes BEFORE calling ack(), RabbitMQ assumes you
  //       didn't process it and RESENDS the message to another consumer
  //     - This is SAFE but SLOWER (you must acknowledge each message)
  //     - Use this for critical operations (e.g., processing payments, alerts)
  //     - ⚠️ IMPORTANT: prefetch() ONLY works with noAck: false
  //     - With prefetch(1) + noAck: false, messages are processed sequentially
  //     - Example (what we're doing in this file):
  //       channel.consume(q.queue, (msg) => {
  //         try {
  //           // Process the message
  //           processAlert(msg.content.toString());
  //           // Tell RabbitMQ we're done (only after successful processing)
  //           channel.ack(msg); // This allows prefetch(1) to send next message
  //         } catch (error) {
  //           // If processing fails, reject and requeue
  //           channel.nack(msg, false, true); // false = don't discard, true = requeue
  //         }
  //       }, { noAck: false });
  //
  //   noAck: true (Auto Acknowledgment) - "Fire and Forget":
  //     - As soon as RabbitMQ pushes the message to your TCP socket, it
  //       IMMEDIATELY deletes it from the queue
  //     - RabbitMQ doesn't care if your script crashes 1ms later
  //     - If your script crashes, the message is LOST FOREVER
  //     - This is FAST but RISKY (no guarantee of delivery)
  //     - Use this for non-critical operations (e.g., logging, monitoring)
  //     - ⚠️ IMPORTANT: prefetch() is IGNORED with noAck: true
  //     - RabbitMQ pushes ALL messages as fast as possible
  //     - See audit_log.js for an example using noAck: true
  //
  //   Why use noAck: false for alerts (this file)?
  //     - Alerts are important - we want guaranteed delivery
  //     - If an alert is lost, we might miss a critical issue
  //     - With prefetch(1) + noAck: false, we get sequential processing
  //     - If processing fails, we can requeue the message
  //
  //   Why use noAck: true for logging (audit_log.js)?
  //     - For logging, speed is usually more important than 100% guarantee
  //     - If we lose one log entry, it's usually okay (not critical)
  //     - Logging systems prioritize throughput over perfect reliability
  //     - prefetch is ignored anyway, so no need to set it
  //
  // What happens when messages are published (with our two consumers):
  //
  // Example 1: Producer sends "user.info.login"
  //   - Exchange checks audit_log binding ("#"): ✅ MATCHES → Copy to audit queue
  //   - Exchange checks alert_service binding ("*.error.*"): ❌ NO MATCH → Skip
  //   - Result: Only audit_log.js receives it
  //
  // Example 2: Producer sends "payment.error.insufficient_funds"
  //   - Exchange checks audit_log binding ("#"): ✅ MATCHES → Copy to audit queue
  //   - Exchange checks alert_service binding ("*.error.*"): ✅ MATCHES → Copy to alert queue
  //   - Result: BOTH consumers receive it!
  //
  // This demonstrates the power of topic exchanges: ONE message can be
  // delivered to MULTIPLE queues based on different binding patterns.
  channel.consume(
    q.queue,
    (msg) => {
      // This callback only runs for messages that matched "*.error.*"
      // Since we filtered for errors, every message here is an error alert
      if (msg.content) {
        console.log(
          `[!!! ALARM !!!] ${msg.fields.routingKey}: ${msg.content.toString()}`
        );

        // Simulate processing time
        setTimeout(() => {
          // Manual acknowledgment: Tell RabbitMQ we're done processing
          // This is REQUIRED when using noAck: false
          // After this ack, RabbitMQ will send the next one message (because prefetch(1))
          channel.ack(msg);
        }, 1000);
      }
    },
    {
      noAck: false, // Manual acknowledgment - prefetch(1) will work
    }
  );
}

startAlertService();
