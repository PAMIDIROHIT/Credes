import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { prisma } from '../utils/prisma.util.js';
import { decrypt } from '../utils/encryption.util.js';

// Setup clients with fallbacks using user's explicitly provided keys
// Note: We map Anthropic to Gemini since user stated to use Gemini/Groq explicitly in chat constraints.
const fallbackGeminiKey = process.env.ANTHROPIC_API_KEY; // Reusing .env keys mapped to new models
const fallbackGroqKey = process.env.OPENAI_API_KEY;

export const generateContent = async (userId, params) => {
  const { idea, post_type, platforms, tone, language, model } = params;

  // Retrieve user's saved keys if any
  const aiKeys = await prisma.aiKey.findUnique({ where: { user_id: userId } });
  const userGeminiKey = aiKeys?.anthropic_key_enc ? decrypt(aiKeys.anthropic_key_enc) : fallbackGeminiKey;
  const userGroqKey = aiKeys?.openai_key_enc ? decrypt(aiKeys.openai_key_enc) : fallbackGroqKey;

  const results = {};
  let tokensUsed = 0;

  const sysPrompt = `
    You are an expert social media manager.
    Create content based on the user's idea: "${idea}"
    Post Type: ${post_type}
    Tone: ${tone}
    Language: ${language}
    
    If Twitter is requested, ensure max 280 characters and 2-3 hashtags, punchy opener.
    If LinkedIn is requested, 800-1300 characters, highly professional regardless of base tone, 3-5 hashtags.
    If Instagram is requested, emoji-friendly caption + 10-15 hashtags.
    If Threads is requested, max 500 characters, conversational.

    Format your output strictly as a JSON object where keys are platform names ("twitter", "linkedin", "instagram", "threads") with 'content', 'char_count', and 'hashtags' metadata inside.
  `;

  try {
    let rawResult = '';

    if (model === 'openai' || model === 'groq') {
       const groq = new Groq({ apiKey: userGroqKey });
       const completion = await groq.chat.completions.create({
          messages: [{ role: 'system', content: sysPrompt }],
          model: 'mixtral-8x7b-32768',
          response_format: { type: 'json_object' }
       });
       rawResult = completion.choices[0].message.content;
       tokensUsed = completion.usage?.total_tokens || 0;
    } else {
       // Gemini
       const genAI = new GoogleGenerativeAI(userGeminiKey);
       const ai = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       const response = await ai.generateContent(sysPrompt);
       rawResult = response.response.text();
       // Strip markdown if exists
       if (rawResult.startsWith('\`\`\`json')) {
           rawResult = rawResult.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
       }
       tokensUsed = 1500; // estimated fallback as gemini-js doesn't easily expose exact text tokens reliably in basic wrapper
    }

    const generatedDict = JSON.parse(rawResult);
    
    // Process requested platforms only
    platforms.forEach(p => {
       if (generatedDict[p]) results[p] = generatedDict[p];
    });

    return { generated: results, model_used: model === 'openai' ? 'Groq/Mixtral' : 'Gemini 1.5', tokens_used: tokensUsed };

  } catch (error) {
    console.error('AI Generation error:', error);
    throw new Error('AI Generation Failed');
  }
};