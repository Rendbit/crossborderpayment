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
    // Check if the transaction is not an empty string
    if (transaction !== "") {
      // Initialize the Stellar Soroban RPC server based on the network environment
      const server = await new StellarSdk.SorobanRpc.Server(
        process.env.STELLAR_NETWORK === "public"
          ? process.env.STELLAR_PUBLIC_SERVER
          : process.env.STELLAR_TESTNET_SERVER
      );
      try {
        // Sign the transaction with the provided keypair
        transaction.sign(keypair);

        // Send the transaction to the Stellar network
        const sendResponse = await server.sendTransaction(transaction);

        // Extract the transaction hash from the response
        const hsh = sendResponse.hash;
        // Check if the transaction status is "PENDING"
        if (sendResponse.status === "PENDING") {
          // Poll the transaction status until it is no longer "NOT_FOUND"
          let getResponse = await server.getTransaction(sendResponse.hash);
          while (getResponse.status === "NOT_FOUND") {
            getResponse = await server.getTransaction(sendResponse.hash);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
          }

          // If the transaction is successful, return the result
          if (getResponse.status === "SUCCESS") {
            if (!getResponse.resultMetaXdr) {
              return { status: true, msg: "" }; // No additional metadata available
            }
            const returnValue = getResponse.returnValue; // Extract the return value
            return { status: true, value: returnValue, hash: hsh }; // Return success with value and hash
          } else {
            // console.log({ getResponse });

            const result = StellarSdk.xdr.TransactionResult.fromXDR(
              getResponse.resultXdr.toXDR(),
              "base64"
            );
            const opResult = result.result().results()[0].value();
            // console.log({ opResult });
            const code = opResult.switch().name;

            // console.log({ code });

            const error = this.decodeError(opResult, code);
            return error;
          }
        } else {
          // Unable to submit the transaction
          return { status: false, msg: "Unable to submit transaction" };
        }
      } catch (err: any) {
        // Log and return the error message in case of an exception
        console.log("execTranst error.", err);
        return { status: false, msg: err.message };
      }
    }
  }

  static decodeError(opResult: any, code: string) {
    const switchType = opResult._switch;
    console.log({switchType});
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
