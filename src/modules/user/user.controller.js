import * as userService from './user.service.js';
import { sendSuccess } from '../../utils/response.util.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user.id, req.body);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
};

export const addSocialAccount = async (req, res, next) => {
  try {
    const account = await userService.addSocialAccount(req.user.id, req.body);
    sendSuccess(res, account, {}, 201);
  } catch (error) {
    next(error);
  }
};

export const getSocialAccounts = async (req, res, next) => {
  try {
    const accounts = await userService.getSocialAccounts(req.user.id);
    sendSuccess(res, accounts);
  } catch (error) {
    next(error);
  }
};

export const removeSocialAccount = async (req, res, next) => {
  try {
    await userService.removeSocialAccount(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Social account removed' });
  } catch (error) {
    next(error);
  }
};

export const updateAiKeys = async (req, res, next) => {
  try {
    await userService.updateAiKeys(req.user.id, req.body);
    sendSuccess(res, { message: 'AI keys updated successfully' });
  } catch (error) {
    next(error);
  }
};
