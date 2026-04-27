import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const generateWithOpenAI = async (prompt, userApiKey = null) => {
  try {
    const apiKey = userApiKey || env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key is missing');

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content;
    return JSON.parse(text);
  } catch (error) {
    logger.error('OpenAI generation failed:', error);
    throw new Error('AI service unavailable: ' + error.message);
  }
};
