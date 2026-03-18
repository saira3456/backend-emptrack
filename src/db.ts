import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Helper function to clean env variables
const cleanEnv = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/^['"]|['"]$/g, '').trim();
};

// Debug: log cleaned values (without exposing full password)
console.log('Database Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  passwordSet: !!process.env.DB_PASSWORD,
  passwordLength: process.env.DB_PASSWORD?.length,
  passwordFirstChar: process.env.DB_PASSWORD?.[0],
  passwordLastChar: process.env.DB_PASSWORD?.[process.env.DB_PASSWORD.length - 1],
});

export const pool = new Pool({
  host: cleanEnv(process.env.DB_HOST),
  port: parseInt(process.env.DB_PORT || '5432'),
  user: cleanEnv(process.env.DB_USER),
  password: cleanEnv(process.env.DB_PASSWORD),
  database: cleanEnv(process.env.DB_NAME),
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully');
    release();
  }
});