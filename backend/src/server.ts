import express, { Application } from "express";
import dotenv from "dotenv";
import connectDB from "./config/database";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import { connectToRabbitMQ } from "./microservices/rabbitmq";
import { internalCacheService } from "./microservices/redis";
import authRoute from "./routes/auth";
import userRoute from "./routes/user";
import mfaRoute from "./routes/mfa";
import sep24Route from "./routes/sep24";
import statsRoute from "./routes/stats";
import horizonQueryRoute from "./routes/horizonQueries";
import transactionRoute from "./routes/transaction";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger";
import { startEmailConsumers } from "./events/user/message";
import { apiKeyValidator } from "./middlewares/apiKeyValidator";

// Load environment variables from .env
dotenv.config();

// Initialize Express app
const app: Application = express();

async function bootstrap() {
  try {
    // Connect to MongoDB
    connectDB();

    const { channel } = await connectToRabbitMQ(); // RabbitMQ

    await internalCacheService.checkConnection(); // Redis
    startEmailConsumers(channel);

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use(morgan("dev"));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(apiKeyValidator);

    // Routes
    app.use("/api/auth", authRoute);
    app.use("/api/user", userRoute);
    app.use("/api/mfa", mfaRoute);
    app.use("/api/sep24", sep24Route);
    app.use("/api/horizonQueries", horizonQueryRoute);
    app.use("/api/transaction", transactionRoute);
    app.use("/api/stats", statsRoute);

    // Swagger Docs
    app.use(
      "/api/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        swaggerOptions: {
          docExpansion: "none",
          persistAuthorization: true,
          authAction: {
            AuthorizeApiKey: {
              type: "apiKey",
              name: "x-api-key",
              in: "header",
            },
            AuthorizeJWT: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      })
    );

    // Default route
    app.get("/api", (req, res) => {
      res.send("Welcome to the RendBit Waitlist API");
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: "Route not found", success: false });
    });

    // Start server
    const PORT = process.env.PORT || 8005;
    app.listen(PORT, () => {
      console.log(
        ` Server is running on ${process.env.BASE_URL}${
          process.env.NODE_ENV === "production" ? "" : `:${PORT}`
        }/api`
      );
      console.log(` View docs on ${process.env.BASE_URL}/api/docs`);
    });
  } catch (err: any) {
    console.error("❌ Failed to start app:", err);
    process.exit(1); // Force exit if critical service is down
  }
}

bootstrap();
