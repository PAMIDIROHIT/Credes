import bcrypt from 'bcrypt';
import prisma from '../../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.util.js';
import { AppError } from '../../utils/AppError.js';

export const register = async (email, password, name) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });
};

export const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = signAccessToken({ id: user.id });
  const refreshTokenString = signRefreshToken({ id: user.id });

  // Store refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken: refreshTokenString };
};

export const refresh = async (refreshTokenString) => {
  const decoded = verifyRefreshToken(refreshTokenString);
  if (!decoded) throw new Error('Invalid refresh token');

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenString },
    include: { user: true },
  });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired or revoked');
  }

  // Rotate token: revoke old, create new
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  const accessToken = signAccessToken({ id: storedToken.userId });
  const newRefreshTokenString = signRefreshToken({ id: storedToken.userId });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshTokenString,
      userId: storedToken.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshTokenString };
};

export const logout = async (refreshTokenString) => {
  await prisma.refreshToken.update({
    where: { token: refreshTokenString },
    data: { revoked: true },
  });
};
