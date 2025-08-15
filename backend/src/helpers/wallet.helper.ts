/**
 * A helper class for interacting with the Stellar network, providing utility methods
 * for executing transactions, validating Stellar addresses, and retrieving payment paths.
 *
 * This class includes methods to:
 * - Execute Stellar transactions and monitor their status.
 * - Validate Stellar public keys.
 * - Retrieve payment paths for both strict-receive and strict-send scenarios.
 *
 * The methods in this class rely on the Stellar SDK, Stellar Base, and the Horizon API
 * to perform operations on the Stellar network. It supports both public and testnet environments,
 * dynamically configuring endpoints based on environment variables.
 *
 * @remarks
 * - Ensure that the required environment variables (`STELLAR_NETWORK`, `STELLAR_PUBLIC_SERVER`,
 *   `STELLAR_TESTNET_SERVER`, `HORIZON_MAINNET_URL`, `HORIZON_TESTNET_URL`) are properly set.
 * - This class is designed to handle both "native" assets (e.g., XLM) and issued assets
 *   with either 4-character or 12-character codes.
 */
import StellarSdk from "@stellar/stellar-sdk";
import StellarBase from "stellar-base";
import { STELLAR_ERRORS } from "../common/messages/stellarErrors";

const reasonMap: Record<string, Record<string, string>> = {
  // Common Operations
  common: {
    op_underfunded: "Insufficient funds to complete the transaction.",
    op_low_reserve: "Account doesn’t meet the minimum XLM reserve requirement.",
    op_no_trust: "Recipient has not trusted the asset you’re sending.",
    op_not_authorized: "Recipient is not authorized to hold this asset.",
    op_no_destination: "Recipient address does not exist on the network.",
    op_line_full: "Recipient account cannot hold more of this asset.",
    op_malformed:
      "Transaction details are malformed. Please check and try again.",
    op_duplicate: "This operation has already been applied.",
    op_invalid_limit: "The specified limit is invalid.",
  },

  // Specific Operation Failures
  changeTrust: {
    op_no_trust:
      "You have not established trust with the asset you’re trying to accept.",
    op_invalid_limit: "The trust line limit is invalid or cannot be set.",
    op_asset_not_found:
      "The asset you're trying to set trust for is not found on the network.",
  },

  strictSend: {
    op_no_authorized: "You are not authorized to send this asset.",
    op_underfunded:
      "Insufficient funds in your account to send the specified amount.",
    op_insufficient_balance:
      "Your account doesn't have enough balance to complete the transaction.",
  },

  strictReceive: {
    op_no_trust: "You do not trust the asset you are trying to receive.",
    op_no_authorized: "You are not authorized to receive this asset.",
    op_underfunded:
      "Your account doesn't have enough balance to fulfill this request.",
    op_invalid_amount:
      "The amount you're trying to receive is invalid or malformed.",
    pathPaymentStrictReceive:
      "The path payment strict receive failed. Please check the payment path and amounts.",
  },

  payment: {
    op_no_trust: "Recipient does not trust the asset you are sending.",
    op_no_destination: "Recipient's account address does not exist.",
    op_low_balance: "Your balance is too low to send the asset.",
    op_line_full: "Recipient cannot accept more of the asset.",
  },

  manageOffer: {
    op_offer_not_found: "The offer you’re trying to manage does not exist.",
    op_invalid_offer:
      "The offer you’re trying to manage is invalid or malformed.",
    op_sell_not_authorized: "You are not authorized to sell the asset.",
    op_buy_not_authorized: "You are not authorized to buy the asset.",
  },

  swap: {
    op_invalid_swap: "The swap operation failed due to invalid parameters.",
    op_swap_not_possible: "The requested swap cannot be completed.",
    op_underfunded: "Insufficient funds to execute the swap operation.",
    op_trustline_not_found:
      "One of the assets involved in the swap is not trusted.",
  },
};

