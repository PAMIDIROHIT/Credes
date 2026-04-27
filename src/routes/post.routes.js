import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import {
  apiGenerateContent,
  publishPost,
  getPosts,
  getPostDetail,
  getStats,
  cancelPost
} from '../controllers/post.controller.js';

const router = Router();

// Generation & Publishing
router.post('/generate', authenticateJWT, apiGenerateContent);
router.post('/publish', authenticateJWT, publishPost);
router.post('/schedule', authenticateJWT, publishPost); // uses same logic

// Dashboard APIs
router.get('/', authenticateJWT, getPosts);
router.get('/dashboard/stats', authenticateJWT, getStats);
router.get('/:id', authenticateJWT, getPostDetail);
router.delete('/:id', authenticateJWT, cancelPost);

export default router;