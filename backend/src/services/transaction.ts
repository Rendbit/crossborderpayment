// services/transaction/transaction.service.ts
import { Request } from "express";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { TransactionHistory } from "../models/TransactionHistory";
import {
  ITransactionService,
  TrustlineData,
  PaymentPreviewData,
  PaymentData,
  SwapPreviewData,
  SwapData,
  StrictSendPreviewData,
  StrictSendData,
  StrictReceivePreviewData,
  StrictReceiveData,
  TransactionsData,
  FiatTransactionsData,
} from "../types/blockchain";
import { ServiceResponse } from "../types/response";
import {
  AddTrustlineSchema,
  RemoveTrustlineSchema,
  PaymentPreviewSchema,
  PaymentSchema,
  SwapPreviewSchema,
  SwapSchema,
  StrictSendPreviewSchema,
  StrictSendSchema,
  StrictReceivePreviewSchema,
  StrictReceiveSchema,
  GetTransactionsSchema,
  GetFiatTransactionsSchema,
} from "../validators/transaction";
import { sanitizeInput, isValidObjectId } from "../utils/security";
import { BlockchainFactory } from "../providers/blockchainFactory";

export class TransactionService implements ITransactionService {
  async addTrustline(req: Request): Promise<ServiceResponse<TrustlineData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as TrustlineData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      AddTrustlineSchema.parse(req.body);

      const { assetCode } = req.body;

