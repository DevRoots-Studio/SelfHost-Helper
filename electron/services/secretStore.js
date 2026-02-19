import { safeStorage } from "electron";
import logger from "./logger.js";

/**
 * Encrypts a string using machine-bound key (electron.safeStorage).
 * @param {string} plaintext - The raw string to encrypt.
 * @returns {string} - Base64 encoded encrypted string, or plaintext if encryption unavailable/failed, or empty string if input is falsy.
 */
export const encryptSecret = (plaintext) => {
  if (!plaintext) return "";

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn("SecretStore: Encryption is not available on this machine.");
      return plaintext; // Fallback to plaintext if encryption is not available (not ideal but avoids crash)
    }

    const buffer = safeStorage.encryptString(plaintext);
    return buffer.toString("base64");
  } catch (error) {
    logger.error("SecretStore: Failed to encrypt secret:", error);
    return plaintext;
  }
};

/**
 * Decrypts a base64 encoded string using machine-bound key.
 * @param {string} ciphertext - The base64 encoded encrypted string.
 * @returns {string} - The decrypted raw string.
 */
export const decryptSecret = (ciphertext) => {
  if (!ciphertext) return "";

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return ciphertext;
    }

    const buffer = Buffer.from(ciphertext, "base64");
    return safeStorage.decryptString(buffer);
  } catch (error) {
    // If decryption fails, it might be already plaintext or encrypted with a different key
    logger.debug("SecretStore: Decryption failed, returning as-is (might be legacy plaintext).");
    return ciphertext;
  }
};
