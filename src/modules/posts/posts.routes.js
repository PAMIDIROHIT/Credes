import express from 'express';
import * as postsController from './posts.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { publishPostSchema, retryPostSchema } from './posts.validator.js';

const router = express.Router();

router.post('/publish', auth, validate(publishPostSchema), postsController.publish);
router.post('/schedule', auth, validate(publishPostSchema), postsController.publish);
router.get('/', auth, postsController.list);
router.get('/:id', auth, postsController.getById);
router.post('/:id/retry', auth, validate(retryPostSchema), postsController.retry);
router.delete('/:id', auth, postsController.deleteById);

export default router;
