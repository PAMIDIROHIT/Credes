import { generateWithOpenAI } from '../../ai/openai.client.js';
import { generateWithAnthropic } from '../../ai/anthropic.client.js';
import { generateWithGemini } from '../../ai/gemini.client.js';
import { generateWithGroq } from '../../ai/groq.client.js';
import { buildPrompt } from '../../ai/prompt.builder.js';
import { decrypt } from '../../utils/crypto.util.js';
import prisma from '../../config/db.js';
import { logger } from '../../utils/logger.js';

export const generateContent = async (userId, data) => {
  const { idea, post_type, platforms, tone, language, model } = data;

  // 1. Fetch User's AI Keys
  const aiKeys = await prisma.aiKeys.findUnique({ where: { userId } });
  
  let userApiKey = null;
  if (aiKeys) {
    if (model === 'openai' && aiKeys.openaiKeyEnc) {
      userApiKey = decrypt(aiKeys.openaiKeyEnc);
    } else if (model === 'anthropic' && aiKeys.anthropicKeyEnc) {
      userApiKey = decrypt(aiKeys.anthropicKeyEnc);
    } else if (model === 'gemini' && aiKeys.geminiKeyEnc) {
      userApiKey = decrypt(aiKeys.geminiKeyEnc);
    } else if (model === 'groq' && aiKeys.groqKeyEnc) {
      userApiKey = decrypt(aiKeys.groqKeyEnc);
    }
  }

  // 2. Build the platform-specific prompt
  const prompt = buildPrompt({ idea, postType: post_type, tone, language, platforms });

  // 3. Call the appropriate AI Service
  let result;
  if (model === 'openai') {
    result = await generateWithOpenAI(prompt, userApiKey);
  } else if (model === 'anthropic') {
    result = await generateWithAnthropic(prompt, userApiKey);
  } else if (model === 'groq') {
    result = await generateWithGroq(prompt, userApiKey);
  } else {
    result = await generateWithGemini(prompt, userApiKey);
  }

  logger.info(`Content generated for user ${userId} using ${model}`);

  // 4. Force-filter out platforms the user didn't ask for (LLM hallucination safety grid)
  const filteredResult = {};
  for (const requestedPlat of platforms) {
    const key = Object.keys(result).find(k => k.toLowerCase() === requestedPlat.toLowerCase() || (requestedPlat === 'twitter' && k.toLowerCase() === 'x'));
    if (key && result[key]) {
      filteredResult[requestedPlat] = result[key];
    }
  }

  // Fallback to raw result if the filter stripped everything due to malformed keys.
  const finalResult = Object.keys(filteredResult).length > 0 ? filteredResult : result;

  return {
    generated: finalResult,
    model_used: model,
    timestamp: new Date(),
  };
};
