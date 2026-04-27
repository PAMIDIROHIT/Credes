import fs from 'fs';

// Update references to INCLUDE .js extension in imports!
let authCtrl = `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.util.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req, res) => {
  try {
    const pars = registerSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
    const { email, password, name } = pars.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password_hash, name },
    });

    res.status(201).json({
      data: { id: user.id, email: user.email, name: user.name },
      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const pars = loginSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
    const { email, password } = pars.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const access_token = jwt.sign({ id: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
    const refresh_token = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token },
    });

    res.status(200).json({
      data: { access_token, refresh_token },
      message: 'Login successful',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user || user.refresh_token !== refresh_token) {
        return res.status(403).json({ error: 'Refresh token revoked or invalid' });
    }

    const access_token = jwt.sign({ id: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
    const new_refresh_token = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.user.update({
        where: { id: user.id },
        data: { refresh_token: new_refresh_token }
    });

    res.status(200).json({
      data: { access_token, refresh_token: new_refresh_token },
    });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refresh_token: null },
      });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, name: true, bio: true, default_tone: true, default_language: true, created_at: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
`;
fs.writeFileSync('src/controllers/auth.controller.js', authCtrl);

let userCtrl = `import { z } from 'zod';
import { prisma } from '../utils/prisma.util.js';
import { encrypt } from '../utils/encryption.util.js';

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

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, name: true, bio: true, default_tone: true, default_language: true, created_at: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const pars = profileUpdateSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });

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

export const addSocialAccount = async (req, res) => {
  try {
    const pars = socialAccountSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });

    const { platform, access_token, refresh_token, handle } = pars.data;

    const existing = await prisma.socialAccount.findFirst({
        where: { user_id: req.user?.id, platform }
    });

    const accountData = {
        user_id: req.user.id,
        platform,
        access_token_enc: encrypt(access_token),
        refresh_token_enc: refresh_token ? encrypt(refresh_token) : null,
        handle,
    };

    if (existing) {
        const updated = await prisma.socialAccount.update({
            where: { id: existing.id },
            data: accountData
        });
        return res.status(200).json({ data: { id: updated.id, platform: updated.platform, handle: updated.handle }, message: 'Social account updated' });
    }

    const newAccount = await prisma.socialAccount.create({ data: accountData });
    res.status(201).json({ data: { id: newAccount.id, platform: newAccount.platform, handle: newAccount.handle }, message: 'Social account connected' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSocialAccounts = async (req, res) => {
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

export const removeSocialAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await prisma.socialAccount.findUnique({ where: { id } });
    if (!account || account.user_id !== req.user?.id) {
      return res.status(404).json({ error: 'Account not found or unauthorized' });
    }

    await prisma.socialAccount.delete({ where: { id } });
    res.status(200).json({ message: 'Social account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAiKeys = async (req, res) => {
  try {
    const pars = aiKeysSchema.safeParse(req.body);
    if (!pars.success) return res.status(400).json({ error: 'Validation failed', details: pars.error.format() });

    const { openai_key, anthropic_key } = pars.data; // Mapped to gemini/groq later or retained as requested
    const existing = await prisma.aiKey.findUnique({
        where: { user_id: req.user?.id }
    });

    const aiKeysData = {
        user_id: req.user.id,
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
`;
fs.writeFileSync('src/controllers/user.controller.js', userCtrl);

let authRoutes = `import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);
export default router;`;
fs.writeFileSync('src/routes/auth.routes.js', authRoutes);

let userRoutes = `import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { getProfile, updateProfile, addSocialAccount, listSocialAccounts, removeSocialAccount, updateAiKeys } from '../controllers/user.controller.js';
const router = Router();
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);
router.post('/social-accounts', authenticateJWT, addSocialAccount);
router.get('/social-accounts', authenticateJWT, listSocialAccounts);
router.delete('/social-accounts/:id', authenticateJWT, removeSocialAccount);
router.put('/ai-keys', authenticateJWT, updateAiKeys);
export default router;`;
fs.writeFileSync('src/routes/user.routes.js', userRoutes);

let appJs = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
// Add postRoutes here later

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => { res.status(200).json({ status: 'ok', timestamp: new Date() }); });
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

export default app;`;
fs.writeFileSync('src/app.js', appJs);

let serverJs = `import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});`;
fs.writeFileSync('src/server.js', serverJs);

console.log("Fix script executed.");
