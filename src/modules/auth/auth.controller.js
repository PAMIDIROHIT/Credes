import * as authService from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.util.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await authService.register(email, password, name);
    sendSuccess(res, user, {}, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refresh(refreshToken);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = (req, res) => {
  const { id, email, name, bio, defaultTone, defaultLanguage } = req.user;
  sendSuccess(res, { id, email, name, bio, defaultTone, defaultLanguage });
};
