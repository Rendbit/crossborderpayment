
import dotenv from "dotenv";
import httpStatus from "http-status";

// Load environment variables from .env file
dotenv.config();

// Destructure API_KEY from environment variables
const { API_KEY } = process.env;

export const apiKeyValidator = (req: any, res: any, next: any) => {
  const clientKey = req.headers["x-api-key"];
  if (req.path.includes("/docs")) {
    return next();
  }
  if (!clientKey) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      status: httpStatus.UNAUTHORIZED,
      message: "Missing API key",
      success: false,
    });
  } else if (clientKey && clientKey !== API_KEY) {
    console.log({ ExpectedKey: API_KEY, KeyFromUser: clientKey });
    return res.status(httpStatus.UNAUTHORIZED).json({
      status: httpStatus.UNAUTHORIZED,
      message: "Invalid API key",
      success: false,
    });
  }
  next();
};
