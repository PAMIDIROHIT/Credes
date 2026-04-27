import prisma from '../../config/db.js';
import { decrypt } from '../../utils/crypto.util.js';
import { buildPrompt } from '../../ai/prompt.builder.js';
import { generateWithGemini } from '../../ai/gemini.client.js';
import { generateWithGroq } from '../../ai/groq.client.js';
import { logger } from '../../utils/logger.js';

export const generateContent = async (userId, data) => {
  const { idea, post_type, platforms, tone, language, model } = data;

  // 1. Fetch User's AI Keys
  const aiKeys = await prisma.aiKeys.findUnique({ where: { userId } });
  
  let userApiKey = null;
  if (aiKeys) {
    if (model === 'gemini' && aiKeys.geminiKeyEnc) {
      userApiKey = decrypt(aiKeys.geminiKeyEnc);
    } else if (model === 'groq' && aiKeys.groqKeyEnc) {
      userApiKey = decrypt(aiKeys.groqKeyEnc);
    }
  }

  // 2. Build the platform-specific prompt
  const prompt = buildPrompt({ idea, postType: post_type, tone, language, platforms });

  // 3. Call the appropriate AI Service
  let result;
  if (model === 'groq') {
    result = await generateWithGroq(prompt, userApiKey);
  } else {
    // Default to Gemini as it's our primary free/fast tier
    result = await generateWithGemini(prompt, userApiKey);
  }

  logger.info(`Content generated for user ${userId} using ${model}`);

  return {
    generated: result,
    model_used: model === 'groq' ? 'llama3-70b-8192' : 'gemini-1.5-flash',
    timestamp: new Date(),
  };
};
