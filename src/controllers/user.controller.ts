import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.util';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { encrypt } from '../utils/encryption.util';

const profileUpdateSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  default_tone: z.string().optional(),
  default_language: z.string().optional(),
});

const socialAccountSchema = z.object({
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'threads']),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  handle: z.string().optional(),
});

const aiKeysSchema = z.object({
  openai_key: z.string().optional(),
  anthropic_key: z.string().optional(),
});

// Profile Manangement

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, name: true, bio: true, default_tone: true, default_language: true, created_at: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pars = profileUpdateSchema.safeParse(req.body);
    if (!pars.success) {
      res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user?.id },
      data: pars.data,
      select: { id: true, email: true, name: true, bio: true, default_tone: true, default_language: true },
    });

    res.status(200).json({ data: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Social Accounts Management

export const addSocialAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pars = socialAccountSchema.safeParse(req.body);
    if (!pars.success) {
      res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
      return;
    }

    const { platform, access_token, refresh_token, handle } = pars.data;

    // Optional checking to see if already linked
    const existing = await prisma.socialAccount.findFirst({
        where: { user_id: req.user?.id, platform }
    });

    const accountData = {
        user_id: req.user!.id,
        platform,
        access_token_enc: encrypt(access_token),
        refresh_token_enc: refresh_token ? encrypt(refresh_token) : null,
        handle,
    };

    if (existing) {
        // Update existing instead of creating duplicate
        const updated = await prisma.socialAccount.update({
            where: { id: existing.id },
            data: accountData
        });
        res.status(200).json({ data: { id: updated.id, platform: updated.platform, handle: updated.handle }, message: 'Social account updated' });
        return;
    }

    const newAccount = await prisma.socialAccount.create({ data: accountData });
    res.status(201).json({ data: { id: newAccount.id, platform: newAccount.platform, handle: newAccount.handle }, message: 'Social account connected' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSocialAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { user_id: req.user?.id },
      select: { id: true, platform: true, handle: true, connected_at: true },
    });
    res.status(200).json({ data: accounts });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeSocialAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Ensure it belongs to user
    const account = await prisma.socialAccount.findUnique({ where: { id } });
    if (!account || account.user_id !== req.user?.id) {
      res.status(404).json({ error: 'Account not found or unauthorized' });
      return;
    }

    await prisma.socialAccount.delete({ where: { id } });
    res.status(200).json({ message: 'Social account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// AI Keys Management

export const updateAiKeys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pars = aiKeysSchema.safeParse(req.body);
    if (!pars.success) {
      res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
      return;
    }

    const { openai_key, anthropic_key } = pars.data;
    
    const existing = await prisma.aiKey.findUnique({
        where: { user_id: req.user?.id }
    });

    const aiKeysData = {
        user_id: req.user!.id,
        openai_key_enc: openai_key ? encrypt(openai_key) : existing?.openai_key_enc,
        anthropic_key_enc: anthropic_key ? encrypt(anthropic_key) : existing?.anthropic_key_enc,
    };

    if (existing) {
        await prisma.aiKey.update({ where: { id: existing.id }, data: aiKeysData });
    } else {
        await prisma.aiKey.create({ data: aiKeysData });
    }

    res.status(200).json({ message: 'AI keys securely saved' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};