import { Pool } from 'pg';

// PostgreSQL Configuration
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'autotrade21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s if connection not established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create PostgreSQL connection pool
export const pool = new Pool(pgConfig);

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);

export default {
  pool,
  initializeDatabase,
  closeDatabase,
};

// Import JWT verification (shared with user service)
export const jwtService = {
  verifyAccessToken: (token: string) => {
    // This would typically call the user service or use shared JWT verification
    // For simplicity, we'll implement basic verification here
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'your-access-secret');
    return decoded;
  }
};