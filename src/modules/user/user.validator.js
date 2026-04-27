import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    bio: z.string().max(500).optional(),
    defaultTone: z.enum(['professional', 'casual', 'witty', 'authoritative', 'friendly']).optional(),
    defaultLanguage: z.string().length(2).optional(),
  }),
});

export const addSocialAccountSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter', 'linkedin', 'instagram', 'threads']),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    handle: z.string(),
  }),
});

export const updateAiKeysSchema = z.object({
  body: z.object({
    geminiKey: z.string().optional(),
    groqKey: z.string().optional(),
  }),
});