export class WalletHelper {
  /**
   * Executes a Stellar transaction using the provided transaction object and keypair.
   * This function interacts with the Stellar Soroban RPC server to submit and monitor
   * the transaction status until it is either successful or fails.
   *
   * @param transaction - The Stellar transaction object to be executed. Must not be an empty string.
   * @param keypair - The Stellar keypair used to sign the transaction.
   *
   * @returns A promise that resolves to an object containing the transaction status:
   * - `status: true` if the transaction is successful, along with the `value` (if available) and `hash`.
   * - `status: false` if the transaction fails, along with an error `msg`.
   *
   * @throws Will catch and log any errors encountered during the transaction execution process.
   */
  static async execTranst(transaction: any, keypair: any, type: string) {
    if (!transaction) {
      return {
        status: false,
        msg: "No transaction provided",
        userMessage: "Transaction failed: No transaction data provided",
        details: { type: "validation" },
      };
    }

    const server = new StellarSdk.SorobanRpc.Server(
      process.env.STELLAR_NETWORK === "public"
        ? process.env.STELLAR_PUBLIC_SERVER
        : process.env.STELLAR_TESTNET_SERVER
    );

    // Helper to extract asset code from XDR
    const getAssetCode = (asset: any): string => {
      if (!asset) return "unknown asset";
      try {
        if (asset.isNative()) return "XLM";
        const code = asset.alphaNum4()?.code || asset.alphaNum12()?.code;
        return code || "unknown asset";
      } catch (e) {
        return "unknown asset";
      }
    };

    // Enhanced asset message formatter
    const formatAssetMessage = (details: any, baseMsg: string): string => {
      if (!details) return baseMsg;

      let assetCode = "unknown asset";

      if (details.noTrust) {
        const asset = details.noTrust?.asset || details.noTrust();
        assetCode = getAssetCode(asset);
      } else if (details.underfunded) {
        const asset = details.underfunded?.asset || details.underfunded();
        assetCode = getAssetCode(asset);
      } else if (details.lineFull) {
        const asset = details.lineFull?.asset || details.lineFull();
        assetCode = getAssetCode(asset);
      } else if (details.asset) {
        assetCode = getAssetCode(details.asset);
      }

      return baseMsg.replace(/{asset}/g, assetCode);
    };

    try {
      transaction.sign(keypair);
      const sendResponse = await server.sendTransaction(transaction);
      const hsh = sendResponse.hash;

      if (sendResponse.status === "PENDING") {
        let getResponse = await server.getTransaction(hsh);
        let retries = 30;

        while (getResponse.status === "NOT_FOUND" && retries-- > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getResponse = await server.getTransaction(hsh);
        }

        if (retries <= 0) {
          return {
            status: false,
            msg: "Transaction timeout",
            userMessage:
              STELLAR_ERRORS["txTOO_LATE"] || "Transaction timed out",
            details: {
              hash: hsh,
              lastStatus: getResponse.status,
              timeout: true,
            },
          };
        }

        // Parse XDR safely
        const parseXDR = (xdr: any, type: any) => {
          try {
            if (!xdr) return null;
            if (xdr._attributes || xdr._switch) return xdr;
            const base64 =
              typeof xdr === "string" ? xdr : xdr.toString("base64");
            return type.fromXDR(base64, "base64");
          } catch (e) {
            console.warn("XDR parse error:", e);
            return null;
          }
        };

        const resultXdr = parseXDR(
          getResponse.resultXdr,
          StellarSdk.xdr.TransactionResult
        );

        if (getResponse.status === "SUCCESS") {
          return {
            status: true,
            hash: hsh,
            msg: "Transaction succeeded",
            userMessage: "Transaction completed successfully",
            details: {
              resultXdr,
              meta: parseXDR(
                getResponse.resultMetaXdr,
                StellarSdk.xdr.TransactionMeta
              ),
              envelope: parseXDR(
                getResponse.envelopeXdr,
                StellarSdk.xdr.TransactionEnvelope
              ),
            },
          };
        } else {
          // Extract detailed operation information
          const operations =
            resultXdr
              ?.result()
              ?.results()
              ?.map((op: any) => {
                const operationType = op.tr().switch().name;
                const operationResult = op.tr().value();
                const errorResult = operationResult.switch();
                return {
                  operationType,
                  errorCode: errorResult.name,
                  fullErrorCode: `${operationType}${errorResult.name}`,
                  details: operationResult.value(),
                };
              }) || [];

          const firstOp = operations[0] || {};
          const errorCode = firstOp.errorCode || getResponse.status;
          const fullErrorCode = firstOp.fullErrorCode || errorCode;

          // Get and format error message
          let userMessage =
            STELLAR_ERRORS[fullErrorCode] ||
            STELLAR_ERRORS[errorCode] ||
            STELLAR_ERRORS["default"];

          userMessage = formatAssetMessage(firstOp.details, userMessage);

          return {
            status: false,
            msg: `Transaction failed: ${fullErrorCode}`,
            userMessage,
            details: {
              hash: hsh,
              status: getResponse.status,
              operationType: firstOp.operationType,
              errorCode,
              fullErrorCode,
              operations,
              resultXdr,
              network: process.env.STELLAR_NETWORK,
              timestamp: new Date().toISOString(),
            },
          };
        }
      } else {
        return {
          status: false,
          msg: "Transaction submission failed",
          userMessage:
            STELLAR_ERRORS["txBAD_AUTH"] || "Failed to submit transaction",
          details: {
            submitResponse: sendResponse,
            status: sendResponse.status,
            error: sendResponse.error,
          },
        };
      }
    } catch (err: any) {
      console.error("Transaction processing error:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });

      let userMessage = STELLAR_ERRORS["default"];

      // Enhanced error handling with asset details
      if (err.message.includes("minimum amount")) {
        userMessage = "Amount below minimum limit (0.0000001).";
      } else if (err.message.includes("asset not found")) {
        const assetMatch = err.message.match(/asset: ([^\s]+)/);
        const asset = assetMatch ? assetMatch[1] : "unknown asset";
        userMessage = `Unsupported asset (${asset}) - check asset details.`;
      } else if (err.message.includes("no trustline")) {
        const assetMatch = err.message.match(/asset: ([^\s]+)/);
        const asset = assetMatch ? assetMatch[1] : "unknown asset";
        userMessage = `Missing trustline for ${asset}. Please add it to your wallet first.`;
      } else if (err.message.includes("insufficient balance")) {
        const assetMatch = err.message.match(/for asset: ([^\s]+)/);
        const asset = assetMatch ? assetMatch[1] : "unknown asset";
        userMessage = `Insufficient balance of ${asset}. Please deposit more funds.`;
      }

      return {
        status: false,
        msg: err.message,
        userMessage,
        details: {
          name: err.name,
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        },
      };
    }
  }

  static decodeError(opResult: any, code: string) {
    const switchType = opResult._switch;
    if (switchType === code) {
      const errorCondition = opResult._value._arm;

      // If errorCondition exists, format the message dynamically
      if (errorCondition) {
        // Remove "pathPaymentStrictReceive" prefix for user-friendly error
        const userFriendlyError = errorCondition.replace(code, "");
        const errorMessage = `Error with transaction: ${userFriendlyError
          .replace(/([A-Z])/g, " $1")
          .trim()}.`;

        console.log({ errorMessage });

        return { status: false, msg: errorMessage };
      }
    }

    return { status: false, msg: "Transaction failed." };
  }

  static handleTransactionError(operationType: string, code: string) {
    const friendlyMsg = this.getFriendlyMessage(operationType, code);
    return { status: false, msg: friendlyMsg };
  }

  static getFriendlyMessage(operationType: string, code: string) {
    const typeMap = reasonMap[operationType] || reasonMap.common;

    if (typeMap) {
      return (
        typeMap[code] || `Transaction failed due to: ${code.replace(/_/g, " ")}`
      );
    }
    return `Transaction failed due to: ${code.replace(/_/g, " ")}`;
  }

  /**
   * Validates whether the provided address is a valid Stellar public key.
   *
   * This method checks if the given address conforms to the Ed25519 public key format
   * used in the Stellar network. It ensures that the address is properly structured
   * and can be used as a valid Stellar account identifier.
   *
   * @param address - The Stellar address to validate.
   * @returns A boolean indicating whether the address is a valid Stellar public key.
   */
  static isValidStellarAddress(address: string) {
    // Validate the provided address using StellarBase's StrKey utility
    // to check if it is a valid Ed25519 public key.
    return StellarBase.StrKey.isValidEd25519PublicKey(address);
  }

  /**
   * Retrieves the payment path for a specified destination asset and amount
   * using the Stellar network's strict-receive pathfinding endpoint.
   *
   * @param params - An object containing the following properties:
   *   - `sourceAssetCode` (string): The code of the source asset (e.g., "USD").
   *   - `sourceAssetIssuer` (string): The issuer of the source asset or "native" for XLM.
   *   - `desAssetCode` (string): The code of the destination asset (e.g., "EUR").
   *   - `desAssetIssuer` (string): The issuer of the destination asset or "native" for XLM.
   *   - `amount` (string): The amount of the destination asset to receive.
   *
   * @returns A promise that resolves to an object containing the payment path data:
   *   - `data.receivePaymentPath` (Array): An array of payment path records.
   *
   * @throws An error if the request to the Stellar network fails or if the response is not successful.
   *
   * @remarks
   * This function dynamically constructs the URL for the Stellar Horizon API
   * based on the provided parameters and the environment configuration
   * (`STELLAR_NETWORK`, `HORIZON_MAINNET_URL`, `HORIZON_TESTNET_URL`).
   *
   * The function handles both "native" assets (e.g., XLM) and issued assets
   * with either 4-character or 12-character codes.
   */
  static async receivePaymentPath(params: any) {
    try {
      const {
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount,
      } = params;

      // Construct the base URL for the Stellar Horizon API based on the network environment
      let url = `${
        process.env.STELLAR_NETWORK === "public"
          ? process.env.HORIZON_MAINNET_URL
          : process.env.HORIZON_TESTNET_URL
      }/paths/strict-receive`;

      // Append query parameters for source and destination assets
      url += `?source_assets=${
        sourceAssetIssuer === "native"
          ? "native"
          : sourceAssetCode + ":" + sourceAssetIssuer
      }&destination_asset_type=${
        desAssetIssuer === "native"
          ? "native"
          : desAssetCode.length <= 4
          ? "credit_alphanum4"
          : "credit_alphanum12"
      }&destination_amount=${amount}`;

      // Include destination asset issuer and code if not "native"
      if (desAssetIssuer !== "native")
        url += `&destination_asset_issuer=${desAssetIssuer}&destination_asset_code=${desAssetCode}`;

      // Make the API request to fetch the payment path
      const resp = await fetch(url);
      if (!resp.ok) {
        console.log("Error receiving payment path.", resp);
        throw new Error("Error receiving payment path."); // Handle non-OK responses
      }

      // Parse the response JSON and extract the payment path records
      const resps = await resp.json();
      return {
        data: { receivePaymentPath: (resps._embedded || {}).records || [] },
      };
    } catch (e) {
      // Log and rethrow the error for further handling
      console.log("Error receiving payment path.", e);
      throw new Error("Error receiving payment path.");
    }
  }

  /**
   * Sends a payment path request to the Stellar network to determine the optimal path
   * for transferring assets between a source and destination.
   *
   * @param params - An object containing the parameters for the payment path request.
   * @param params.sourceAssetCode - The code of the source asset (e.g., "USD", "EUR").
   * @param params.sourceAssetIssuer - The issuer of the source asset or "native" for XLM.
   * @param params.desAssetCode - The code of the destination asset.
   * @param params.desAssetIssuer - The issuer of the destination asset or "native" for XLM.
   * @param params.amount - The amount of the source asset to send.
   *
   * @returns A promise that resolves to an object containing the payment path data.
   *          The data includes an array of records representing the available paths.
   *
   * @throws An error if the request to the Stellar network fails or if the response is invalid.
   *
   * @remarks
   * - The function dynamically constructs the URL based on the provided parameters and
   *   the Stellar network environment (public or testnet).
   * - It uses the Horizon API's `/paths/strict-send` endpoint to fetch the payment paths.
   * - Ensure that the environment variables `STELLAR_NETWORK`, `HORIZON_MAINNET_URL`,
   *   and `HORIZON_TESTNET_URL` are properly configured.
   */
  static async sendPaymentPath(params: any) {
    try {
      const {
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount,
      } = params;

      // Construct the base URL for the Stellar Horizon API based on the network environment
      let url = `${
        process.env.STELLAR_NETWORK === "public"
          ? process.env.HORIZON_MAINNET_URL
          : process.env.HORIZON_TESTNET_URL
      }/paths/strict-send`;

      // Append query parameters for destination and source assets
      url += `?destination_assets=${
        desAssetIssuer === "native"
          ? "native"
          : desAssetCode + "%3A" + desAssetIssuer
      }&source_asset_type=${
        sourceAssetIssuer === "native"
          ? "native"
          : sourceAssetCode.length <= 4
          ? "credit_alphanum4"
          : "credit_alphanum12"
      }&source_amount=${amount}`;

      // Include source asset issuer and code if not "native"
      if (sourceAssetIssuer !== "native")
        url += `&source_asset_issuer=${sourceAssetIssuer}&source_asset_code=${sourceAssetCode}`;

      // Make the API request to fetch the payment path
      const resp = await fetch(url);
      const resps = await resp.json();
      if (!resp.ok) {
        throw new Error("Error sending payment path."); // Handle non-OK responses
      }

      // Parse the response JSON and extract the payment path records
      return {
        data: { sendPaymentPath: (resps._embedded || {}).records || [] },
      };
    } catch (e) {
      // Log and rethrow the error for further handling
      console.log("Error sending payment path.", e);
      throw new Error("Error sending payment path.");
    }
  }
}
