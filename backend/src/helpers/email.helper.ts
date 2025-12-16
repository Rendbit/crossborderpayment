export class EmailHelper {
  /**
   * Formats an email address to lowercase.
   *
   * @param {string} email - The email address to format.
   * @returns {string} - The formatted email address in lowercase.
   */
  static format(email: string): string {
    return email.toLowerCase();
  }

  /**
   * Checks if an email address is a valid work email.
   *
   * Valid work emails are those that have domains not included in common free email domains like Gmail, Yahoo, etc.
   *
   * @param {string} email - The email address to validate.
   * @returns {boolean} - True if the email is a valid work email, otherwise false.
   */
  static isValidWorkEmail(email: string): boolean {
    if (!email) return false;

    // Normalize email
    email = email.trim().toLowerCase();

    // Common free email domains
    const freeEmailDomains = new Set([
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "aol.com",
    ]);

    // Validate email format
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) {
      return false;
    }

    // Extract and validate domain
    const domain = email.split("@")[1];
    if (!domain) return false;

    return !freeEmailDomains.has(domain);
  }

  static isValidEmail(email: string): boolean {
    // Regular expression pattern to validate email format
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.toLowerCase());
  }
}
