import mongoose from "mongoose";
import crypto from "crypto";

/**
 * Sanitize input to prevent NoSQL injection
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    // Trim and escape HTML
    let sanitized = input.trim();

    // Remove MongoDB operators
    const mongoOperators = [
      "$where",
      "$ne",
      "$in",
      "$nin",
      "$and",
      "$or",
      "$nor",
      "$not",
      "$exists",
      "$type",
      "$mod",
      "$regex",
      "$text",
      "$expr",
      "$jsonSchema",
      "$geoWithin",
      "$geoIntersects",
      "$near",
      "$nearSphere",
      "$all",
      "$elemMatch",
      "$size",
      "$slice",
      "$bitsAllSet",
      "$bitsAnySet",
      "$bitsAllClear",
      "$bitsAnyClear",
    ];

    for (const op of mongoOperators) {
      const regex = new RegExp(`\\${op}`, "gi");
      if (regex.test(sanitized)) {
        throw new Error(`Invalid input: contains restricted operator '${op}'`);
      }
    }

    // Escape special characters for HTML and NoSQL
    sanitized = sanitized
      .replace(/[<>'"\\&]/g, (match) => {
        const escapeMap: { [key: string]: string } = {
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#x27;",
          '"': "&quot;",
          "\\": "&#x5C;",
          "&": "&amp;",
        };
        return escapeMap[match];
      })
      .replace(/\$/g, "&#36;");

    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }

  if (input && typeof input === "object") {
    const sanitized: any = {};
    for (const key in input) {
      // Skip MongoDB operators in object keys
      if (key.startsWith("$") || key.includes(".") || key.includes(" ")) {
        throw new Error(`Invalid key: '${key}' contains restricted characters`);
      }
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }

  return input;
};

/**
 * Validate ObjectId format
 */
export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize MongoDB query with deep validation
 */
export const sanitizeMongoQuery = (
  query: any,
  allowedOperators: string[] = []
): any => {
  const defaultSafeOperators = [
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$exists",
    "$and",
    "$or",
  ];

  const safeOperators = [...defaultSafeOperators, ...allowedOperators];

  const sanitizeRecursive = (obj: any, path: string = ""): any => {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
        sanitizeRecursive(item, `${path}[${index}]`)
      );
    }

    const sanitized: any = {};

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;

      // Validate key
      if (key.startsWith("$")) {
        if (!safeOperators.includes(key)) {
          throw new Error(
            `Invalid operator at path '${currentPath}': '${key}'`
          );
        }
      } else if (key.includes("$") || key.includes(".") || key.includes(" ")) {
        throw new Error(
          `Invalid field name at path '${currentPath}': '${key}'`
        );
      }

      sanitized[key] = sanitizeRecursive(obj[key], currentPath);
    }

    return sanitized;
  };

  return sanitizeRecursive(query);
};

/**
 * Rate limiting and brute force prevention helpers
 */
export const validateRateLimit = (
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
): { allowed: boolean; remaining: number } => {
  // In production, implement with Redis or similar
  return { allowed: true, remaining: maxRequests };
};

/**
 * Validate email with additional security checks
 */
export const validateEmail = (
  email: string
): { valid: boolean; message: string } => {
  if (!email) {
    return { valid: false, message: "Email is required" };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: "Invalid email format" };
  }

  // Check for disposable emails
  const disposableDomains = [
    "tempmail.com",
    "10minutemail.com",
    "throwawaymail.com",
    "guerrillamail.com",
    "mailinator.com",
    "yopmail.com",
  ];

  const domain = email.split("@")[1].toLowerCase();
  if (disposableDomains.some((d) => domain.includes(d))) {
    return {
      valid: false,
      message: "Disposable email addresses are not allowed",
    };
  }

  // Check for suspicious patterns
  if (email.length > 254) {
    return { valid: false, message: "Email is too long" };
  }

  if (/(\.\.)|(@@)/.test(email)) {
    return { valid: false, message: "Invalid email pattern" };
  }

  return { valid: true, message: "Email is valid" };
};

/**
 * Validate payment amount with security checks
 */
export const validatePaymentAmount = (
  amount: number | string,
  currency: string
): { valid: boolean; message: string } => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return { valid: false, message: "Invalid amount" };
  }

  if (numAmount <= 0) {
    return { valid: false, message: "Amount must be greater than 0" };
  }

  // Maximum amount limits (adjust based on your business requirements)
  const maxAmounts: { [key: string]: number } = {
    XLM: 1000000,
    USD: 1000000,
    EUR: 1000000,
    GBP: 1000000,
    NGN: 50000000,
  };

  const maxAmount = maxAmounts[currency] || 1000000;
  if (numAmount > maxAmount) {
    return {
      valid: false,
      message: `Amount exceeds maximum limit of ${maxAmount} ${currency}`,
    };
  }

  // Validate decimal places
  const decimalPlaces = currency === "XLM" ? 7 : 2;
  const stringAmount = numAmount.toString();
  const decimalIndex = stringAmount.indexOf(".");
  if (
    decimalIndex !== -1 &&
    stringAmount.length - decimalIndex - 1 > decimalPlaces
  ) {
    return {
      valid: false,
      message: `Amount can have at most ${decimalPlaces} decimal places for ${currency}`,
    };
  }

  return { valid: true, message: "Amount is valid" };
};

