import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import postRoutes from './modules/posts/posts.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// API Request Tracking Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    logger.info(`[TRACKING] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${elapsed}ms`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

export default app;