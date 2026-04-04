import sanitizeHtml from 'sanitize-html';

const defaultOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedStyles: {}
};

function sanitizeString(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, defaultOptions).trim();
}

function sanitizeObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  for (const field of fields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]) as T[keyof T];
    }
  }

  return sanitized;
}

function sanitizePipeline(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data, ['name', 'description', 'repositoryUrl', 'branch']);
}

function sanitizeCredential(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data, ['name', 'description', 'username']);
}

function sanitizeUser(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data, ['username', 'email']);
}

function sanitizeNotification(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data, ['message', 'channel']);
}

export {
  sanitizeString,
  sanitizeObject,
  sanitizePipeline,
  sanitizeCredential,
  sanitizeUser,
  sanitizeNotification
};
