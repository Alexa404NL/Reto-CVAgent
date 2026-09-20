const STATUS_BY_TYPE = {
  invalid_request: 400,
  not_found: 404,
  too_many_requests: 429,
  server_error: 500,
  model_error: 500,
};

export function sendError(res, type, message, { param, code, status } = {}) {
  res.status(status ?? STATUS_BY_TYPE[type] ?? 500).json({
    error: { message, type, ...(param && { param }), ...(code && { code }) },
  });
}
