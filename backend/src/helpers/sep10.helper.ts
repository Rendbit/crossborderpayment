/**
 * A helper class for handling Stellar SEP-10 authentication processes.
 * 
 * This class provides methods to:
 * - Retrieve and process a Stellar challenge transaction for authentication.
 * - Validate a Stellar SEP-10 challenge transaction to ensure it adheres to the protocol.
 * - Submit a signed challenge transaction to a web authentication endpoint to obtain an authentication token.
 * 
 * The helper interacts with Stellar's blockchain and utilizes the Stellar SDK to perform operations such as
 * signing, validating, and submitting transactions. It also integrates with encryption utilities to securely
 * handle private keys.
 * 
 * Key Features:
 * - Fetches challenge transactions from a server.
 * - Validates challenge transactions against expected criteria, including home domain and client account ID.
 * - Signs and submits challenge transactions to obtain authentication tokens.
 * 
 * Environment Variables:
 * - `SIGNING_KEY`: The Stellar signing key used for validating challenge transactions.
 * - `WEB_AUTH_ENDPOINT`: The endpoint for web authentication.
 * - `TRANSFER_SERVER_SEP0024`: The transfer server endpoint for SEP-0024.
 * - `HOME_DOMAIN_SHORT`: The short version of the home domain (without protocol).
 * - `HOME_DOMAIN`: The full home domain (with protocol).
 * 
 * Dependencies:
 * - Stellar SDK for blockchain operations.
 * - Encryption utilities for secure private key handling.
 * 
 * Usage:
 * - Instantiate the `Sep10Helper` class.
 * - Use `getChallengeTransaction` to retrieve and process a challenge transaction.
 * - Use `validateChallengeTransaction` to validate a challenge transaction.
 * - Use `submitChallengeTransaction` to submit a signed challenge transaction and retrieve an authentication token.
 */
import {
  Keypair,
  Memo,
  MemoType,
  Operation,
  Transaction,
  Utils,
} from "stellar-sdk";
import { WalletDecryption } from "./encryption-decryption.helper";

// Extracting domain without protocol for TOML resolution
const domainWithoutProtocol = `${
  process.env.HOME_DOMAIN_SHORT
    ? process.env.HOME_DOMAIN_SHORT.replace(/^https?:\/\//, "")
    : ""
}`;
const webAUthDomainWithoutProtocol = `${
  process.env.HOME_DOMAIN
    ? process.env.HOME_DOMAIN.replace(/^https?:\/\//, "")
    : ""
}`;

export class Sep10Helper {
  /**
   * Retrieves and processes a Stellar challenge transaction for authentication.
   *
   * @param account - An object containing the necessary parameters for the challenge transaction:
   *   - `stellarPublicKey`: The Stellar public key of the account.
   *   - `encryptedPrivateKey`: The encrypted private key of the account.
   *   - `primaryEmail`: The primary email associated with the account.
   *   - `password`: The password used for decrypting the private key.
   *   - `pinCode`: The PIN code used for decrypting the private key.
   *
   * @throws {Error} If the required environment variables (`SIGNING_KEY`, `WEB_AUTH_ENDPOINT`, or `TRANSFER_SERVER_SEP0024`) are missing.
   * @throws {Error} If the challenge transaction cannot be fetched or validated.
   *
   * @returns A promise that resolves to an authentication token upon successful submission of the challenge transaction.
   */
  static async getChallengeTransaction(account: GetChallengeTransactionParams) {
    // const { WEB_AUTH_ENDPOINT, TRANSFER_SERVER_SEP0024, SIGNING_KEY } =
    //   await this.sep1Service.fetchStellarToml();
    // Retrieve necessary environment variables
    const SIGNING_KEY = `${process.env.SIGNING_KEY}`;
    const WEB_AUTH_ENDPOINT = `${process.env.WEB_AUTH_ENDPOINT}`;
    const TRANSFER_SERVER_SEP0024 = `${process.env.TRANSFER_SERVER_SEP0024}`;

    // Validate the presence of required environment variables
    if (!(WEB_AUTH_ENDPOINT || TRANSFER_SERVER_SEP0024) || !SIGNING_KEY) {
      throw new Error(
        "Could not get challenge transaction (server missing toml entry or entries)"
      );
    }

    // Hash the password for decryption
    const hashedPassword = account.password;

    // Decrypt the private key using the provided credentials
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      account.encryptedPrivateKey,
      `${account.primaryEmail}${hashedPassword}${account.pinCode}`
    );

    // Determine the web authentication endpoint
    const webAuthEndpoint = WEB_AUTH_ENDPOINT || TRANSFER_SERVER_SEP0024;

    // Fetch the challenge transaction from the server
    const res = await fetch(
      `${webAuthEndpoint}?${new URLSearchParams({
        account: account.stellarPublicKey,
      })}`
    );

    // Handle errors in fetching the challenge transaction
    if (!res.ok) throw new Error("Failed to fetch challenge transaction");

    // Parse the response JSON
    const json = await res.json();

    // Validate the fetched challenge transaction
    await this.validateChallengeTransaction({
      transactionXDR: json.transaction,
      serverSigningKey: SIGNING_KEY,
      network: json.network_passphrase,
      clientPublicKey: account.stellarPublicKey,
      homeDomain: domainWithoutProtocol,
      webAuthDomain: webAUthDomainWithoutProtocol,
    });

