import jwt from 'jsonwebtoken';
import { redis } from './database';

export interface JWTPayload {
  userId: string;
  email: string;
  accountType: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.issuer = process.env.JWT_ISSUER || 'autotrade21';
    this.audience = process.env.JWT_AUDIENCE || 'autotrade21-users';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const tokenPayload: JWTPayload = {
      ...payload,
      sessionId: this.generateSessionId(),
    };

    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string, tokenVersion: number = 0): Promise<string> {
    const sessionId = this.generateSessionId();

    // Store session metadata in Redis
    await redis.setEx(
      `refresh_token:${userId}:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify({
        tokenVersion,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      })
    );

    const payload: RefreshTokenPayload = {
      userId,
      sessionId,
      tokenVersion,
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;

      // Check if refresh token exists in Redis
      const sessionData = await redis.get(`refresh_token:${decoded.userId}:${decoded.sessionId}`);
      if (!sessionData) {
        throw new Error('Refresh token not found or expired');
      }

      const session = JSON.parse(sessionData);

      // Check token version to handle token rotation
      if (session.tokenVersion !== decoded.tokenVersion) {
        // Token has been invalidated, revoke all user sessions
        await this.revokeUserSessions(decoded.userId);
        throw new Error('Refresh token revoked');
      }

      // Update last used timestamp
      session.lastUsed = new Date().toISOString();
      await redis.setEx(
        `refresh_token:${decoded.userId}:${decoded.sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(session)
      );

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const decoded = await this.verifyRefreshToken(refreshToken);

    // Get user data from database to include in new access token
    const userData = await this.getUserData(decoded.userId);
    if (!userData) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: userData.id,
      email: userData.email,
      accountType: userData.accountType,
      sessionId: decoded.sessionId,
    });

    // Generate new refresh token (token rotation)
    const newRefreshToken = await this.generateRefreshToken(
      decoded.userId,
      decoded.tokenVersion + 1
    );

    // Revoke old refresh token
    await this.revokeRefreshToken(decoded.userId, decoded.sessionId);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(userId: string, sessionId: string): Promise<void> {
    await redis.del(`refresh_token:${userId}:${sessionId}`);
  }

  /**
   * Revoke all user sessions
   */
  async revokeUserSessions(userId: string): Promise<void> {
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }

    // Also clear any other session-related data
    const sessionKeys = await redis.keys(`session:${userId}:*`);
    if (sessionKeys.length > 0) {
      await redis.del(sessionKeys);
    }
  }

  /**
   * Check if session is active
   */
  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const sessionData = await redis.get(`refresh_token:${userId}:${sessionId}`);
    return !!sessionData;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<Array<{
    sessionId: string;
    createdAt: string;
    lastUsed: string;
  }>> {
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    const sessions = [];

    for (const key of keys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const sessionId = key.split(':')[2];
        sessions.push({
          sessionId,
          createdAt: session.createdAt,
          lastUsed: session.lastUsed,
        });
      }
    }

    return sessions;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get user data from database (placeholder - should be implemented)
   */
  private async getUserData(userId: string): Promise<{
    id: string;
    email: string;
    accountType: string;
  } | null> {
    try {
      const result = await pool.query(
        'SELECT id, email, account_type FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        accountType: user.account_type,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();