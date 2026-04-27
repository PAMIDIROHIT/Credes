import express from 'express';
import * as postsController from './posts.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { publishPostSchema, retryPostSchema } from './posts.validator.js';

const router = express.Router();

router.post('/publish', auth, validate(publishPostSchema), postsController.publish);
router.post('/schedule', auth, validate(publishPostSchema), postsController.publish);
router.get('/', auth, postsController.list);
router.post('/:id/retry', auth, validate(retryPostSchema), postsController.retry);

export default router;
