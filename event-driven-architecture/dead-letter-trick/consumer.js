// consumer.js
const amqp = require("amqplib");
const config = require("./config");

// INTERNAL STATE
let expectedSeq = 1; // We expect sequence 1 to start

async function startConsumer() {
  const conn = await amqp.connect(config.RABBIT_URL);
  const channel = await conn.createChannel();

  // Ensure we don't get overwhelmed
  await channel.prefetch(1);

  console.log(`[*] Waiting for tasks. Expecting Seq: ${expectedSeq}`);

  channel.consume(config.MAIN_QUEUE, (msg) => {
    if (!msg) return;

    const content = JSON.parse(msg.content.toString());
    const incomingSeq = content.seqNum;

    // Extract Retry Count from Headers (default to 0)
    const headers = msg.properties.headers || {};
    const retryCount = headers["x-retry-count"] || 0;

    console.log(
      `\n📨 Received Seq ${incomingSeq} (Attempt: ${
        retryCount + 1
      }). Expected: ${expectedSeq}`
    );

    // --- SCENARIO 1: Happy Path ---
    if (incomingSeq === expectedSeq) {
      console.log(`   ✅ processing task ${incomingSeq}... DONE.`);
      expectedSeq++;
      channel.ack(msg);
      return;
    }

    // --- SCENARIO 2: Duplicate/Old ---
    if (incomingSeq < expectedSeq) {
      console.log(
        `   🗑️ Duplicate detected (${incomingSeq} < ${expectedSeq}). Discarding.`
      );
      channel.ack(msg);
      return;
    }

    // --- SCENARIO 3: Out of Order (The Gap) ---
    if (incomingSeq > expectedSeq) {
      // Safety Check: Avoid Infinite Loops
      if (retryCount >= config.MAX_RETRIES) {
        console.error(
          `   🚨 CRITICAL: Seq ${incomingSeq} failed ${retryCount} times. Seq ${expectedSeq} never came. Discarding.`
        );
        channel.ack(msg); // Give up
        return;
      }

      console.log(
        `   ✋ Too early! Sending to Penalty Box for ${config.DELAY_MS}ms...`
      );

      // 1. ACK to remove from Main Queue (Clean the processing line)
      channel.ack(msg);

      // 2. Publish to Wait Queue with incremented header
      channel.publish(
        config.WAIT_EXCHANGE,
        config.WAIT_ROUTING_KEY,
        msg.content,
        {
          headers: {
            ...headers,
            "x-retry-count": retryCount + 1,
          },
        }
      );
    }
  });
}

startConsumer().catch(console.error);
