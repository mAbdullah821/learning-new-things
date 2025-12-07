module.exports = {
  RABBIT_URL: "amqp://localhost",
  EXCHANGE: "events_topic",
  QUEUE: "read_model_updater",
  ROUTING_KEY: "account.events",
  SNAPSHOT_THRESHOLD: 5,
};
