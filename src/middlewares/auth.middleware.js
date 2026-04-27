import { verifyAccessToken } from '../utils/jwt.util.js';
import { sendError } from '../utils/response.util.js';
import prisma from '../config/db.js';

export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized', 'Missing or invalid token');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return sendError(res, 401, 'Unauthorized', 'Token expired or invalid');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return sendError(res, 401, 'Unauthorized', 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
