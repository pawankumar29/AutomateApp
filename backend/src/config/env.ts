import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: process.env.API_PREFIX || '/api',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/job_apply_saas',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Auth & Security
  JWT_SECRET: process.env.JWT_SECRET || 'saas_jwt_secret_key_production_grade_super_secure_32_chars!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef', // 32 chars for AES-256

  // External Services
  AUTOMATION_SERVICE_URL: process.env.AUTOMATION_SERVICE_URL || 'http://localhost:8000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  // File Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), '../uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
};
