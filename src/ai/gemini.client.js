import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const generateWithGemini = async (prompt, userApiKey = null) => {
  try {
    const apiKey = userApiKey || env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to parse JSON from the response if the prompt asked for it
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      return text;
    }
  } catch (error) {
    logger.error('Gemini generation failed:', error);
    throw new Error('AI service unavailable: ' + error.message);
  }
};
