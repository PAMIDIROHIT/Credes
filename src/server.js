import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { bot } from './bot/telegram.js';
import { initWorker } from './queue/publisher.js';

const PORT = process.env.PORT || 3000;

// Initialize background worker for BullMQ
initWorker();

// Start the Grammy Bot connection (Long Polling for Dev)
if (process.env.TELEGRAM_BOT_TOKEN) {
    bot.start({
        onStart: (botInfo) => {
            console.log(`Telegram Bot @${botInfo.username} started successfully.`);
        }
    }).catch(err => console.error("Telegram bot failed to start:", err));
} else {
    console.warn("TELEGRAM_BOT_TOKEN not found. Bot is disabled.");
}

app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});