import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

import { createJsonStore } from '../store/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const ACCESS_TOKEN_TTL_MS = Number(process.env.ACCESS_TOKEN_TTL_S ?? 900);
const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS ?? 604800000);
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'cocktail-recipes-rc';
const REFRESH_COOKIE_PATH = '/api/auth';

const usersStore = createJsonStore(path.join(__dirname, '../store/users.json'));
const refreshTokensStore = createJsonStore(path.join(__dirname, '../store/refresh-tokens.json'));

const router = express.Router();

function toPublicUser(user) {
  return { id: user.id, email: user.email };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_MS,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

async function issueSession(res, user) {
  const refreshToken = crypto.randomBytes(32).toString('hex');

  const record = {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
  };

  const tokens = await refreshTokensStore.readAll();
  const stillValid = tokens.filter((t) => t.expiresAt > Date.now());
  stillValid.push(record);

  await refreshTokensStore.writeAll(stillValid);

  setRefreshCookie(res, refreshToken);

  return {
    accessToken: signAccessToken(user),
    user: toPublicUser(user),
  };
}

router.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== 'string' || password.length < 6) {
    logger.warn('auth.register.invalid_input', { ip: req.ip });
    return res.status(400).json({
      message: 'Некорректный email или пароль короче 6 символов',
    });
  }

  const users = await usersStore.readAll();

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({
      message: 'Пользователь с таким email уже существует',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
  };

  users.push(user);
  await usersStore.writeAll(users);

  logger.info('auth.register.success', { userId: user.id, email: user.email, ip: req.ip });

  res.status(201).json(await issueSession(res, user));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  const users = await usersStore.readAll();

  const user = users.find((u) => u.email.toLowerCase() === (email ?? '').toLowerCase());

  const passwordMatches = user ? await bcrypt.compare(password ?? '', user.passwordHash) : false;

  if (!user || !passwordMatches) {
    logger.warn('auth.login.failed', { email, ip: req.ip });
    return res.status(401).json({
      message: 'Неверный email или пароль',
    });
  }

  logger.info('auth.login.success', { userId: user.id, email: user.email, ip: req.ip });

  res.json(await issueSession(res, user));
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    logger.debug('auth.refresh.no_cookie', { ip: req.ip });
    return res.status(401).json({ message: 'Сессия не найдена' });
  }

  const tokenHash = hashToken(refreshToken);
  const tokens = await refreshTokensStore.readAll();

  const record = tokens.find((t) => t.tokenHash === tokenHash);

  if (!record || record.expiresAt <= Date.now()) {
    logger.warn('auth.refresh.rejected', { ip: req.ip, reason: !record ? 'not_found' : 'expired' });

    clearRefreshCookie(res);

    return res.status(401).json({
      message: 'Сессия истекла, нужен повторный вход',
    });
  }

  const users = await usersStore.readAll();

  const user = users.find((u) => u.id === record.userId);

  if (!user) {
    logger.error('auth.refresh.orphan_token', { userId: record.userId, ip: req.ip });
    clearRefreshCookie(res);

    return res.status(401).json({
      message: 'Пользователь не найден',
    });
  }

  await refreshTokensStore.writeAll(tokens.filter((t) => t.id !== record.id));

  logger.debug('auth.refresh.rotated', { userId: user.id });

  res.json(await issueSession(res, user));
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const tokens = await refreshTokensStore.readAll();

    await refreshTokensStore.writeAll(tokens.filter((t) => t.tokenHash !== tokenHash));
  }

  logger.info('auth.logout', { ip: req.ip });

  clearRefreshCookie(res);
  res.status(204).send();
});

export default router;
