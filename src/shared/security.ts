/**
 * Security utilities for encryption, access control, and audit logging
 */

import { performanceMonitor, isDevMode } from './performance';

// Security configuration
const SECURITY_CONFIG = {
  ENCRYPTION_ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  ITERATIONS: 100000,
  HASH_ALGORITHM: 'SHA-256',
  KEY_ROTATION_DAYS: 30,
  MAX_ACCESS_ATTEMPTS: 10,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 20
} as const;

// Security types
export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  timestamp: number;
  version: string;
}

export interface AccessContext {
  source: 'background' | 'popup' | 'options' | 'content';
  action: 'read' | 'write' | 'validate';
  timestamp: number;
  userAgent?: string;
}

export interface SecurityAuditLog {
  timestamp: number;
  context: AccessContext;
  success: boolean;
  error?: string;
  keyFingerprint?: string;
}

export interface RateLimitEntry {
  timestamp: number;
  count: number;
}

// Security manager class
export class SecurityManager {
  private static instance: SecurityManager;
  private auditLogs: SecurityAuditLog[] = [];
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private derivedKey: CryptoKey | null = null;
  private keyFingerprint: string | null = null;

  private constructor() {}

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Generate a device-specific salt using various browser fingerprints
   */
  private async generateDeviceSalt(): Promise<Uint8Array> {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      typeof screen !== 'undefined' ? screen.width.toString() : 'unknown',
      typeof screen !== 'undefined' ? screen.height.toString() : 'unknown',
      new Date().getTimezoneOffset().toString()
    ].join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest(SECURITY_CONFIG.HASH_ALGORITHM, data);
    
