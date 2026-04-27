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

// Global Trace Middleware
bot.use(async (ctx, next) => {
  logger.info(`[BOT] Received update_id: ${ctx.update.update_id} | Type: ${ctx.update.message ? 'Message' : 'Other'}`);
  if (ctx.message) logger.info(`[BOT] Text: ${ctx.message.text}`);
  try {
    await next();
  } catch (err) {
    logger.error("[BOT] Middleware Error:", err);
    throw err;
  }
});

// Middlewares to ensure user is linked
bot.command('start', async (ctx) => {
  logger.info(`[BOT] Handling /start for ${ctx.from.id}`);
  await ctx.reply(`Welcome to Postly, ${ctx.from.first_name}! 🚀\n\nTo link your account, use:\n\`/link your_email@example.com\`\n\nRegistered already? Use /post to create content.`, { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => {
  ctx.reply(`Postly Commands:\n/post - Start a new post flow\n/status - Show last 5 posts\n/accounts - List linked social accounts\n/help - Show this message`);
});

// Middlewares to ensure user is linked
const checkAuth = async (ctx, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: ctx.from?.id.toString() },
    });
    
    if (!user) {
      if (ctx.message?.text?.startsWith('/link') || ctx.message?.text?.startsWith('/start')) {
        return await next();
      }
      return ctx.reply("❌ Account not linked. Please use `/link email@example.com` to connect your Postly account.", { parse_mode: 'Markdown' });
    }
    
    ctx.dbUser = user;
    await next();
  } catch (err) {
    logger.error("[BOT] Auth Middleware Error:", err);
    await ctx.reply("⚠️ Bot is having trouble reaching the database. Please try again in 1 minute.");
  }
};

bot.command('link', async (ctx) => {
  const email = ctx.match?.trim().toLowerCase();
  logger.info(`Bot link attempt for email: [${email}]`);
  if (!email) return ctx.reply("❌ Please provide your email: `/link email@example.com`", { parse_mode: 'Markdown' });

  try {
    const user = await prisma.user.findUnique({ where: { email } }).catch(e => {
        logger.error("Database error during findUnique:", e.message);
        throw new Error("DATABASE_UNREACHABLE");
    });

    if (!user) return ctx.reply("❌ No user found with that email. Please register via the API first.");

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        telegramId: ctx.from.id.toString(),
        telegramHandle: ctx.from.username || null 
      },
    }).catch(e => {
        logger.error("Database error during update:", e.message);
        throw new Error("DATABASE_UPDATE_FAILED");
    });

    await ctx.reply("✅ Success! Your Telegram account is now linked to Postly. You can now use /post.");
  } catch (error) {
    if (error.message === "DATABASE_UNREACHABLE" || error.message === "DATABASE_UPDATE_FAILED") {
        await ctx.reply("❌ Database connection issue. I've logged this for the developers. Please try again in a few minutes.");
    } else {
        logger.error('Linking failed:', error);
        await ctx.reply("❌ Linking failed. Please try again later.");
    }
  }
});

