// config.js
module.exports = {
  RABBIT_URL: "amqp://localhost",

  // The "Main" System (Where work happens)
  MAIN_EXCHANGE: "work_exchange",
  MAIN_QUEUE: "work_queue",
  MAIN_ROUTING_KEY: "process_task",

  // The "Penalty Box" System (Delay)
  WAIT_EXCHANGE: "wait_exchange",
  WAIT_QUEUE: "wait_5s_queue",
  WAIT_ROUTING_KEY: "hold_it",

  DELAY_MS: 5000, // 5 Seconds wait
  MAX_RETRIES: 5, // Stop infinite loops
};