    return new Uint8Array(hashBuffer).slice(0, SECURITY_CONFIG.SALT_LENGTH);
  }

  /**
   * Derive encryption key from device characteristics
   */
  private async deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
    if (this.derivedKey) {
      return this.derivedKey;
    }

    const deviceSalt = await this.generateDeviceSalt();
    const combinedSalt = new Uint8Array(salt.length + deviceSalt.length);
    combinedSalt.set(salt);
    combinedSalt.set(deviceSalt, salt.length);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      combinedSalt,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: combinedSalt,
        iterations: SECURITY_CONFIG.ITERATIONS,
        hash: SECURITY_CONFIG.HASH_ALGORITHM
      },
      keyMaterial,
      { name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM, length: SECURITY_CONFIG.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    // Generate key fingerprint for audit logging using salt/device data
    const fingerprintData = new Uint8Array(combinedSalt.length + 8);
    fingerprintData.set(combinedSalt);
    fingerprintData.set(new Uint8Array(new ArrayBuffer(8)), combinedSalt.length);
    const fingerprint = await crypto.subtle.digest(SECURITY_CONFIG.HASH_ALGORITHM, fingerprintData);
    this.keyFingerprint = Array.from(new Uint8Array(fingerprint))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16);

    return this.derivedKey;
  }

  /**
   * Encrypt API key with device-specific encryption
   */
  async encryptApiKey(apiKey: string): Promise<EncryptedData> {
    try {
      performanceMonitor.startTimer('security_encrypt');

      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IV_LENGTH));
      
      // Derive encryption key
      const key = await this.deriveEncryptionKey(salt);
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        data
      );

      const result: EncryptedData = {
        encrypted: Array.from(new Uint8Array(encryptedBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        iv: Array.from(iv)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        salt: Array.from(salt)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        timestamp: Date.now(),
        version: '1.0'
      };

      performanceMonitor.logTimer('security_encrypt', 'API key encryption');
      
      if (isDevMode()) {
        console.log('[Security] API key encrypted successfully', {
          keyFingerprint: this.keyFingerprint,
          encryptedSize: result.encrypted.length
        });
      }

      return result;
    } catch (error) {
      if (isDevMode()) {
        console.error('[Security] API key encryption failed:', error);
      }
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key with device-specific decryption
   */
  async decryptApiKey(encryptedData: EncryptedData): Promise<string> {
    try {
      performanceMonitor.startTimer('security_decrypt');

      // Convert hex strings back to Uint8Arrays
      const encryptedBuffer = new Uint8Array(
        encryptedData.encrypted.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      const iv = new Uint8Array(
        encryptedData.iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      const salt = new Uint8Array(
        encryptedData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Derive decryption key
      const key = await this.deriveEncryptionKey(salt);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: SECURITY_CONFIG.ENCRYPTION_ALGORITHM,
          iv: iv
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedBuffer);

      performanceMonitor.logTimer('security_decrypt', 'API key decryption');
      
      if (isDevMode()) {
        console.log('[Security] API key decrypted successfully', {
          keyFingerprint: this.keyFingerprint
        });
      }

      return result;
    } catch (error) {
      if (isDevMode()) {
        console.error('[Security] API key decryption failed:', error);
      }
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Check if API key needs rotation based on age
   */
  isKeyRotationNeeded(encryptedData: EncryptedData): boolean {
    const ageInDays = (Date.now() - encryptedData.timestamp) / (1000 * 60 * 60 * 24);
    return ageInDays > SECURITY_CONFIG.KEY_ROTATION_DAYS;
  }

  /**
   * Validate access context and enforce access controls
   */
  validateAccess(context: AccessContext): boolean {
    try {
      // Check rate limiting
      if (!this.checkRateLimit(context.source)) {
        this.logAccess(context, false, 'Rate limit exceeded');
        return false;
      }

      // Validate context source
      const validSources = ['background', 'popup', 'options', 'content'];
      if (!validSources.includes(context.source)) {
        this.logAccess(context, false, 'Invalid access source');
        return false;
      }

      // Additional validation for sensitive operations
      if (context.action === 'write' && context.source === 'content') {
        this.logAccess(context, false, 'Content script cannot write API keys');
        return false;
      }

      this.logAccess(context, true);
      return true;
    } catch (error) {
      this.logAccess(context, false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(source: string): boolean {
    const now = Date.now();
    const key = `${source}_${Math.floor(now / SECURITY_CONFIG.RATE_LIMIT_WINDOW)}`;
    
    const entry = this.rateLimitMap.get(key);
    if (!entry) {
      this.rateLimitMap.set(key, { timestamp: now, count: 1 });
      this.cleanupRateLimitMap();
      return true;
    }

    if (entry.count >= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Clean up old rate limit entries
   */
  private cleanupRateLimitMap(): void {
    const now = Date.now();
    const cutoff = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW * 2;
    
    for (const [key, entry] of this.rateLimitMap) {
      if (entry.timestamp < cutoff) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Log access attempts for audit trail
   */
  private logAccess(context: AccessContext, success: boolean, error?: string): void {
    const auditLog: SecurityAuditLog = {
      timestamp: Date.now(),
      context,
      success,
      error,
      keyFingerprint: this.keyFingerprint || undefined
    };

    this.auditLogs.push(auditLog);

    // Keep only last 100 entries
    if (this.auditLogs.length > 100) {
      this.auditLogs = this.auditLogs.slice(-100);
    }

    if (isDevMode()) {
      console.log('[Security] Access logged:', auditLog);
    }
  }

  /**
   * Verify storage integrity
   */
  async verifyStorageIntegrity(encryptedData: EncryptedData): Promise<boolean> {
    try {
      // Check data structure
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt) {
        return false;
      }

      // Check version compatibility
      if (encryptedData.version !== '1.0') {
        return false;
      }

      // Check timestamp validity
      if (encryptedData.timestamp > Date.now() || encryptedData.timestamp < 0) {
        return false;
      }

      // Check hex string format
      const hexRegex = /^[0-9a-f]+$/i;
      if (!hexRegex.test(encryptedData.encrypted) || 
          !hexRegex.test(encryptedData.iv) || 
          !hexRegex.test(encryptedData.salt)) {
        return false;
      }

      // Check expected lengths
      if (encryptedData.iv.length !== SECURITY_CONFIG.IV_LENGTH * 2 ||
          encryptedData.salt.length !== SECURITY_CONFIG.SALT_LENGTH * 2) {
        return false;
      }

      return true;
    } catch (error) {
      if (isDevMode()) {
        console.error('[Security] Storage integrity check failed:', error);
      }
      return false;
    }
  }

  /**
   * Get security audit logs
   */
  getAuditLogs(): SecurityAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(): void {
    this.derivedKey = null;
    this.keyFingerprint = null;
    this.auditLogs = [];
    this.rateLimitMap.clear();
    
    if (isDevMode()) {
      console.log('[Security] Sensitive data cleared from memory');
    }
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();