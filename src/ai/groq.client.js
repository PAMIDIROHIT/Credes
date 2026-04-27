import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const generateWithGroq = async (prompt, userApiKey = null) => {
  try {
    const apiKey = userApiKey || env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key is missing');

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content;
    return JSON.parse(text);
  } catch (error) {
    logger.error('Groq generation failed:', error);
    throw new Error('AI service unavailable: ' + error.message);
  }
};
