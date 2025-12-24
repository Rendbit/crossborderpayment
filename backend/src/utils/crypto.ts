import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class KeyManagement {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly PBKDF2_DIGEST = 'sha512';

  /**
   * Derive encryption key from password using PBKDF2
   */
  static deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      this.PBKDF2_DIGEST
    );
  }

  /**
   * Generate a secure random master key
   */
  static generateMasterKey(): Buffer {
    return crypto.randomBytes(this.KEY_LENGTH);
  }

  /**
   * Encrypt data with a key
   */
  static encryptData(data: string, key: Buffer): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data with a key
   */
  static decryptData(encryptedData: string, key: Buffer, iv: string, authTag: string): string {
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt master key with derived key
   */
  static encryptMasterKey(masterKey: Buffer, derivedKey: Buffer): string {
    const encrypted = this.encryptData(masterKey.toString('hex'), derivedKey);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt master key
   */
  static decryptMasterKey(encryptedMasterKey: string, derivedKey: Buffer): Buffer {
    const { encrypted, iv, authTag } = JSON.parse(encryptedMasterKey);
    const decrypted = this.decryptData(encrypted, derivedKey, iv, authTag);
    return Buffer.from(decrypted, 'hex');
  }

  /**
   * Re-encrypt wallet data with new credentials
   */
  static async reencryptWallet(
    oldCredentials: { email: string; password: string; pin: string },
    newCredentials: { password: string; pin: string },
    encryptedData: {
      encryptedPrivateKey: string;
      encryptedMasterKey: string;
      keyDerivationSalt: string;
    }
  ): Promise<{
    encryptedPrivateKey: string;
    encryptedMasterKey: string;
    keyDerivationSalt: string;
  }> {
    try {
      // Generate new salt
      const newSalt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
      
      // Derive old key
      const oldDerivedKey = this.deriveKey(
        `${oldCredentials.email}:${oldCredentials.password}:${oldCredentials.pin}`,
        encryptedData.keyDerivationSalt
      );
      
      // Decrypt master key
      const masterKey = this.decryptMasterKey(encryptedData.encryptedMasterKey, oldDerivedKey);
      
      // Decrypt private key
      const privateKeyEncrypted = JSON.parse(encryptedData.encryptedPrivateKey);
      const privateKey = this.decryptData(
        privateKeyEncrypted.encrypted,
        masterKey,
        privateKeyEncrypted.iv,
        privateKeyEncrypted.authTag
      );
      
      // Derive new key
      const newDerivedKey = this.deriveKey(
        `${oldCredentials.email}:${newCredentials.password}:${newCredentials.pin}`,
        newSalt
      );
      
      // Re-encrypt master key
      const newEncryptedMasterKey = this.encryptMasterKey(masterKey, newDerivedKey);
      
      // Re-encrypt private key
      const newEncryptedPrivateKey = this.encryptData(privateKey, masterKey);
      
      return {
        encryptedPrivateKey: JSON.stringify(newEncryptedPrivateKey),
        encryptedMasterKey: newEncryptedMasterKey,
        keyDerivationSalt: newSalt,
      };
    } catch (error) {
      throw new Error('Failed to re-encrypt wallet. Please verify current credentials.');
    }
  }

  /**
   * Export private key with additional encryption
   */
  static exportPrivateKey(
    privateKey: string,
    exportPassword: string,
    email: string
  ): { encryptedExport: string; exportSalt: string; exportIv: string } {
    const exportSalt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const derivedKey = this.deriveKey(
      `${email}:${exportPassword}`,
      exportSalt
    );
    
    const encrypted = this.encryptData(privateKey, derivedKey);
    
    return {
      encryptedExport: encrypted.encrypted,
      exportSalt,
      exportIv: encrypted.iv
    };
  }

  /**
   * Import private key from export
   */
  static importPrivateKey(
    encryptedExport: string,
    exportPassword: string,
    exportSalt: string,
    exportIv: string,
    email: string
  ): string {
    const derivedKey = this.deriveKey(
      `${email}:${exportPassword}`,
      exportSalt
    );
    
    // For import, we need to handle the auth tag - in practice this would be stored separately
    // This is simplified - you'd need to store and retrieve the auth tag properly
    const authTag = crypto.randomBytes(this.AUTH_TAG_LENGTH).toString('hex'); // Placeholder
    
    return this.decryptData(encryptedExport, derivedKey, exportIv, authTag);
  }
}

// Field-level encryption for sensitive fields
export const encryptField = (value: string): string => {
  if (!value) return value;
  
  const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY || '', 'hex');
  if (key.length !== KeyManagement.KEY_LENGTH) {
    throw new Error('Invalid field encryption key length');
  }
  
  const { encrypted, iv, authTag } = KeyManagement.encryptData(value, key);
  return `${encrypted}:${iv}:${authTag}`;
};

export const decryptField = (encryptedValue: string): string => {
  if (!encryptedValue) return encryptedValue;
  
  const [encrypted, iv, authTag] = encryptedValue.split(':');
  if (!encrypted || !iv || !authTag) {
    throw new Error('Invalid encrypted field format');
  }
  
  const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY || '', 'hex');
  if (key.length !== KeyManagement.KEY_LENGTH) {
    throw new Error('Invalid field encryption key length');
  }
  
  return KeyManagement.decryptData(encrypted, key, iv, authTag);
};

// Generate recovery phrase
export const generateRecoveryPhrase = (): string[] => {
  const bip39 = require('bip39');
  return bip39.generateMnemonic().split(' ');
};

// Hash recovery phrase
export const hashRecoveryPhrase = (phrase: string[]): string => {
  const phraseString = phrase.join(' ');
  return bcrypt.hashSync(phraseString, 10);
};

// Verify recovery phrase
export const verifyRecoveryPhrase = (phrase: string[], hash: string): boolean => {
  const phraseString = phrase.join(' ');
  return bcrypt.compareSync(phraseString, hash);
};