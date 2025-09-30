import nodemailer from "nodemailer";
import { QUEUES } from "../../common/enums/queue.enum";
import { WelcomeEmail } from "../../emailtemplates/welcome-email";
import { SendCodeEmail } from "../../emailtemplates/send-code-email";

export async function startEmailConsumers(channel: any) {
  try {
    if (!channel) throw new Error("RabbitMQ channel not initialized");

    const exchange = "amq.topic";
    await channel.assertExchange(exchange, "topic", { durable: true });

    await channel.assertQueue(QUEUES.OTP, { durable: true });
    await channel.bindQueue(QUEUES.OTP, exchange, QUEUES.OTP);

    await channel.assertQueue(QUEUES.GENERAL, { durable: true });
    await channel.bindQueue(QUEUES.GENERAL, exchange, QUEUES.GENERAL);

    // OTP email handler
    channel.consume(QUEUES.OTP, async (msg: any) => {
      if (!msg) return;
      const payload = JSON.parse(msg.content.toString());

      try {
        const smtp = nodemailer.createTransport({
          service: process.env.EMAIL_HOST,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await smtp.sendMail({
          from: process.env.EMAIL_USERNAME,
          to: payload.to.toLowerCase(),
          subject: payload.subject,
          html: SendCodeEmail(
            payload.subject,
            payload.content,
            payload.code,
            payload.username
          ),
        });
        channel.ack(msg);
      } catch (err: any) {
        console.error("❌ Failed to send OTP email:", err.message);
        channel.nack(msg, false, false);
      }
    });

    // General welcome email handler
    channel.consume(QUEUES.GENERAL, async (msg: any) => {
      if (!msg) return;
      const payload = JSON.parse(msg.content.toString());

      try {
        const smtp = nodemailer.createTransport({
          service: process.env.EMAIL_HOST,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await smtp.sendMail({
          from: process.env.EMAIL_USERNAME,
          to: payload.to.toLowerCase(),
          subject: payload.subject,
          html: WelcomeEmail(
            payload.subject,
            payload.username,
            payload.appName,
            payload.featureLink,
            payload.profileLink,
            payload.communityLink,
            payload.socialMediaLink,
            payload.supportEmail
          ),
        });
        channel.ack(msg);
      } catch (err: any) {
        console.error("❌ Failed to send general email:", err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log(" Email consumers started...");
  } catch (err: any) {
    console.error("❌ Failed to start email consumers:", err.message);
  }
}
