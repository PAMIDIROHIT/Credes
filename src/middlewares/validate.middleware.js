import { sendError } from '../utils/response.util.js';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return sendError(res, 400, 'Validation failed', error.errors);
  }
};