bot.command('post', checkAuth, async (ctx) => {
  ctx.session.step = 'ASK_TYPE';
  ctx.session.platforms = []; // Reset platforms for new post
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
    const status = `📝 Type: *${session.postType.toUpperCase()}*`;
    const keyboard = new InlineKeyboard()
      .text("Twitter", "plat_twitter").text("LinkedIn", "plat_linkedin").row()
      .text("Instagram", "plat_instagram").text("Threads", "plat_threads").row()
      .text("⬅️ Back", "nav_back_to_type")
      .text("✅ Done Selecting", "plat_done");
    await ctx.editMessageText(`${status}\n\nWhich platforms should I post to? (Select multiple, then click Done)`, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  }

  if (data === 'nav_back_to_type') {
    session.step = 'ASK_TYPE';
    session.platforms = [];
    const keyboard = new InlineKeyboard()
      .text("Announcement", "type_announcement").text("Thread", "type_thread").row()
      .text("Story", "type_story").text("Promotional", "type_promotional").row()
      .text("Educational", "type_educational").text("Opinion", "type_opinion");
    await ctx.editMessageText("Hey 👋 What type of post is this?", { reply_markup: keyboard });
  }

  if (data === 'nav_back_to_platforms') {
    session.step = 'ASK_PLATFORMS';
    const status = `📝 Type: *${session.postType.toUpperCase()}*`;
    const keyboard = new InlineKeyboard()
      .text(session.platforms.includes("twitter") ? "Twitter ✅" : "Twitter", "plat_twitter")
      .text(session.platforms.includes("linkedin") ? "LinkedIn ✅" : "LinkedIn", "plat_linkedin").row()
      .text(session.platforms.includes("instagram") ? "Instagram ✅" : "Instagram", "plat_instagram")
      .text(session.platforms.includes("threads") ? "Threads ✅" : "Threads", "plat_threads").row()
      .text("⬅️ Back", "nav_back_to_type")
      .text("✅ Done Selecting", "plat_done");
    await ctx.editMessageText(`${status}\n\nWhich platforms should I post to? (Select multiple, then click Done)`, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  }

  if (data === 'nav_back_to_tone') {
    session.step = 'ASK_TONE';
    const status = `📝 Type: *${session.postType.toUpperCase()}*\n🛰️ Platforms: *${session.platforms.map(p => p.toUpperCase()).join(', ')}*`;
    const keyboard = new InlineKeyboard()
      .text("Professional", "tone_professional").text("Casual", "tone_casual").row()
      .text("Witty", "tone_witty").text("Authoritative", "tone_authoritative").row()
      .text("Friendly", "tone_friendly").row()
      .text("⬅️ Back", "nav_back_to_platforms");
    await ctx.editMessageText(`${status}\n\nNow, what **tone** should the content have?`, { reply_markup: keyboard, parse_mode: "Markdown" });
  }

  if (data === 'nav_back_to_model') {
    session.step = 'ASK_MODEL';
    const status = `📝 Type: *${session.postType.toUpperCase()}*\n🛰️ Platforms: *${session.platforms.map(p => p.toUpperCase()).join(', ')}*\n🎭 Tone: *${session.tone.toUpperCase()}*`;
    const keyboard = new InlineKeyboard()
      .text("GPT-4o (OpenAI)", "model_openai").text("Claude 3.5 (Anthropic)", "model_anthropic").row()
      .text("Gemini 1.5 Flash", "model_gemini").text("Llama 3.3 (Groq)", "model_groq").row()
      .text("⬅️ Back", "nav_back_to_tone");
    await ctx.editMessageText(`${status}\n\nWhich AI model do you want to use?`, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  }

  if (data.startsWith('plat_')) {
    await ctx.answerCallbackQuery().catch(() => {}); // Immediate feedback
    const plat = data.replace('plat_', '');
    
    if (plat === 'done') {
      if (!session.platforms || session.platforms.length === 0) {
        return ctx.answerCallbackQuery({
          text: "⚠️ Please select at least one platform to proceed.",
          show_alert: true
        });
      }
      
      session.step = 'ASK_TONE';
      const status = `📝 Type: *${session.postType.toUpperCase()}*\n🛰️ Platforms: *${session.platforms.map(p => p.toUpperCase()).join(', ')}*`;
      const keyboard = new InlineKeyboard()
        .text("Professional", "tone_professional").text("Casual", "tone_casual").row()
        .text("Witty", "tone_witty").text("Authoritative", "tone_authoritative").row()
        .text("Friendly", "tone_friendly").row()
        .text("⬅️ Back", "nav_back_to_platforms");
      await ctx.editMessageText(`${status}\n\nNow, what **tone** should the content have?`, { reply_markup: keyboard, parse_mode: "Markdown" });
    } else {
      // Toggle platform
      if (!session.platforms) session.platforms = [];
      const platId = plat.toLowerCase();
      if (!session.platforms.includes(platId)) {
        session.platforms.push(platId);
      } else {
        session.platforms = session.platforms.filter(p => p !== platId);
      }
      
      const getLabel = (id, name) => session.platforms.includes(id) ? `${name} ✅` : name;
      const keyboard = new InlineKeyboard()
        .text(getLabel("twitter", "Twitter"), "plat_twitter").text(getLabel("linkedin", "LinkedIn"), "plat_linkedin").row()
        .text(getLabel("instagram", "Instagram"), "plat_instagram").text(getLabel("threads", "Threads"), "plat_threads").row()
        .text("⬅️ Back", "nav_back_to_type")
        .text("✅ Done Selecting", "plat_done");
      
      const status = `📝 Type: *${session.postType.toUpperCase()}*`;
      await ctx.editMessageText(`${status}\n\nWhich platforms should I post to? (Select multiple, then click Done)`, { 
        reply_markup: keyboard,
        parse_mode: "Markdown"
      }).catch(e => {
        // Ignored if text unchanged
      });
    }
  }

  if (data.startsWith('tone_')) {
    session.tone = data.replace('tone_', '');
    session.step = 'ASK_MODEL';
    const status = `📝 Type: *${session.postType.toUpperCase()}*\n🛰️ Platforms: *${session.platforms.map(p => p.toUpperCase()).join(', ')}*\n🎭 Tone: *${session.tone.toUpperCase()}*`;
    const keyboard = new InlineKeyboard()
      .text("GPT-4o (OpenAI)", "model_openai").text("Claude 3.5 (Anthropic)", "model_anthropic").row()
      .text("Gemini 1.5 Flash", "model_gemini").text("Llama 3.3 (Groq)", "model_groq").row()
      .text("⬅️ Back", "nav_back_to_tone");
    await ctx.editMessageText(`${status}\n\nWhich AI model do you want to use?`, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  }

  if (data.startsWith('model_')) {
    session.model = data.replace('model_', '');
    session.step = 'ASK_IDEA';
    const platLabels = (session.platforms || []).map(p => p.toUpperCase()).join(', ');
    const keyboard = new InlineKeyboard()
      .text("⬅️ Back to Model", "nav_back_to_model");
    await ctx.editMessageText(`✅ Config: [${platLabels}] via ${session.model}`, { reply_markup: keyboard });
    await ctx.reply(`Tell me the idea or core message (Max 500 characters). Ready for your input ✍️`, { parse_mode: 'Markdown' });
  }

  if (data === 'publish_now') {
    await ctx.editMessageText("🚀 Publishing to your platforms...");
    await postsService.createPostAndQueue(ctx.dbUser.id, {
      ...session.params,
      generated_content: session.generated,
    });
    session.step = 'IDLE';
    await ctx.reply("✅ Done! Your posts are in the queue.\n\nUse `/status` to track their progress live!", { parse_mode: 'Markdown' });
  }

  if (data === 'edit_idea') {
    session.step = 'ASK_IDEA';
    const platLabels = (session.platforms || []).map(p => p.toUpperCase()).join(', ');
    await ctx.editMessageText(`✏️ Editing idea for: [${platLabels}] via ${session.model}\n\nReady for your updated input ✍️`);
  }

  if (data === 'cancel_post' || data === 'cancel_post') {
    session.step = 'IDLE';
    await ctx.editMessageText("❌ Post creation cancelled.");
    await ctx.reply("System reset. You can start a new post with /post whenever you're ready.");
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
      
      // AI schema adaptation: handle both wrapped and unwrapped results
      const generated = result.generated || result;
      session.generated = generated;
      session.params = { ...params, model_used: result.model_used || params.model };

      let preview = "📚 *Post Preview*\n\n";
      for (const [plat, data] of Object.entries(generated)) {
        if (typeof data === 'object' && data.content) {
          preview += `*${plat.toUpperCase()}* (${data.char_count || data.content.length} chars):\n${data.content}\n\n`;
        }
      }

      const keyboard = new InlineKeyboard()
        .text("Yes, Post Now ✅", "publish_now").row()
        .text("Edit Idea ✏️", "edit_idea")
        .text("Cancel ❌", "cancel_post");

      await ctx.reply(preview, { parse_mode: "Markdown", reply_markup: keyboard });
      session.step = 'CONFIRM';
    } catch (error) {
      logger.error('Bot generation failed:', error);
      await ctx.reply("Failed to generate content. Please try /post again.");
      session.step = 'IDLE';
    }
  } else if (!ctx.message.text.startsWith('/')) {
    // Fallback for non-command text in IDLE
    await ctx.reply("🤖 I'm ready! Use /post to start a new content flow, or /help for more commands.");
  }
});

bot.command('accounts', checkAuth, async (ctx) => {
  const accounts = await prisma.socialAccount.findMany({
    where: { userId: ctx.dbUser.id }
  });

  if (accounts.length === 0) {
    return ctx.reply("🔌 You haven't linked any social accounts yet.\nUse the dashboard to link your Twitter or LinkedIn!");
  }

  let text = "🔌 *Your Linked Accounts*\n\n";
  accounts.forEach(acc => {
    text += `- *${acc.platform.toUpperCase()}*: ${acc.username || 'Linked'}\n`;
  });
  ctx.reply(text, { parse_mode: "Markdown" });
});

const statusHandler = async (ctx) => {
  try {
    const { posts } = await postsService.getPosts(ctx.dbUser.id, { limit: 5 });
    if (posts.length === 0) return ctx.reply("📭 Queue is empty. Use /post to start!");

    let text = "📊 *Post Status* (Latest 5)\n\n";
    posts.forEach((p, i) => {
      text += `${i + 1}. *[${p.postType.toUpperCase()}]* ${p.idea.substring(0, 25)}...\n`;
      p.platformPosts?.forEach(pp => {
        const icon = pp.status === 'published' ? '✅' : (pp.status === 'failed' ? '❌' : '⏳');
        text += `   ${icon} ${pp.platform}: ${pp.status}\n`;
      });
      text += "\n";
    });
    ctx.reply(text, { parse_mode: "Markdown" });
  } catch (e) {
    logger.error("Status check failed:", e);
    ctx.reply("❌ Failed to fetch queue status.");
  }
};

bot.command('status', checkAuth, statusHandler);
bot.command('queue', checkAuth, statusHandler);

bot.catch((err) => {
  logger.error('Bot Error:', err);
});
