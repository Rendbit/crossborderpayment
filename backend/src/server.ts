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
    app.use("/crossborderpayment/api/auth", authRoute);
    app.use("/crossborderpayment/api/user", userRoute);
    app.use("/crossborderpayment/api/mfa", mfaRoute);
    app.use("/crossborderpayment/api/sep24", sep24Route);
    app.use("/crossborderpayment/api/horizonQuery", horizonQueryRoute);
    app.use("/crossborderpayment/api/transaction", transactionRoute);

    // Swagger Docs
    app.use(
      "/crossborderpayment/api/docs",
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
    app.get("/crossborderpayment/api", (req, res) => {
      res.send("Welcome to the RendBit Waitlist API");
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: "Route not found" });
    });

    // Start server
    const PORT = process.env.PORT || 8005;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🚀 View docs on http://localhost:${PORT}/crossborderpayment/api/docs`);
    });
  } catch (err: any) {
    console.error("❌ Failed to start app:", err);
    process.exit(1); // Force exit if critical service is down
  }
}

bootstrap();
