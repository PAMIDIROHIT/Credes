import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.util.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    return sendError(res, 400, 'Database error', err.meta?.message || err.message);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};
