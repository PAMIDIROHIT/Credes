import { z } from 'zod';

export const generateContentSchema = z.object({
  body: z.object({
    idea: z.string().min(10).max(500),
    post_type: z.enum(['announcement', 'thread', 'story', 'promotional', 'educational', 'opinion']),
    platforms: z.array(z.enum(['twitter', 'linkedin', 'instagram', 'threads'])).min(1),
    tone: z.enum(['professional', 'casual', 'witty', 'authoritative', 'friendly']),
    language: z.string().default('en'),
    model: z.enum(['openai', 'anthropic', 'gemini', 'groq']).default('gemini'),
  }),
});
