import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.util';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

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

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const pars = registerSchema.safeParse(req.body);
    if (!pars.success) {
      res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
      return;
    }
    const { email, password, name } = pars.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name,
      },
    });

    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const pars = loginSchema.safeParse(req.body);
    if (!pars.success) {
      res.status(400).json({ error: 'Validation failed', details: pars.error.format() });
      return;
    }
    const { email, password } = pars.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const access_token = jwt.sign({ id: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
    const refresh_token = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token },
    });

    // Store the refresh token generically inside bio or a dedicated token table; wait, we don't have a refresh_token field in schema! Wait, the instruction says "Refresh token: long-lived (7 days), stored in DB (not just stateless), rotated on use". It also gives schema hints which don't have it... Let me store it in a session table or add it to users if allowed. Actually, let's create a Session table conceptually or just add it. The schema hint is: `users (id, email, password_hash, name, bio, default_tone, default_language, created_at)`.
    // Wait, the assignment explicitly requests storing the refresh token in the DB. I'll add refresh_token to the User model.

    // Oh wait, I can just execute the logic, wait, I need to update the Prisma schema adding refresh_token to User!
    
    // For now, I'll just return the tokens. I will update schema.
    res.status(200).json({
      data: { access_token, refresh_token },
      message: 'Login successful',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(refresh_token, REFRESH_SECRET) as { id: string };
    
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }

    if (user.refresh_token !== refresh_token) {
        res.status(403).json({ error: 'Refresh token revoked or invalid' });
        return;
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

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        default_tone: true,
        default_language: true,
        created_at: true,
      },
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
