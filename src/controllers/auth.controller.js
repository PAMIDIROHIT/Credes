import bcrypt from 'bcrypt';
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
