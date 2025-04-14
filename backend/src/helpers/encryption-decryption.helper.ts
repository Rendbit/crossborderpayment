

/**
 * This module provides helper classes for encryption and decryption operations
 * using AES-256-CBC and CryptoJS AES algorithms. It includes functionality for:
 * 
 * - Generating random encryption keys.
 * - Encrypting and decrypting text using AES-256-CBC.
 * - Encrypting and decrypting private keys using CryptoJS AES.
 * 
 * The module is structured into four classes:
 * 
 * 1. `Encryption`: Handles encryption of text using AES-256-CBC.
 * 2. `Decryption`: Handles decryption of text using AES-256-CBC.
 * 3. `WalletEncryption`: Provides encryption of private keys using CryptoJS AES.
 * 4. `WalletDecryption`: Provides decryption of private keys using CryptoJS AES.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import * as CryptoJS from "crypto-js";

const algorithm = "aes-256-cbc";
const keyLength = 16;

export class Encryption {
  /**
   * Generates a random encryption key.
   * @returns {string} - The generated encryption key.
   */
  static generateKey(): string {
    // Generate a random encryption key of the specified length and return it as a hex string
    return randomBytes(keyLength).toString("hex");
  }

  /**
   * Encrypts text using AES-256-CBC algorithm.
   * @param {string} text - The text to encrypt.
   * @param {string} key - The encryption key.
   * @returns {object} - The encrypted data along with the initialization vector.
   */
  static encrypt(
    text: string,
    key: string
  ): { status: boolean; key: string; data: string } {
    try {
      // Generate a random initialization vector (IV)
      const iv = randomBytes(keyLength);

      // Create a cipher instance using the AES-256-CBC algorithm, key, and IV
      const cipher = createCipheriv(algorithm, key, iv);

      // Encrypt the input text
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Return the encryption status, key, and encrypted data (with IV appended)
      return {
        status: true,
        key: key,
        data: `${encrypted}:${iv.toString("hex")}`,
      };
    } catch (e) {
      // Log the error and return a failure status
      console.error(e);
      return {
        status: false,
        key: "",
        data: "",
      };
    }
  }
}

export class Decryption {
  /**
   * Decrypts text using AES-256-CBC algorithm.
   * @param {string} text - The text to decrypt.
   * @param {string} decryptionKey - The decryption key.
   * @returns {string} - The decrypted text.
   */
  static decrypt(text: string, decryptionKey: string): string {
    // Convert the decryption key from hex to a Buffer
    const key = Buffer.from(decryptionKey, "hex");

    // Split the encrypted text into the encrypted data and the IV
    const [encrypted, ivHex] = text.split(":");

    // Convert the IV from hex to a Buffer
    const iv = Buffer.from(ivHex, "hex");

    // Create a decipher instance using the AES-256-CBC algorithm, key, and IV
    const decipher = createDecipheriv(algorithm, key, iv);

    // Decrypt the encrypted data
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Return the decrypted text
    return decrypted;
  }
}

export class WalletEncryption {
  /**
   * Encrypts a private key using CryptoJS AES encryption.
   * @param {string} privateKey - The private key to encrypt.
   * @param {string} encryptionKey - The encryption key.
   * @returns {string} - The encrypted private key.
   */
  static encryptPrivateKey(privateKey: string, encryptionKey: string): string {
    try {
      // Generate a random initialization vector (IV)
      const iv = CryptoJS.lib.WordArray.random(16);

      // Encrypt the private key using CryptoJS AES encryption with the provided encryption key and IV
      const cipherText = CryptoJS.AES.encrypt(privateKey, encryptionKey, {
      iv: iv,
      });

      // Return the encrypted private key along with the IV as a string
      return `${cipherText.toString()}:${iv.toString()}`;
    } catch (e) {
      // Log the error and throw a new error indicating encryption failure
      console.error(e);
      throw new Error("Encryption failed.");
    }
  }
}

export class WalletDecryption {
  /**
   * Decrypts an encrypted private key using CryptoJS AES decryption.
   * @param {string} encryptedPrivateKey - The encrypted private key.
   * @param {string} decryptionKey - The decryption key.
   * @returns {string} - The decrypted private key.
   */
  static decryptPrivateKey(
    encryptedPrivateKey: string,
    decryptionKey: string
  ): string {
    try {
      // Split the encrypted private key into the cipher text and IV
      const [cipherText, ivText] = encryptedPrivateKey.split(":");

      // Parse the IV from its hex representation
      const iv = CryptoJS.enc.Hex.parse(ivText);

      // Decrypt the cipher text using CryptoJS AES decryption with the provided decryption key and IV
      const decrypted = CryptoJS.AES.decrypt(cipherText, decryptionKey, {
      iv: iv,
      });

      // Convert the decrypted data to a UTF-8 string and return it
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      // Log the error and throw a new error indicating decryption failure
      console.error(e);
      throw new Error("Transaction failed. Contact Support");
    }
  }
}
