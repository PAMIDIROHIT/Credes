import { z } from 'zod';

export const publishPostSchema = z.object({
  body: z.object({
    idea: z.string().max(500),
    post_type: z.string(),
    tone: z.string(),
    language: z.string(),
    model_used: z.string(),
    generated_content: z.record(z.object({
      content: z.string(),
    })),
    publish_at: z.string().optional(), // ISO string
  }),
});

export const retryPostSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
