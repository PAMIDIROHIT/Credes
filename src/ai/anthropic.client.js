import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const generateWithAnthropic = async (prompt, userApiKey = null) => {
  try {
    const apiKey = userApiKey || env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key is missing');

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    
    // Robust extraction for Anthropic
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      logger.error('Anthropic JSON Parse Failed:', text);
      throw new Error('AI response was not in JSON format.');
    }
  } catch (error) {
    logger.error('Anthropic generation failed:', error);
    throw new Error('AI service unavailable: ' + error.message);
  }
};
