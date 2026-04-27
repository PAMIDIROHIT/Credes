import prisma from '../../config/db.js';
import { encrypt, decrypt } from '../../utils/crypto.util.js';

export const getProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, bio: true, defaultTone: true, defaultLanguage: true, createdAt: true },
  });
};

export const updateProfile = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, bio: true, defaultTone: true, defaultLanguage: true },
  });
};

export const addSocialAccount = async (userId, { platform, accessToken, refreshToken, handle }) => {
  return prisma.socialAccount.create({
    data: {
      userId,
      platform,
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: refreshToken ? encrypt(refreshToken) : null,
      handle,
    },
  });
};

export const getSocialAccounts = async (userId) => {
  return prisma.socialAccount.findMany({
    where: { userId },
    select: { id: true, platform: true, handle: true, connectedAt: true },
  });
};

export const removeSocialAccount = async (userId, accountId) => {
  return prisma.socialAccount.deleteMany({
    where: { id: accountId, userId },
  });
};

export const updateAiKeys = async (userId, { geminiKey, groqKey }) => {
  return prisma.aiKeys.upsert({
    where: { userId },
    create: {
      userId,
      geminiKeyEnc: geminiKey ? encrypt(geminiKey) : null,
      groqKeyEnc: groqKey ? encrypt(groqKey) : null,
    },
    update: {
      geminiKeyEnc: geminiKey ? encrypt(geminiKey) : null,
      groqKeyEnc: groqKey ? encrypt(groqKey) : null,
    },
  });
};
