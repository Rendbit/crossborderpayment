import * as OTP from "n-digit-token";

export class Helpers {
  /**
   * Generates a one-time password (OTP) of the specified length.
   *
   * @param {number} length - The length of the OTP to generate.
   * @returns {string} - The generated OTP.
   */
  static generateOTP(length: number): string {
    const token = OTP.gen(length); // Generate the OTP using the n-digit-token library
    return token;
  }

  /**
   * Capitalizes the first letter of a word.
   *
   * @param {string} word - The word to capitalize.
   * @returns {string} - The word with the first letter capitalized.
   */
  static capitalizeFirstLetter(word: string): string {
    // Capitalize the first letter of the word and concatenate it with the rest of the word
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  static validateLength = (text: string, min: number, max: number) => {
    return !(text.length > max || text.length < min);
  };
}
