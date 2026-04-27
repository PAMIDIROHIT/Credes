import dotenv from 'dotenv';
dotenv.config();

// Only set fallbacks if they don't already exist in the real .env
process.env.NODE_ENV = 'test';
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db';
if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://localhost:6379';
if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = '12345678901234567890123456789012';
if (!process.env.TELEGRAM_BOT_TOKEN) process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';