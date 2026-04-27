import { Bot, session, InlineKeyboard } from 'grammy';
import { env } from '../../config/env.js';
import { redisStorage } from './bot.session.js';
import prisma from '../../config/db.js';
import * as contentService from '../content/content.service.js';
import * as postsService from '../posts/posts.service.js';
import { logger } from '../../utils/logger.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Use Redis for sessions
bot.use(session({
  initial: () => ({ step: 'IDLE', platforms: [] }),
  storage: redisStorage,
}));

// Middlewares to ensure user is linked
const checkAuth = async (ctx, next) => {
  const user = await prisma.user.findUnique({
    where: { telegramId: ctx.from?.id.toString() },
  });
  if (!user && !ctx.message?.text?.startsWith('/start')) {
    return ctx.reply("❌ Your Telegram account is not linked to Postly. Please link it via the dashboard or use `/start <link_token>`.");
  }
  ctx.dbUser = user;
  await next();
};

bot.command('start', async (ctx) => {
  await ctx.reply(`Welcome to Postly, ${ctx.from.first_name}! 🚀\n\nTo link your account, use:\n\`/link your_registered_email@example.com\`\n\nAfter linking, use /post to start creating content.`, { parse_mode: 'Markdown' });
});

bot.command('link', async (ctx) => {
  const email = ctx.match;
  if (!email) return ctx.reply("❌ Please provide your email: `/link email@example.com`", { parse_mode: 'Markdown' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return ctx.reply("❌ No user found with that email. Please register via the API first.");

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        telegramId: ctx.from.id.toString(),
        telegramHandle: ctx.from.username || null 
      },
    });

    await ctx.reply("✅ Success! Your Telegram account is now linked to Postly. You can now use /post.");
  } catch (error) {
    logger.error('Linking failed:', error);
    await ctx.reply("❌ Linking failed. Please try again later.");
  }
});

bot.command('help', (ctx) => {
  ctx.reply(`Postly Commands:\n/post - Start a new post flow\n/status - Show last 5 posts\n/accounts - List linked social accounts\n/help - Show this message`);
});

bot.command('post', checkAuth, async (ctx) => {
  ctx.session.step = 'ASK_TYPE';
  const keyboard = new InlineKeyboard()
    .text("Announcement", "type_announcement").text("Thread", "type_thread").row()
    .text("Story", "type_story").text("Promotional", "type_promotional").row()
    .text("Educational", "type_educational").text("Opinion", "type_opinion");
  
  await ctx.reply("Hey 👋 What type of post is this?", { reply_markup: keyboard });
});

// Handle Callback Queries (Buttons)
bot.on('callback_query:data', checkAuth, async (ctx) => {
  const data = ctx.callbackQuery.data;
  const session = ctx.session;

  if (data.startsWith('type_')) {
    session.postType = data.replace('type_', '');
    session.step = 'ASK_PLATFORMS';
    const keyboard = new InlineKeyboard()
      .text("Twitter", "plat_twitter").text("LinkedIn", "plat_linkedin").row()
      .text("Instagram", "plat_instagram").text("Threads", "plat_threads").row()
      .text("✅ Done Selecting", "plat_done");
    await ctx.editMessageText("Which platforms should I post to? (Select multiple, then click Done)", { reply_markup: keyboard });
  }

  if (data.startsWith('plat_')) {
    const plat = data.replace('plat_', '');
    if (plat === 'done') {
      if (session.platforms.length === 0) return ctx.answerCallbackQuery("Select at least one platform");
      session.step = 'ASK_TONE';
      const keyboard = new InlineKeyboard()
        .text("Professional", "tone_professional").text("Casual", "tone_casual").row()
        .text("Witty", "tone_witty").text("Authoritative", "tone_authoritative").row()
        .text("Friendly", "tone_friendly");
      await ctx.editMessageText("What tone should the content have?", { reply_markup: keyboard });
    } else {
      if (!session.platforms.includes(plat)) {
        session.platforms.push(plat);
        await ctx.answerCallbackQuery(`Added ${plat}`);
      } else {
        session.platforms = session.platforms.filter(p => p !== plat);
        await ctx.answerCallbackQuery(`Removed ${plat}`);
      }
    }
  }

  if (data.startsWith('tone_')) {
    session.tone = data.replace('tone_', '');
    session.step = 'ASK_MODEL';
    const keyboard = new InlineKeyboard()
      .text("Gemini 1.5 Flash", "model_gemini").row()
      .text("Llama 3 (Groq)", "model_groq");
    await ctx.editMessageText("Which AI model do you want to use?", { reply_markup: keyboard });
  }

  if (data.startsWith('model_')) {
    session.model = data.replace('model_', '');
    session.step = 'ASK_IDEA';
    await ctx.editMessageText("Tell me the idea or core message (Max 500 characters). Ready for your input ✍️");
  }

  if (data === 'publish_now') {
    await ctx.editMessageText("🚀 Publishing to your platforms...");
    await postsService.createPostAndQueue(ctx.dbUser.id, {
      ...session.params,
      generated_content: session.generated,
    });
    session.step = 'IDLE';
    await ctx.reply("Done! Your posts are in the queue. ✅");
  }

  await ctx.answerCallbackQuery();
});

// Handle text input for Idea
bot.on('message:text', checkAuth, async (ctx) => {
  const session = ctx.session;
  if (session.step === 'ASK_IDEA') {
    if (ctx.message.text.length > 500) return ctx.reply("Too long! Keep it under 500 chars.");
    
    session.idea = ctx.message.text;
    await ctx.reply("Generating your content... ⚙️");
    
    try {
      const params = {
        idea: session.idea,
        post_type: session.postType,
        platforms: session.platforms,
        tone: session.tone,
        language: 'en',
        model: session.model,
      };
      
      const result = await contentService.generateContent(ctx.dbUser.id, params);
      session.generated = result.generated;
      session.params = { ...params, model_used: result.model_used };

      let preview = "📚 *Post Preview*\n\n";
      for (const [plat, data] of Object.entries(result.generated)) {
        preview += `*${plat.toUpperCase()}* (${data.char_count} chars):\n${data.content}\n\n`;
      }

      const keyboard = new InlineKeyboard()
        .text("Yes, Post Now ✅", "publish_now").row()
        .text("Cancel ❌", "cancel_post");

      await ctx.reply(preview, { parse_mode: "Markdown", reply_markup: keyboard });
      session.step = 'CONFIRM';
    } catch (error) {
      logger.error('Bot generation failed:', error);
      await ctx.reply("Failed to generate content. Please try /post again.");
      session.step = 'IDLE';
    }
  }
});

bot.command('status', checkAuth, async (ctx) => {
  const stats = await postsService.getPosts(ctx.dbUser.id, { limit: 5 });
  let text = "📊 *Your Last 5 Posts*\n\n";
  stats.posts.forEach((p, i) => {
    text += `${i + 1}. [${p.postType}] ${p.idea.substring(0, 30)}... - *${p.status}*\n`;
  });
  ctx.reply(text, { parse_mode: "Markdown" });
});

bot.catch((err) => {
  logger.error('Bot Error:', err);
});
