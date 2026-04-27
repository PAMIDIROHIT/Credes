import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { bot } from './modules/bot/bot.service.js';
import { setupWorker } from './queue/worker.js';

const PORT = env.PORT || 3000;

// Start BullMQ Worker
setupWorker();

// Start Telegram Bot
if (env.TELEGRAM_BOT_TOKEN) {
  bot.start({
    onStart: (botInfo) => logger.info(`Telegram Bot @${botInfo.username} is running`),
  }).catch(err => logger.error("Telegram bot failed to start:", err));
} else {
  logger.warn("TELEGRAM_BOT_TOKEN not found. Bot is disabled.");
}

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});