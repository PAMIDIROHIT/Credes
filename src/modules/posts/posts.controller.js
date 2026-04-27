import * as postsService from './posts.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export const publish = async (req, res, next) => {
  try {
    const post = await postsService.createPostAndQueue(req.user.id, req.body);
    return sendSuccess(res, post, 'Post queued for publishing', 201);
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await postsService.getPosts(req.user.id, req.query);
    return sendSuccess(res, result.posts, 'Posts retrieved successfully', 200, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const post = await postsService.getPostById(req.user.id, req.params.id);
    return sendSuccess(res, post, 'Post retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const retry = async (req, res, next) => {
  try {
    const result = await postsService.retryFailedPost(req.user.id, req.params.id);
    return sendSuccess(res, result, 'Retry job queued');
  } catch (error) {
    next(error);
  }
};
