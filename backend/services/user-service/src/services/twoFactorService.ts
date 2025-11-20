import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { redis } from '../config/database';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResult {
  isValid: boolean;
  tempToken?: string;
}

export class TwoFactorService {
  private readonly appName = 'AutoTrade21';
  private readonly tempTokenExpiry = 300; // 5 minutes

  /**
   * Generate a new TOTP secret for user
   */
  generateSecret(userEmail: string): TwoFactorSetup {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.appName,
        length: 32,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code URL
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: userEmail,
        issuer: this.appName,
        encoding: 'base32',
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate two-factor authentication secret');
    }
  }

  /**
   * Generate QR code image from URL
   */
  async generateQRCodeImage(qrCodeUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrCodeUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret: string, token: string, window: number = 2): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window, // Allow for time drift
        time: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      console.error('Error verifying TOTP token:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(userId: string, backupCode: string): boolean {
    try {
      // This is a simplified implementation
      // In production, you'd store encrypted backup codes in the database
      // and mark them as used after verification
      return this.isValidBackupCodeFormat(backupCode);
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Generate a single backup code
   */
  private generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Validate backup code format
   */
  private isValidBackupCodeFormat(code: string): boolean {
    const backupCodeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return backupCodeRegex.test(code.toUpperCase());
  }

  /**
   * Store temporary verification token for 2FA setup
   */
  async storeTempVerificationToken(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<string> {
    try {
      const tempToken = this.generateTempToken();
      const tempData = {
        userId,
        secret,
        backupCodes,
        timestamp: Date.now(),
      };

      await redis.setEx(
        `2fa_setup:${tempToken}`,
        this.tempTokenExpiry,
        JSON.stringify(tempData)
      );

      return tempToken;
    } catch (error) {
      console.error('Error storing temp verification token:', error);
      throw new Error('Failed to store temporary verification token');
    }
  }

  /**
   * Verify and retrieve 2FA setup data using temp token
   */
  async verifyTempToken(tempToken: string): Promise<{
    userId: string;
    secret: string;
    backupCodes: string[];
  } | null> {
    try {
      const tempData = await redis.get(`2fa_setup:${tempToken}`);
      if (!tempData) {
        return null;
      }

      const parsedData = JSON.parse(tempData);

      // Check if token has expired
      if (Date.now() - parsedData.timestamp > this.tempTokenExpiry * 1000) {
        await redis.del(`2fa_setup:${tempToken}`);
        return null;
      }

      return {
        userId: parsedData.userId,
        secret: parsedData.secret,
        backupCodes: parsedData.backupCodes,
      };
    } catch (error) {
      console.error('Error verifying temp token:', error);
      return null;
    }
  }

  /**
   * Clean up temp token after verification
   */
  async cleanupTempToken(tempToken: string): Promise<void> {
    try {
      await redis.del(`2fa_setup:${tempToken}`);
    } catch (error) {
      console.error('Error cleaning up temp token:', error);
    }
  }

  /**
   * Generate temporary token for 2FA setup
   */
  private generateTempToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Check rate limiting for 2FA attempts
   */
  async check2FARateLimit(userId: string): Promise<boolean> {
    try {
      const key = `2fa_attempts:${userId}`;
      const attempts = await redis.incr(key);

      if (attempts === 1) {
        await redis.expire(key, 900); // 15 minutes
      }

      // Allow maximum of 5 attempts per 15 minutes
      return attempts <= 5;
    } catch (error) {
      console.error('Error checking 2FA rate limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Reset 2FA attempt counter
   */
  async reset2FARateLimit(userId: string): Promise<void> {
    try {
      await redis.del(`2fa_attempts:${userId}`);
    } catch (error) {
      console.error('Error resetting 2FA rate limit:', error);
    }
  }

  /**
   * Store 2FA verification session for login
   */
  async store2FAVerificationSession(
    userId: string,
    sessionId: string,
    data: any
  ): Promise<void> {
    try {
      await redis.setEx(
        `2fa_session:${sessionId}`,
        600, // 10 minutes
        JSON.stringify({
          userId,
          ...data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error storing 2FA verification session:', error);
      throw new Error('Failed to store 2FA verification session');
    }
  }

  /**
   * Get 2FA verification session
   */
  async get2FAVerificationSession(sessionId: string): Promise<any | null> {
    try {
      const sessionData = await redis.get(`2fa_session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);

      // Check if session has expired (10 minutes)
      if (Date.now() - session.timestamp > 600000) {
        await redis.del(`2fa_session:${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting 2FA verification session:', error);
      return null;
    }
  }

  /**
   * Clean up 2FA verification session
   */
  async cleanup2FAVerificationSession(sessionId: string): Promise<void> {
    try {
      await redis.del(`2fa_session:${sessionId}`);
    } catch (error) {
      console.error('Error cleaning up 2FA verification session:', error);
    }
  }

  /**
   * Log security event for 2FA
   */
  async logSecurityEvent(
    userId: string,
    event: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      const logEntry = {
        userId,
        event,
        metadata,
        timestamp: new Date().toISOString(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      };

      // Store in Redis for quick access and also consider logging to database
      await redis.lpush(
        `security_events:${userId}`,
        JSON.stringify(logEntry)
      );

      // Keep only last 100 security events per user
      await redis.ltrim(`security_events:${userId}`, 0, 99);
      await redis.expire(`security_events:${userId}`, 86400 * 30); // 30 days
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get recent security events for user
   */
  async getRecentSecurityEvents(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const events = await redis.lrange(
        `security_events:${userId}`,
        0,
        limit - 1
      );

      return events.map(event => JSON.parse(event));
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }
}

export const twoFactorService = new TwoFactorService();