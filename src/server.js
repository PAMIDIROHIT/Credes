import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { bot } from './modules/bot/bot.service.js';
import { setupWorker } from './queue/worker.js';
import { webhookCallback } from 'grammy';

const PORT = env.PORT || 3000;

// Start BullMQ Worker
setupWorker();

// Ensure express parsing before webhook
app.use(express.json());

// Start Telegram Bot
if (env.TELEGRAM_WEBHOOK_URL) {
  // Use Webhook Strategy (Tracked via Webhook)
  logger.info(`Setting up Telegram Webhook tracking at ${env.TELEGRAM_WEBHOOK_URL}/api/bot/webhook`);
  app.use('/api/bot/webhook', webhookCallback(bot, 'express'));
  bot.api.setWebhook(`${env.TELEGRAM_WEBHOOK_URL}/api/bot/webhook`)
    .then(() => logger.info("✅ Telegram Webhook registered successfully"))
    .catch(err => logger.error("❌ Telegram webhook registration failed:", err));
} else if (env.TELEGRAM_BOT_TOKEN) {
  // Use Long Polling (Dev Strategy fallback)
  bot.start({
    onStart: (botInfo) => logger.info(`Telegram Bot @${botInfo.username} is running in polling mode`),
  }).catch(err => logger.error("Telegram bot failed to start:", err));
} else {
  logger.warn("TELEGRAM_BOT_TOKEN not found. Bot is disabled.");
}

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});