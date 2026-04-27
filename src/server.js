import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { bot } from './modules/bot/bot.service.js';
import { setupWorker } from './queue/worker.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import './modules/posts/posts.scheduler.js';
import redisInstance from './config/redis.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
});

const app = express();
const PORT = parseInt(env.PORT || '3005', 10);

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', uptime: process.uptime() }));

// Global Error Handler
app.use(errorHandler);

// Initialize Components (Gracefully)
export const init = async () => {
  logger.info("🚀 Initializing Postly Engine...");
  
  // 1. Worker (Requires Redis)
  if (redisInstance) {
    try {
      setupWorker();
      logger.info("✅ BullMQ Worker started");
    } catch (e) { 
      logger.error("❌ Worker Initialization Failed:", e.message); 
    }
  }

  // 2. Bot
  if (env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'test') {
    bot.start({
      onStart: (botInfo) => logger.info(`✅ Telegram Bot @${botInfo.username} is active`),
    }).catch(err => {
      if (err.message.includes('Conflict')) {
        logger.warn("⚠️ Bot Polling Conflict detected. Another instance is active.");
      } else {
        logger.error("❌ Bot failed:", err.message);
      }
    });
  }

  // 3. Server
  if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ API Server is alive on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`PORT ${PORT} is busy. Trying ${PORT + 1}...`);
      }
    });
  }
};

// Only auto-init if not being imported for tests
if (process.env.NODE_ENV !== 'test') {
  init();
}

export default app;