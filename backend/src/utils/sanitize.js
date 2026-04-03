const sanitizeHtml = require('sanitize-html');

const defaultOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedStyles: {}
};

function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, defaultOptions).trim();
}

function sanitizeObject(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const field of fields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  }
  
  return sanitized;
}

function sanitizePipeline(data) {
  return sanitizeObject(data, ['name', 'description', 'repositoryUrl', 'branch']);
}

function sanitizeCredential(data) {
  return sanitizeObject(data, ['name', 'description', 'username']);
}

function sanitizeUser(data) {
  return sanitizeObject(data, ['username', 'email']);
}

function sanitizeNotification(data) {
  return sanitizeObject(data, ['message', 'channel']);
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizePipeline,
  sanitizeCredential,
  sanitizeUser,
  sanitizeNotification
};