    // Submit the signed challenge transaction and retrieve the token
    const { token } = await this.submitChallengeTransaction({
      transactionXDR: json.transaction,
      webAuthEndpoint: WEB_AUTH_ENDPOINT,
      network: json.network_passphrase,
      signingKey: decryptedPrivateKey,
    });

    // Return the authentication token
    return token;
  }

  /**
   * Validates a Stellar SEP-10 challenge transaction.
   *
   * This method ensures that the provided challenge transaction adheres to the
   * SEP-10 protocol by verifying its structure, signatures, and associated metadata.
   * It checks the validity of the home domain, client account ID, and other parameters
   * to ensure the transaction is authentic and matches the expected criteria.
   *
   * @param transactionXDR - The base64-encoded XDR string of the challenge transaction.
   * @param serverSigningKey - The public key of the server used to sign the challenge transaction.
   * @param network - The Stellar network passphrase (e.g., "Test SDF Network ; September 2015" or "Public Global Stellar Network ; September 2015").
   * @param clientPublicKey - The public key of the client account that is expected to sign the challenge transaction.
   * @param homeDomain - The expected home domain of the challenge transaction.
   * @param webAuthDomain - The web authentication domain associated with the challenge transaction.
   *
   * @throws {Error} If the challenge transaction is invalid, malformed, or does not meet the expected criteria.
   * - Throws an error if the transaction cannot be deserialized.
   * - Throws an error if the home domain does not match the expected value.
   * - Throws an error if the client account ID does not match the expected value.
   */
  static async validateChallengeTransaction({
    transactionXDR,
    serverSigningKey,
    network,
    clientPublicKey,
    homeDomain,
    webAuthDomain,
  }: ValidateChallengeTransactionParams) {
    // Initialize a results object to store the parsed challenge transaction details
    let results: {
      matchedHomeDomain: any;
      clientAccountID: any;
      tx?: Transaction<Memo<MemoType>, Operation[]>;
      memo?: string;
    };

    try {
      // Attempt to parse and validate the challenge transaction using Stellar SDK utilities
      const rawResults = Utils.readChallengeTx(
        transactionXDR,
        serverSigningKey,
        network,
        homeDomain,
        webAuthDomain
      );

      // Assign parsed results and ensure memo is undefined if not present
      results = {
        ...rawResults,
        memo: rawResults.memo ?? undefined, // Convert null to undefined for consistency
      };
    } catch (error: any) {
      // Log the error for debugging purposes
      console.error("Error in readChallengeTx:", error);

      // Deserialize the transaction to inspect its operations for debugging
      const transaction = new Transaction(transactionXDR, network);
      transaction.operations.forEach((op) => {
        if (op.type === "manageData") {
          console.log("Operation key:", op.name);
          console.log("Operation value:", op.value?.toString());
        }
      });

      // Throw an error indicating the challenge transaction could not be deserialized
      throw new Error(
        `Invalid challenge: unable to deserialize challengeTx transaction string. Error: ${error.message}`
      );
    }

    // Validate that the home domain in the transaction matches the expected home domain
    const validHomeDomain = results.matchedHomeDomain === homeDomain;
    if (!validHomeDomain) {
      throw new Error(
        `Invalid homeDomains: the transaction's operation key name (${results.matchedHomeDomain}) does not match the expected home domain (${homeDomain})`
      );
    }

    // Validate that the client account ID matches the expected public key
    const validClientAccountID = results.clientAccountID === clientPublicKey;
    if (validClientAccountID) return;

    // Throw an error if the client account ID does not match
    throw new Error("clientAccountID does not match challenge transaction");
  }

  /**
   * Submits a signed challenge transaction to the specified web authentication endpoint.
   *
   * @param params - The parameters required to submit the challenge transaction.
   * @param params.transactionXDR - The XDR string of the challenge transaction to be signed and submitted.
   * @param params.webAuthEndpoint - The URL of the web authentication endpoint to which the transaction will be submitted.
   * @param params.network - The Stellar network passphrase (e.g., "Test SDF Network ; September 2015" or "Public Global Stellar Network ; September 2015").
   * @param params.signingKey - The secret key used to sign the challenge transaction.
   * 
   * @returns An object containing the authentication token returned by the server.
   * @throws Will throw an error if the `webAuthEndpoint` is missing, the server response is not OK, or the server returns an error message.
   */
  static async submitChallengeTransaction({
    transactionXDR,
    webAuthEndpoint,
    network,
    signingKey,
  }: SubmitChallengeTransactionParams) {
    // Ensure the web authentication endpoint is provided
    if (!webAuthEndpoint)
      throw new Error(
      "Could not authenticate with server (missing toml entry)"
      );

    // Create a keypair from the provided signing key
    const keypair = Keypair.fromSecret(signingKey);

    // Deserialize the challenge transaction using the Stellar SDK
    const transaction = new Transaction(transactionXDR, network);

    // Sign the transaction with the keypair
    transaction.sign(keypair);

    // Convert the signed transaction to XDR format
    const signedTransactionXDR = transaction.toEnvelope().toXDR("base64");

    // Submit the signed transaction to the web authentication endpoint
    const res = await fetch(webAuthEndpoint, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signedTransactionXDR }),
    });

    // Parse the server's response as JSON
    const json = await res.json();

    // Handle errors in the server's response
    if (!res.ok) {
      throw new Error(json.error);
    }

    // Return the authentication token from the server's response
    return { token: json.token };
  }
}