      // SECURITY: Sanitize asset code
      const sanitizedAssetCode = sanitizeInput(assetCode);
      if (!sanitizedAssetCode || typeof sanitizedAssetCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: "Invalid asset code format",
        };
      }

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.addTrustline(user, sanitizedAssetCode);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error adding trustline:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as TrustlineData,
          success: false,
          message: error.message || "Error adding trustline",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as TrustlineData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async removeTrustline(req: Request): Promise<ServiceResponse<TrustlineData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as TrustlineData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      RemoveTrustlineSchema.parse(req.body);

      const { assetCode } = req.body;

      // SECURITY: Sanitize asset code
      const sanitizedAssetCode = sanitizeInput(assetCode);
      if (!sanitizedAssetCode || typeof sanitizedAssetCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: "Invalid asset code format",
        };
      }

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.removeTrustline(user, sanitizedAssetCode);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error removing trustline:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustlineData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as TrustlineData,
          success: false,
          message: error.message || "Error removing trustline",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as TrustlineData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async paymentPreview(
    req: Request
  ): Promise<ServiceResponse<PaymentPreviewData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as PaymentPreviewData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentPreviewData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      PaymentPreviewSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.paymentPreview(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error generating payment preview:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentPreviewData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentPreviewData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as PaymentPreviewData,
          success: false,
          message: error.message || "Error generating payment preview",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentPreviewData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async payment(req: Request): Promise<ServiceResponse<PaymentData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { hash: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      PaymentSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.payment(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error processing payment:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: { hash: "" },
          success: false,
          message: error.message || "Error processing payment",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { hash: "" },
        success: false,
        message: "Internal server error",
      };
    }
  }

  async swapPreview(req: Request): Promise<ServiceResponse<SwapPreviewData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as SwapPreviewData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as SwapPreviewData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      SwapPreviewSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.swapPreview(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error generating swap preview:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as SwapPreviewData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as SwapPreviewData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as SwapPreviewData,
          success: false,
          message: error.message || "Error generating swap preview",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as SwapPreviewData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async swap(req: Request): Promise<ServiceResponse<SwapData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { hash: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      SwapSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const result = await blockchain.swap(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error processing swap:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: { hash: "" },
          success: false,
          message: error.message || "Error processing swap",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { hash: "" },
        success: false,
        message: "Internal server error",
      };
    }
  }

  async strictSendPreview(
    req: Request
  ): Promise<ServiceResponse<StrictSendPreviewData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as StrictSendPreviewData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictSendPreviewData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      StrictSendPreviewSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const result = await blockchain.strictSendPreview(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error generating strict send preview:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictSendPreviewData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictSendPreviewData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as StrictSendPreviewData,
          success: false,
          message: error.message || "Error generating strict send preview",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as StrictSendPreviewData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async strictSend(req: Request): Promise<ServiceResponse<StrictSendData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { hash: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      StrictSendSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const result = await blockchain.strictSend(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error processing strict send:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: { hash: "" },
          success: false,
          message: error.message || "Error processing strict send",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { hash: "" },
        success: false,
        message: "Internal server error",
      };
    }
  }

  async strictReceivePreview(
    req: Request
  ): Promise<ServiceResponse<StrictReceivePreviewData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as StrictReceivePreviewData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictReceivePreviewData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      StrictReceivePreviewSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");
      const result = await blockchain.strictReceivePreview(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error generating strict receive preview:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictReceivePreviewData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as StrictReceivePreviewData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as StrictReceivePreviewData,
          success: false,
          message: error.message || "Error generating strict receive preview",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as StrictReceivePreviewData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async strictReceive(
    req: Request
  ): Promise<ServiceResponse<StrictReceiveData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { hash: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      StrictReceiveSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedBody = sanitizeInput(req.body);
      const params = { ...sanitizedBody, user };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const result = await blockchain.strictReceive(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error processing strict receive:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { hash: "" },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: { hash: "" },
          success: false,
          message: error.message || "Error processing strict receive",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { hash: "" },
        success: false,
        message: "Internal server error",
      };
    }
  }

  async getTransactions(
    req: Request
  ): Promise<ServiceResponse<TransactionsData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {
            paging: { next: null, prev: null, count: 0, cursor: null },
            transactions: [],
          },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            paging: { next: null, prev: null, count: 0, cursor: null },
            transactions: [],
          },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters
      GetTransactionsSchema.parse(req.query);

      // SECURITY: Sanitize query parameters
      const { cursor, limit = 10, order = "desc" } = req.query;
      const sanitizedCursor = cursor
        ? sanitizeInput(cursor as string)
        : undefined;
      const sanitizedLimit = sanitizeInput(limit as string);
      const sanitizedOrder = sanitizeInput(order as string);

      const params = {
        user,
        cursor: sanitizedCursor,
        limit: parseInt(sanitizedLimit, 10),
        order: sanitizedOrder as "asc" | "desc",
      };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransactionProvider("stellar");

      const result = await blockchain.getTransactions(params);
      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      console.error("Error fetching transactions:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            paging: { next: null, prev: null, count: 0, cursor: null },
            transactions: [],
          },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            paging: { next: null, prev: null, count: 0, cursor: null },
            transactions: [],
          },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {
            paging: { next: null, prev: null, count: 0, cursor: null },
            transactions: [],
          },
          success: false,
          message: error.message || "Error fetching transactions",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {
          paging: { next: null, prev: null, count: 0, cursor: null },
          transactions: [],
        },
        success: false,
        message: "Internal server error",
      };
    }
  }

  async getFiatTransactions(
    req: Request
  ): Promise<ServiceResponse<FiatTransactionsData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters
      GetFiatTransactionsSchema.parse(req.query);

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // SECURITY: Use Mongoose with validated ObjectId
      const [fiatTransactions, total] = await Promise.all([
        TransactionHistory.find({
          user: new Types.ObjectId(user._id.toString()),
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        TransactionHistory.countDocuments({
          user: new Types.ObjectId(user._id.toString()),
        }),
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      return {
        status: httpStatus.OK,
        data: {
          transactions: fiatTransactions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
          },
        },
        success: true,
        message: "Fiat transactions retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error fetching fiat transactions:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
          success: false,
          message: error.message || "Error fetching fiat transactions",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {
          transactions: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
        success: false,
        message: "Internal server error",
      };
    }
  }

  // Helper method to handle errors consistently
  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);

    // Extract meaningful error message
    const errorMessage =
      error.message ||
      error.response?.data?.message ||
      error.msg ||
      defaultMessage;

    // Create standardized error object
    const standardizedError = new Error(errorMessage);
    (standardizedError as any).originalError = error;
    (standardizedError as any).status = error.status || 500;

    return standardizedError;
  }
}

// Create and export service instance
export const transactionService = new TransactionService();
