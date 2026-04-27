export const sendSuccess = (res, data, meta = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    data,
    meta,
    error: null,
  });
};

export const sendError = (res, statusCode, message, detail = null) => {
  return res.status(statusCode).json({
    data: null,
    meta: {},
    error: {
      message,
      detail,
    },
  });
};
