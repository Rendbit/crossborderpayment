import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import connectDB from "./config/database";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";

// Load environment variables from .env
dotenv.config();

// Initialize Express app
const app: Application = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Default route
app.get("/api", (req: Request, res: Response) => {
  res.send("Welcome to the RendBit Waitlist API");
});

// Handle 404 (Not Found) — always JSON, never look for file
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
