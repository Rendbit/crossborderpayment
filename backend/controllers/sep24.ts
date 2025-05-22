import { Sep10Helper } from "../helpers/sep10.helper";
import httpStatus from "http-status";
import {
  InitiateTransfer24ParamsSchema,
  InitiateTransfer24Schema,
  QueryTransfers24Schema,
} from "../validators/sep24";
import { Sep1Helper } from "../helpers/sep1.helper";

/**
 * Handles the initiation of a SEP-24 transfer.
 *
 * This function processes a request to initiate a Stellar SEP-24 transfer by
 * validating the request parameters and body, generating an authentication token,
 * and making a POST request to the SEP-24 transfer server's interactive endpoint.
 *
 * @param req - The HTTP request object, which includes the user information,
 *              request parameters, and request body.
 * @param res - The HTTP response object used to send the response back to the client.
 *
 * @throws Will return an error response if:
 * - The request parameters or body fail validation.
 * - The authentication token cannot be generated.
 * - The POST request to the transfer server fails or returns a non-OK status.
 *
 * @returns A success response containing the JSON response from the transfer server
 *          and the generated authentication token if the operation is successful.
 */
export const initiateTransfer24 = async (req: any, res: any) => {
  try {
    // Extract user information from the request
    const user = req.user;

    // Validate and parse the request parameters and body
    const { txType }: InitiateTransfer24Params =
      InitiateTransfer24ParamsSchema.parse(req.params);
    const { assetCode, stellarPublicKey }: InitiateTransfer24SchemaParams =
      InitiateTransfer24Schema.parse(req.body);

    // Generate the authentication token and fetch the transfer server URL
    const [authToken, { TRANSFER_SERVER_SEP0024 }] = await Promise.all([
      Sep10Helper.getChallengeTransaction(user),
      Sep1Helper.fetchStellarToml(),
    ]);

    // Make a POST request to the SEP-24 transfer server's interactive endpoint
    const resp = await fetch(
      `${TRANSFER_SERVER_SEP0024}/transactions/${txType}/interactive`,
      {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          asset_code: assetCode,
          account: stellarPublicKey,
        }),
      }
    );

    // Parse the response JSON
    const json = await resp.json();

    // Handle non-OK responses from the transfer server
    if (!resp.ok) {
      return res.status(httpStatus.EXPECTATION_FAILED).json({
        message: `${json.error}`,
        status: httpStatus.EXPECTATION_FAILED,
        success: false,
      });
    }

    // Return a success response with the server's JSON response and the auth token
    return res.status(httpStatus.OK).json({
      data: { json, authToken },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    // Log the error and return an error response
    console.error("Error initiating transfer:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error initiating transfer",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

/**
 * Handles the querying of SEP-24 transfers for a specific asset code.
 *
 * @param req - The HTTP request object containing user information and query parameters.
 * @param res - The HTTP response object used to send the response back to the client.
 *
 * @throws Will return an error response if:
 * - The request query parameters are invalid.
 * - The external fetch request to the transfer server fails.
 * - An unexpected error occurs during execution.
 *
 * @remarks
 * - This function uses the `Sep10Helper` to retrieve a challenge transaction for the user.
 * - It sends a GET request to the SEP-24 transfer server to fetch transaction details for the specified asset code.
 * - The function handles both successful and error responses from the transfer server.
 *
 * @returns A success response containing the transaction data if the operation is successful.
 * Otherwise, an error response with the appropriate status and message.
 */
export const queryTransfers24 = async (req: any, res: any) => {
  try {
    // Extract user information from the request
    const user = req.user;

    // Validate and parse the query parameters
    const { assetCode }: InitiateQueryTransfers24Schema =
      QueryTransfers24Schema.parse(req.query);

    // Generate the authentication token and fetch the transfer server URL
    const [authToken, { TRANSFER_SERVER_SEP0024 }] = await Promise.all([
      Sep10Helper.getChallengeTransaction(user),
      Sep1Helper.fetchStellarToml(),
    ]);

    // Make a GET request to the SEP-24 transfer server to fetch transaction details
    const resp = await fetch(
      `${TRANSFER_SERVER_SEP0024}/transactions?${new URLSearchParams({
        asset_code: assetCode,
      })}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Parse the response JSON
    const json: any = await resp.json();

    // Handle non-OK responses from the transfer server
    if (!resp.ok) {
      console.log(json);
      throw new Error(json.error || "Failed to query transaction.");
    }

    // Return a success response with the transaction data
    return res.status(httpStatus.OK).json({
      data: json.transactions,
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    // Log the error and return an error response
    console.error("Error querying transaction:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error querying transaction",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
