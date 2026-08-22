import { getDocumentFileType } from "./document-file-types";

/**
 * Encryption Service for Encrypted Documents
 * Implements AES-256-GCM encryption with multiple security levels
 */

export class EncryptionService {
  /**
   * Generate a secure encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Export key to base64 string
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import key from base64 string
   */
  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Derive key from password using PBKDF2
   */
  static async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt file with AES-256-GCM
   */
  static async encryptFile(file: File, password?: string): Promise<{
    encryptedData: ArrayBuffer;
    key: string;
    iv: string;
    salt?: string;
  }> {
    // Read file
    const fileData = await file.arrayBuffer();

    // Generate IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    let key: CryptoKey;
    let salt: Uint8Array | undefined;
    let saltString: string | undefined;

    if (password) {
      // Use password-based encryption
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await this.deriveKeyFromPassword(password, salt);
      saltString = this.arrayBufferToBase64(salt.buffer as ArrayBuffer);
    } else {
      // Use random key
      key = await this.generateKey();
    }

    // Encrypt
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      fileData
    );

    const keyString = await this.exportKey(key);

    const result: any = {
      encryptedData,
      key: keyString,
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
    };
    if (saltString) {
      result.salt = saltString;
    }
    return result;
  }

  /**
   * Decrypt file with AES-256-GCM
   */
  static async decryptFile(
    encryptedData: ArrayBuffer,
    keyOrPassword: string,
    iv: string,
    salt?: string
  ): Promise<ArrayBuffer> {
    const ivData = this.base64ToArrayBuffer(iv);

    let key: CryptoKey;

    if (salt) {
      // Password-based decryption
      const saltData = this.base64ToArrayBuffer(salt);
      key = await this.deriveKeyFromPassword(keyOrPassword, new Uint8Array(saltData));
    } else {
      // Direct key decryption
      key = await this.importKey(keyOrPassword);
    }

    // Decrypt
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(ivData),
        },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      throw new Error("Decryption failed. Invalid password or corrupted data.");
    }
  }

  // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
  /**
   * Hash password for storage using PBKDF2 and a unique salt
   */
  static async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const saltBuffer = this.base64ToArrayBuffer(salt);
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new Uint8Array(saltBuffer) as any,
        iterations: 10000,
        hash: "SHA-256",
      },
      passwordKey,
      256
    );
    return this.arrayBufferToBase64(derivedBits);
  }

  // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
  /**
   * Verify password against hash using the unique salt
   */
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password, salt);
    return computedHash === hash;
  }

  /**
   * Generate device fingerprint
   */
  static async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.width + "x" + screen.height,
      screen.colorDepth.toString(),
    ];

    const fingerprint = components.join("|");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
    return this.arrayBufferToBase64(hash);
  }

  /**
   * Utilities
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
  /**
   * Get file type from MIME type
   */
  static getDocumentType(mimeType: string, fileName = "") {
    return getDocumentFileType(mimeType, fileName).category;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}
