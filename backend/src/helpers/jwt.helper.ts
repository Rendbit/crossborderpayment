import { sign } from "jsonwebtoken";

export class JwtHelper {
  /**
   * Signs a JWT token for the specified user with the default JWT secret and expiration time.
   *
   * @param {any} user - The user object to create the token for.
   * @returns {Promise<string>} - The signed JWT token.
   */
  static async signToken(user: any): Promise<string> {
    const payload: JwtPayload = {
      id: user._id, // Assuming '_id' is the user's unique identifier
    };

    return sign(payload, `${process.env.JWT_SECRET}`, { expiresIn: "24hr" });
  }

  /**
   * Refreshes a JWT token for the specified user with the refresh JWT secret and extended expiration time.
   *
   * @param {any} user - The user object to refresh the token for.
   * @returns {Promise<string>} - The refreshed JWT token.
   */
  static async refreshJWT(user: any): Promise<string> {
    const payload: JwtPayload = {
      id: user._id, // Assuming '_id' is the user's unique identifier
    };
    return sign(payload, `${process.env.JWT_REFRESH_SECRET}`, {
      expiresIn: "24hr",
    });
  }

  /**
   * Generates a JWT token for the specified user with custom JWT secret and expiration time.
   *
   * @param {any} user - The user object to create the token for.
   * @param {string} jwtSecret - The JWT secret to use for signing the token.
   * @param {string} expiresAt - The expiration time for the token (e.g., '1hr', '1d', '7d').
   * @returns {string} - The signed JWT token.
   */
  static generateToken = (user: any, jwtSecret: string): string => {
    return sign({ user }, jwtSecret, { expiresIn: "24hr" });
  };
}
