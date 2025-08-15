import crypto from "crypto";
import httpStatus from "http-status";

// In-memory store for tokens
const tokenStore = new Map<
  string,
  {
    data: any;
    expires: number;
    consumed?: boolean;
  }
>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(token);
    }
  }
}, 3600000); // 1 hour

/**
 * Generates a secure confirmation token for transaction verification
 * @param payload The transaction details to be secured
 * @param ttl Time-to-live in milliseconds (default: 5 minutes)
 * @returns {string} Generated token
 */
export function generateConfirmationToken(
  payload: any,
  ttl: number = 300000
): string {
  // Create a unique token
  const token = crypto.randomBytes(32).toString("hex");

  // Store the token with expiration
  tokenStore.set(token, {
    data: payload,
    expires: Date.now() + ttl,
    consumed: false,
  });

  return token;
}

/**
 * Validates a confirmation token
 * @param token The token to validate
 * @param currentParams Current request parameters to match against token data
 * @returns {boolean} True if valid, false otherwise
 */
export function validateToken(token: string, currentParams: any): boolean {
  const storedData = tokenStore.get(token);

  // Token doesn't exist
  if (!storedData) return false;

  // Token expired
  if (storedData.expires < Date.now()) {
    tokenStore.delete(token);
    return false;
  }

  // Token already used
  if (storedData.consumed) return false;

  // Verify critical parameters match
  const requiredParams = [
    "sourceAddress",
    "destinationAddress",
    "asset",
    "amount",
    "totalDebit",
  ];

  for (const param of requiredParams) {
    if (
      JSON.stringify(storedData.data[param]) !==
      JSON.stringify(currentParams[param])
    ) {
      return false;
    }
  }

  // Mark token as consumed
  storedData.consumed = true;
  tokenStore.set(token, storedData);

  return true;
}

/**
 * Middleware to validate confirmation tokens
 */
export const validateConfirmationToken = (req: any, res: any, next: any) => {
  const token = req.body.confirmationToken;

  if (!token) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Confirmation token is required",
      status: httpStatus.BAD_REQUEST,
      success: false,
    });
  }

  if (!validateToken(token, req.body)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Invalid or expired confirmation token",
      status: httpStatus.BAD_REQUEST,
      success: false,
    });
  }

  next();
};
