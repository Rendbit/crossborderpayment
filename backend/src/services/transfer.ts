import { Request } from "express";
import httpStatus from "http-status";
import {
  ITransferService,
  TransferData,
  TransferListData,
} from "../types/blockchain";
import { ServiceResponse } from "../types/response";
import {
  InitiateTransfer24ParamsSchema,
  InitiateTransfer24Schema,
  QueryTransfers24Schema,
} from "../validators/transfer";
import { sanitizeInput, isValidObjectId } from "../utils/security";
import { BlockchainFactory } from "../providers/blockchainFactory";

export class TransferService implements ITransferService {
  async initiateTransfer(req: Request): Promise<ServiceResponse<TransferData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as TransferData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TransferData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request parameters
      const { txType } = InitiateTransfer24ParamsSchema.parse(req.params);
      console.log(req.body, "req.body");

      // SECURITY: Validate request body with Zod
      const validatedBody = InitiateTransfer24Schema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedTxType = sanitizeInput(txType);
      const sanitizedAssetCode = sanitizeInput(validatedBody.assetCode);
      const sanitizedStellarPublicKey = sanitizeInput(
        validatedBody.stellarPublicKey
      );

      // Validate sanitized inputs
      if (!sanitizedTxType || typeof sanitizedTxType !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TransferData,
          success: false,
          message: "Invalid transaction type format",
        };
      }

      if (!sanitizedAssetCode || typeof sanitizedAssetCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TransferData,
          success: false,
          message: "Invalid asset code format",
        };
      }

      if (
        !sanitizedStellarPublicKey ||
        typeof sanitizedStellarPublicKey !== "string"
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TransferData,
          success: false,
          message: "Invalid Stellar public key format",
        };
      }

      // Optional fields sanitization
      const sanitizedAmount = validatedBody.amount
        ? sanitizeInput(validatedBody.amount)
        : undefined;
      const sanitizedDestination = validatedBody.destination
        ? sanitizeInput(validatedBody.destination)
        : undefined;
      const sanitizedMemo = validatedBody.memo
        ? sanitizeInput(validatedBody.memo)
        : undefined;
      const sanitizedMemoType = validatedBody.memoType
        ? sanitizeInput(validatedBody.memoType)
        : undefined;
      const sanitizedLang = validatedBody.lang
        ? sanitizeInput(validatedBody.lang)
        : undefined;

      // Prepare sanitized params as a single object
      const transferParams = {
        assetCode: sanitizedAssetCode,
        stellarPublicKey: sanitizedStellarPublicKey,
        ...(sanitizedAmount && { amount: sanitizedAmount }),
        ...(sanitizedDestination && { destination: sanitizedDestination }),
        ...(sanitizedMemo && { memo: sanitizedMemo }),
        ...(sanitizedMemoType && { memoType: sanitizedMemoType }),
        ...(sanitizedLang && { lang: sanitizedLang }),
        ...(validatedBody.claimableBalanceSupported !== undefined && {
          claimableBalanceSupported: validatedBody.claimableBalanceSupported,
        }),
      };

      // Call blockchain provider - passing params as a single object
      const blockchain = BlockchainFactory.getTransferProvider("stellar");
      const result = await blockchain.initiateTransfer(
        user,
        sanitizedTxType,
        transferParams.assetCode,
        transferParams.stellarPublicKey
      );

      return {
        status: httpStatus.OK,
        data: {
          json: result.data,
          authToken: result.authToken,
        },
        success: true,
        message: "Transfer initiated successfully",
      };
    } catch (error: any) {
      console.error("Error initiating transfer:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TransferData,
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
          data: {} as TransferData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as TransferData,
          success: false,
          message: error.message || "Error initiating transfer",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as TransferData,
        success: false,
        message: error.message,
      };
    }
  }

  async queryTransfers(
    req: Request
  ): Promise<ServiceResponse<TransferListData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { transactions: [] },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { transactions: [] },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters with Zod
      const validatedQuery = QueryTransfers24Schema.parse(req.query);

      // SECURITY: Sanitize all inputs
      const sanitizedAssetCode = validatedQuery.assetCode
        ? sanitizeInput(validatedQuery.assetCode)
        : undefined;

      const sanitizedNoOlderThan = validatedQuery.noOlderThan
        ? sanitizeInput(validatedQuery.noOlderThan)
        : undefined;

      const sanitizedLimit = sanitizeInput(validatedQuery.limit.toString());
      const sanitizedKind = validatedQuery.kind
        ? sanitizeInput(validatedQuery.kind)
        : undefined;

      const sanitizedPagingId = validatedQuery.pagingId
        ? sanitizeInput(validatedQuery.pagingId)
        : undefined;

      // Validate sanitized asset code if present
      if (
        sanitizedAssetCode &&
        (typeof sanitizedAssetCode !== "string" ||
          sanitizedAssetCode.length > 12)
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { transactions: [] },
          success: false,
          message: "Invalid asset code format",
        };
      }

      // Validate sanitized kind if present
      if (sanitizedKind && !["deposit", "withdrawal"].includes(sanitizedKind)) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { transactions: [] },
          success: false,
          message: "Invalid transaction kind",
        };
      }

      // Prepare sanitized query params
      const sanitizedParams: any = {
        ...(sanitizedAssetCode && { assetCode: sanitizedAssetCode }),
        ...(sanitizedNoOlderThan && { noOlderThan: sanitizedNoOlderThan }),
        limit: parseInt(sanitizedLimit, 10),
        ...(sanitizedKind && { kind: sanitizedKind }),
        ...(sanitizedPagingId && { pagingId: sanitizedPagingId }),
      };

      // Call blockchain provider
      const blockchain = BlockchainFactory.getTransferProvider("stellar");
      const result = await blockchain.queryTransfers(user, sanitizedParams);

      // Handle provider response - adjust based on actual response structure
      const transactions = Array.isArray(result)
        ? result
        : result.transactions || [];

      const responseData = {
        transactions,
        // Add default pagination for consistency
        pagination: {
          page: 1,
          limit: sanitizedParams.limit,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / sanitizedParams.limit),
        },
      };

      return {
        status: httpStatus.OK,
        data: responseData,
        success: true,
        message: "Transfers queried successfully",
      };
    } catch (error: any) {
      console.error("Error querying transfers:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { transactions: [] },
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
          data: { transactions: [] },
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: { transactions: [] },
          success: false,
          message: error.message || "Error querying transfers",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { transactions: [] },
        success: false,
        message: error.message,
      };
    }
  }
}

// Create and export service instance
export const transferService = new TransferService();
