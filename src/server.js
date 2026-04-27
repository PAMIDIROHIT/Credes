import express from 'express';
import { webhookCallback } from 'grammy';

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

const app = express();
const PORT = parseInt(env.PORT || '3005', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (req, res) => res.json({ status: 'OK', uptime: process.uptime() }));
app.use(errorHandler);

export const init = async () => {
  logger.info("🚀 Initializing Postly Engine...");
  
  // 1. Worker
  if (redisInstance) {
    try {
      setupWorker();
      logger.info("✅ BullMQ Worker started");
    } catch (e) { 
      logger.error("❌ Worker Initialization Failed:", e.message); 
    }
  }


  // 2. Bot
  // Strict check: only skip bot if NODE_ENV is explicitly 'test'
  if (env.TELEGRAM_BOT_TOKEN && env.NODE_ENV !== 'test') {
    (async () => {
      try {
        if (env.NODE_ENV === 'production' && env.TELEGRAM_WEBHOOK_URL) {
          logger.info(`🌐 Setting Bot Webhook to: ${env.TELEGRAM_WEBHOOK_URL}`);
          await bot.api.setWebhook(env.TELEGRAM_WEBHOOK_URL);
          // Assuming grammy's webhookCallback is available, adding a route.
          // (Requires app to be available, so moving router mapping here)
          app.use('/bot/webhook', webhookCallback(bot, 'express'));
          logger.info(`✅ Webhook listener mounted at /bot/webhook`);
        } else {
          logger.info("🧹 Development Mode: Dropping webhooks and using Polling...");
          await bot.api.deleteWebhook({ drop_pending_updates: true });
          await bot.start({
            onStart: (botInfo) => logger.info(`✅ Telegram Bot @${botInfo.username} is polling`),
          });
        }
      } catch (err) {
        logger.error("❌ Bot failure:", err.message);
      }
    })();
  } else {
    logger.warn(`⚠️ Bot Startup Skipped (Env: ${env.NODE_ENV})`);
  }


  // 3. Server
  if (env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ API Server is alive on port ${PORT}`);
    });
  }
};

// Check if we are running the main script
const isMain = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
const shouldInit = env.NODE_ENV !== 'test' && !process.argv.includes('--no-init');

if (shouldInit) {
  init().catch(e => logger.error('Engine Init Failed:', e));
} else {
  logger.warn(`🚀 Engine in ${env.NODE_ENV} mode. Manual init required.`);
}

export default app;