import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Helper function to clean env variables
const cleanEnv = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/^['"]|['"]$/g, '').trim();
};

// Debug: log cleaned values
console.log('Database Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? 'enabled' : 'disabled',
  passwordSet: !!process.env.DB_PASSWORD,
  passwordLength: process.env.DB_PASSWORD?.length,
});

export const pool = new Pool({
  host: cleanEnv(process.env.DB_HOST),
  port: parseInt(process.env.DB_PORT || '5432'),
  user: cleanEnv(process.env.DB_USER),
  password: cleanEnv(process.env.DB_PASSWORD),
  database: cleanEnv(process.env.DB_NAME),
  ssl: process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
});

// Test the connection with proper TypeScript error handling
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', {
      message: err.message,
      code: (err as any).code, // FIX: Cast to any to access 'code' property
      stack: err.stack
    });
  } else {
    console.log('✅ Database connected successfully to Neon!');
    
    // FIX: Check if client exists before using it
    if (client) {
      client.query('SELECT NOW() as current_time, current_database() as db_name', (err, res) => {
        if (err) {
          console.error('❌ Test query failed:', err.message);
        } else {
          console.log('📊 Connection info:', {
            time: res.rows[0].current_time,
            database: res.rows[0].db_name
          });
        }
        release(); // Release the client
      });
    } else {
      console.error('❌ Client is undefined');
      release();
    }
  }
});