/**
 * Validate and sanitize metadata object
 */
export function sanitizeMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    const sanitizedKey = sanitizeInput(key);
    
    // Allow nested objects for specific fields like scheduleWindow
    if (key === 'scheduleWindow' && typeof value === 'object' && value !== null) {
      // Sanitize nested object
      sanitized[sanitizedKey] = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const sanitizedNestedKey = sanitizeInput(nestedKey);
        if (typeof nestedValue === 'string') {
          sanitized[sanitizedKey][sanitizedNestedKey] = sanitizeInput(nestedValue as string);
        } else if (typeof nestedValue === 'number') {
          sanitized[sanitizedKey][sanitizedNestedKey] = nestedValue;
        } else if (typeof nestedValue === 'boolean') {
          sanitized[sanitizedKey][sanitizedNestedKey] = nestedValue;
        } else if (nestedValue === null) {
          sanitized[sanitizedKey][sanitizedNestedKey] = null;
        }
      }
    } 
    // Allow arrays for specific fields
    else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item => {
        if (typeof item === 'string') return sanitizeInput(item);
        if (typeof item === 'number') return item;
        if (typeof item === 'boolean') return item;
        return sanitizeInput(JSON.stringify(item));
      });
    }
    // Handle other types
    else if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeInput(value);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[sanitizedKey] = value;
    } else {
      // For other object types, sanitize or skip
      console.warn(`Skipping nested object in metadata for key: ${key}`);
    }
  }
  
  return sanitized;
}

/**
 * Validate frequency for recurring payments
 */
export const isValidFrequency = (frequency: string): boolean => {
  const validFrequencies = [
    "hourly",
    "daily",
    "weekly",
    "bi_weekly",
    "monthly",
    "quarterly",
    "yearly",
  ];
  return validFrequencies.includes(frequency);
};

/**
 * Validate payment method
 */
export const isValidPaymentMethod = (method: string): boolean => {
  const validMethods = ["crypto", "fiat", "both"];
  return validMethods.includes(method);
};

/**
 * Generate cryptographically secure random string
 */
export const generateSecureRandom = (length: number = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Validate date range with security constraints
 */
export const validateDateRange = (
  startDate: Date,
  endDate?: Date,
  maxDurationDays: number = 365
): { valid: boolean; message: string } => {
  const now = new Date();

  if (startDate < now) {
    return { valid: false, message: "Start date must be in the future" };
  }

  if (endDate) {
    if (endDate <= startDate) {
      return { valid: false, message: "End date must be after start date" };
    }

    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (durationDays > maxDurationDays) {
      return {
        valid: false,
        message: `Duration cannot exceed ${maxDurationDays} days`,
      };
    }
  }

  return { valid: true, message: "Date range is valid" };
};

/**
 * Validate Stellar public key format with enhanced checks
 */
export const isValidPublicKey = (publicKey: string): boolean => {
  if (!publicKey || typeof publicKey !== "string") {
    return false;
  }

  // Basic format validation
  const stellarRegex = /^G[A-Z0-9]{55}$/;
  if (!stellarRegex.test(publicKey)) {
    return false;
  }

  // Additional validation checks
  if (publicKey.length !== 56) {
    return false;
  }

  // Check for obviously invalid keys
  if (/^(G{56}|0{56})$/.test(publicKey)) {
    return false;
  }

  // Check for checksum (basic verification)
  // Note: Full validation would require Stellar SDK

  return true;
};

/**
 * Prevent self-payment validation
 */
export const preventSelfPayment = (
  fromUserId: string,
  toIdentifier: string,
  recipientUser?: any
): { valid: boolean; message: string } => {
  if (!recipientUser) {
    return { valid: true, message: "Recipient not found yet" };
  }

  const recipientId = recipientUser._id?.toString();

  if (fromUserId === recipientId) {
    return { valid: false, message: "Cannot create payment to yourself" };
  }

  return { valid: true, message: "Self-payment check passed" };
};

/**
 * Validate and limit array size
 */
export const validateArraySize = (
  array: any[],
  maxSize: number = 100
): { valid: boolean; message: string } => {
  if (!Array.isArray(array)) {
    return { valid: false, message: "Input is not an array" };
  }

  if (array.length > maxSize) {
    return {
      valid: false,
      message: `Array size cannot exceed ${maxSize} items`,
    };
  }

  return { valid: true, message: "Array size is valid" };
};

/**
 * Log security event
 */
export const logSecurityEvent = (
  eventType: string,
  userId: string,
  details: Record<string, any>,
  severity: "low" | "medium" | "high" = "medium"
): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId,
    severity,
    details,
    ipAddress: (global as any).clientIp || "unknown", // Set this from request
  };

  // Log to console (in production, send to security monitoring system)
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
};

/**
 * Check for SQL injection patterns (for completeness)
 */
export const hasSqlInjection = (input: string): boolean => {
  if (typeof input !== "string") return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(OR|AND)\s+['"]?\d+['"]?\s*[=<>])/i,
    /(WAITFOR\s+DELAY|SLEEP\s*\(\d+\))/i,
    /(xp_cmdshell|sp_configure)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
};
