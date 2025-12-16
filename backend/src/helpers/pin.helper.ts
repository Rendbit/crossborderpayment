import { internalCacheService } from "../microservices/redis";
import * as CryptoJS from "crypto-js";

export class PinHelper {
  private static readonly PIN_CACHE_PREFIX = "user_pin:";
  private static readonly PIN_CACHE_TTL = 15 * 60;

  static async cacheUserPin(userId: string, pinCode: string): Promise<void> {
    const cacheKey = `${this.PIN_CACHE_PREFIX}${userId}`;
    await internalCacheService.set(cacheKey, pinCode, this.PIN_CACHE_TTL);
  }

  static async getCachedUserPin(userId: string): Promise<string | null> {
    const cacheKey = `${this.PIN_CACHE_PREFIX}${userId}`;
    return (await internalCacheService.get<string>(cacheKey)) || null;
  }

  static async clearCachedUserPin(userId: string): Promise<void> {
    const cacheKey = `${this.PIN_CACHE_PREFIX}${userId}`;
    await internalCacheService.delete(cacheKey);
  }

  static async verifyAndCachePin(
    user: any,
    providedPin: string
  ): Promise<{
    isValid: boolean;
    decryptedPrivateKey?: string;
    error?: string;
  }> {
    try {
      if (providedPin !== user.pinCode) {
        return {
          isValid: false,
          error: "Invalid transaction PIN",
        };
      }

      const hashedPassword = user.password;

      const decryptedPrivateKey = this.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      await this.cacheUserPin(user._id.toString(), providedPin);

      return {
        isValid: true,
        decryptedPrivateKey,
      };
    } catch (error: any) {
      console.error("Error verifying PIN:", error);
      return {
        isValid: false,
        error: error.message || "PIN verification failed",
      };
    }
  }

  static async getDecryptedPrivateKey(
    user: any,
    pinCode?: string
  ): Promise<{
    success: boolean;
    decryptedPrivateKey?: string;
    error?: string;
  }> {
    try {
      const cachedPin = await this.getCachedUserPin(user._id.toString());

      let decryptedPrivateKey: string;

      if (cachedPin) {
        const hashedPassword = user.password;

        decryptedPrivateKey = this.decryptPrivateKey(
          user.encryptedPrivateKey,
          `${user.primaryEmail}${hashedPassword}${cachedPin}`
        );
      } else if (pinCode) {
        const result = await this.verifyAndCachePin(user, pinCode);

        if (!result.isValid) {
          return {
            success: false,
            error: result.error,
          };
        }

        decryptedPrivateKey = result.decryptedPrivateKey!;
      } else {
        return {
          success: false,
          error: "PIN code required",
        };
      }

      return {
        success: true,
        decryptedPrivateKey,
      };
    } catch (error: any) {
      console.error("Error getting decrypted private key:", error);
      return {
        success: false,
        error: error.message || "Failed to decrypt private key",
      };
    }
  }

  private static decryptPrivateKey(
    encryptedPrivateKey: string,
    decryptionKey: string
  ): string {
    try {
      const [cipherText, ivText] = encryptedPrivateKey.split(":");

      const iv = CryptoJS.enc.Hex.parse(ivText);

      const decrypted = CryptoJS.AES.decrypt(cipherText, decryptionKey, {
        iv: iv,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error(e);
      throw new Error("Transaction failed. Contact Support");
    }
  }

  static async getBatchDecryptedPrivateKeys(
    users: any[]
  ): Promise<
    Map<
      string,
      { success: boolean; decryptedPrivateKey?: string; error?: string }
    >
  > {
    const results = new Map();

    const cachePromises = users.map(async (user) => {
      const cachedPin = await this.getCachedUserPin(user._id.toString());
      return { userId: user._id.toString(), user, cachedPin };
    });

    const cachedResults = await Promise.all(cachePromises);

    for (const { userId, user, cachedPin } of cachedResults) {
      try {
        if (cachedPin) {
          const decryptedPrivateKey = this.decryptPrivateKey(
            user.encryptedPrivateKey,
            `${user.primaryEmail}${user.password}${cachedPin}`
          );

          results.set(userId, {
            success: true,
            decryptedPrivateKey,
          });
        } else {
          results.set(userId, {
            success: false,
            error: "PIN not cached",
          });
        }
      } catch (error: any) {
        results.set(userId, {
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  static async clearAllUserCache(userId: string): Promise<void> {
    await this.clearCachedUserPin(userId);
  }

  static async batchCacheUserPins(
    userIds: string[],
    pinCodes: string[]
  ): Promise<void> {
    const promises = userIds.map(async (userId, index) => {
      const cacheKey = `${this.PIN_CACHE_PREFIX}${userId}`;
      await internalCacheService.set(
        cacheKey,
        pinCodes[index],
        this.PIN_CACHE_TTL
      );
    });

    await Promise.all(promises);
  }
}
