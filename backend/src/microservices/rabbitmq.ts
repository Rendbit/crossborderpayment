import { connect, Channel } from "amqplib";

let channel: Channel;

export async function connectToRabbitMQ() {
  const connection = await connect(
    process.env.RABBITMQ_URL || "amqp://localhost"
  );
  channel = await connection.createChannel();
  console.log("Connected to RabbitMQ");
  return { connection, channel };
}

export async function emitEvent(pattern: string, data: any): Promise<void> {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  const exchange = "amq.topic";
  const success = channel.publish(
    exchange,
    pattern,
    Buffer.from(JSON.stringify(data)),
    { persistent: true }
  );
  if (!success) {
    throw new Error("Failed to publish RabbitMQ message");
  }
}
