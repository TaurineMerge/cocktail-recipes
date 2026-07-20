import jwt from 'jsonwebtoken';
import { logger } from '../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logger.debug('auth.middleware.no_token', { path: req.originalUrl, ip: req.ip });
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    logger.debug('auth.middleware.invalid_token', { path: req.originalUrl, ip: req.ip });
    res.status(401).json({ message: 'Invalid token' });
  }
}
