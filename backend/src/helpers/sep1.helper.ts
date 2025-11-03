
/**
 * A helper class for interacting with Stellar's SEP-1 protocol.
 * This class provides methods to fetch and parse the Stellar TOML file
 * for a configured domain, as well as retrieve specific information
 * such as network passphrase, federation server URL, transfer server URL,
 * WebAuth endpoint, and server signing key.
 *
 * The Stellar TOML file is a configuration file hosted by a domain
 * that adheres to the Stellar Ecosystem Proposal (SEP-1) standard.
 * It contains important metadata and endpoints required for interacting
 * with the Stellar network.
 *
 * Usage:
 * - Ensure the `HOME_DOMAIN_SHORT` environment variable is set to the
 *   desired domain (without protocol) for TOML resolution.
 * - Use the static methods provided by this class to fetch and retrieve
 *   specific information from the Stellar TOML file.
 */
import { StellarToml } from "stellar-sdk";

// Extracting domain without protocol for TOML resolution
const domainWithoutProtocol = `${
  process.env.HOME_DOMAIN_SHORT
    ? process.env.HOME_DOMAIN_SHORT.replace(/^https?:\/\//, "")
    : ""
}`;
export class Sep1Helper {
  /**
   * Fetches the Stellar TOML file for the configured domain.
   * @returns Promise resolving to the parsed Stellar TOML data.
   */
  static async fetchStellarToml() {
    const stellarToml = await StellarToml.Resolver.resolve(
      domainWithoutProtocol
    );
    return stellarToml;
  }

  /**
   * Retrieves the Stellar network passphrase from the resolved TOML file.
   * @returns Promise resolving to the network passphrase string.
   */
  static async getNetworkPassphrase() {
    const { NETWORK_PASSPHRASE } = await this.fetchStellarToml();
    return NETWORK_PASSPHRASE;
  }

  /**
   * Retrieves the Federation server URL from the resolved TOML file.
   * @returns Promise resolving to the Federation server URL.
   */
  static async getFederationServer() {
    const { FEDERATION_SERVER } = await this.fetchStellarToml();
    return FEDERATION_SERVER;
  }

  /**
   * Retrieves the SEP-24 Transfer server URL from the resolved TOML file.
   * @returns Promise resolving to the SEP-24 Transfer server URL.
   */
  static async getTransferServerSep24() {
    const { TRANSFER_SERVER_SEP0024 } = await this.fetchStellarToml();
    return TRANSFER_SERVER_SEP0024;
  }

  /**
   * Retrieves the WebAuth endpoint URL from the resolved TOML file.
   * @returns Promise resolving to the WebAuth endpoint URL.
   */
  static async getWebAuthEndpoint() {
    const { WEB_AUTH_ENDPOINT } = await this.fetchStellarToml();
    return WEB_AUTH_ENDPOINT;
  }

  /**
   * Retrieves the server signing key from the resolved TOML file.
   * @returns Promise resolving to the server signing key.
   */
  static async getServerSigningKey() {
    const { SIGNING_KEY } = await this.fetchStellarToml();
    return SIGNING_KEY;
  }
}
