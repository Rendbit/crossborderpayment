import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Destructure API_KEY from environment variables
const { API_KEY } = process.env;

// API Key Validator Middleware
export const apiKeyValidator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  // Check if the environment variable for API key is set
  if (!API_KEY) {
    res
      .status(500)
      .json({ message: "Server Error: Missing API_KEY environment variable." });
    return; // Ensure no further code is executed after the response.
  }

  // Check if the API key is provided in the request headers
  if (!apiKey) {
    res.status(400).json({ message: "Bad Request: Missing API key." });
    return; // Ensure no further code is executed after the response.
  }

  // Validate if the provided API key matches the environment variable
  if (apiKey !== API_KEY) {
    res.status(403).json({ message: "Forbidden: Invalid API key." });
    return; // Ensure no further code is executed after the response.
  }

  // If all checks pass, proceed to the next middleware or route handler
  next();
};
