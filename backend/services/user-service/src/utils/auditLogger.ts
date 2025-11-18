import { pool } from '../config/database';
import { LogSeverity } from '../../../shared/types';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: LogSeverity;
  sessionId?: string;
  requestId?: string;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, action, resource, resource_id, ip_address,
          user_agent, metadata, severity, session_id, request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const values = [
        entry.userId || null,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        entry.ip,
        entry.userAgent || null,
        JSON.stringify(entry.metadata || {}),
        entry.severity || LogSeverity.INFO,
        entry.sessionId || null,
        entry.requestId || null,
      ];

      await pool.query(query, values);

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${entry.action}: User ${entry.userId || 'anonymous'} - ${entry.resource}`, {
          ip: entry.ip,
          metadata: entry.metadata,
        });
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw here to prevent breaking the main application flow
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    action?: string,
    severity?: LogSeverity,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      let query = `
        SELECT id, action, resource, resource_id, ip_address,
               user_agent, metadata, severity, timestamp,
               session_id, request_id
        FROM audit_logs
        WHERE user_id = $1
      `;

      const values: any[] = [userId];
      let paramIndex = 2;

      if (action) {
        query += ` AND action = $${paramIndex++}`;
        values.push(action);
      }

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        values.push(severity);
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        values.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        severity: row.severity,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        requestId: row.request_id,
      }));
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      return [];
    }
  }

  /**
   * Get system-wide audit logs (admin function)
   */
  async getSystemAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      severity?: LogSeverity;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any[]> {
    try {
      let query = `
        SELECT al.id, al.action, al.resource, al.resource_id,
               al.ip_address, al.user_agent, al.metadata,
               al.severity, al.timestamp, al.session_id,
               al.request_id, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND al.user_id = $${paramIndex++}`;
        values.push(filters.userId);
      }

      if (filters.action) {
        query += ` AND al.action = $${paramIndex++}`;
        values.push(filters.action);
      }

      if (filters.resource) {
        query += ` AND al.resource = $${paramIndex++}`;
        values.push(filters.resource);
      }

      if (filters.severity) {
        query += ` AND al.severity = $${paramIndex++}`;
        values.push(filters.severity);
      }

      if (filters.startDate) {
        query += ` AND al.timestamp >= $${paramIndex++}`;
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND al.timestamp <= $${paramIndex++}`;
        values.push(filters.endDate);
      }

      query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        severity: row.severity,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        requestId: row.request_id,
        userEmail: row.user_email,
      }));
    } catch (error) {
      console.error('Error getting system audit logs:', error);
      return [];
    }
  }

  /**
   * Get security events for monitoring
   */
  async getSecurityEvents(
    limit: number = 50,
    hoursBack: number = 24
  ): Promise<any[]> {
    try {
      const query = `
        SELECT al.action, al.resource, al.ip_address,
               al.user_agent, al.metadata, al.timestamp,
               u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.timestamp >= NOW() - INTERVAL '${hoursBack} hours'
          AND (al.action ILIKE '%login%' OR
               al.action ILIKE '%failed%' OR
               al.action ILIKE '%security%' OR
               al.severity IN ('error', 'critical'))
        ORDER BY al.timestamp DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);

      return result.rows.map(row => ({
        action: row.action,
        resource: row.resource,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        timestamp: row.timestamp,
        userEmail: row.user_email,
      }));
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const query = `
        DELETE FROM audit_logs
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
      `;

      const result = await pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      return 0;
    }
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    logsBySeverity: Record<LogSeverity, number>;
    topActions: Array<{ action: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
    uniqueUsers: number;
    uniqueIPs: number;
  }> {
    try {
      let dateFilter = '';
      const values: any[] = [];

      if (startDate && endDate) {
        dateFilter = `WHERE timestamp >= $1 AND timestamp <= $2`;
        values.push(startDate, endDate);
      }

      const [totalResult, severityResult, actionsResult, resourcesResult, usersResult, ipsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM audit_logs ${dateFilter}`, values),
        pool.query(`
          SELECT severity, COUNT(*) as count
          FROM audit_logs ${dateFilter}
          GROUP BY severity
        `, values),
        pool.query(`
          SELECT action, COUNT(*) as count
          FROM audit_logs ${dateFilter}
          GROUP BY action
          ORDER BY count DESC
          LIMIT 10
        `, values),
        pool.query(`
          SELECT resource, COUNT(*) as count
          FROM audit_logs ${dateFilter}
          GROUP BY resource
          ORDER BY count DESC
          LIMIT 10
        `, values),
        pool.query(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM audit_logs
          ${dateFilter ? dateFilter.replace('WHERE', 'WHERE user_id IS NOT NULL AND') : 'WHERE user_id IS NOT NULL'}
        `, values),
        pool.query(`
          SELECT COUNT(DISTINCT ip_address) as count
          FROM audit_logs ${dateFilter}
        `, values),
      ]);

      const logsBySeverity: Record<LogSeverity, number> = {
        [LogSeverity.INFO]: 0,
        [LogSeverity.WARNING]: 0,
        [LogSeverity.ERROR]: 0,
        [LogSeverity.CRITICAL]: 0,
      };

      severityResult.rows.forEach(row => {
        logsBySeverity[row.severity as LogSeverity] = parseInt(row.count);
      });

      return {
        totalLogs: parseInt(totalResult.rows[0].total),
        logsBySeverity,
        topActions: actionsResult.rows.map(row => ({
          action: row.action,
          count: parseInt(row.count),
        })),
        topResources: resourcesResult.rows.map(row => ({
          resource: row.resource,
          count: parseInt(row.count),
        })),
        uniqueUsers: parseInt(usersResult.rows[0].count),
        uniqueIPs: parseInt(ipsResult.rows[0].count),
      };
    } catch (error) {
      console.error('Error getting audit log statistics:', error);
      return {
        totalLogs: 0,
        logsBySeverity: {
          [LogSeverity.INFO]: 0,
          [LogSeverity.WARNING]: 0,
          [LogSeverity.ERROR]: 0,
          [LogSeverity.CRITICAL]: 0,
        },
        topActions: [],
        topResources: [],
        uniqueUsers: 0,
        uniqueIPs: 0,
      };
    }
  }
}

export const auditLogger = new AuditLogger();