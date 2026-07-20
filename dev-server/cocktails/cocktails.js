import express from 'express';
import path from 'node:path';
import { createJsonStore } from '../store/store.js';
import { requireAuth } from '../auth/require-auth-middleware.js';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cocktailsStore = createJsonStore(path.join(__dirname, '../store/cocktails.json'));
const router = express.Router();
export default router;

router.use(requireAuth);

const EDITABLE_FIELDS = ['name', 'description', 'imageBase64', 'steps'];

function pickEditableFields(body = {}) {
  const result = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      result[field] = body[field];
    }
  }
  return result;
}

router.get('/', async (req, res) => {
  const all = await cocktailsStore.readAll();
  res.json(all.filter((c) => c.ownerId === req.user.id));
});

router.get('/:id', async (req, res) => {
  const all = await cocktailsStore.readAll();
  const cocktail = all.find((c) => c.id === req.params.id);

  if (!cocktail) {
    return res.status(404).json({ message: 'Рецепт не найден' });
  }
  if (cocktail.ownerId !== req.user.id) {
    logger.warn('cocktails.access_denied', {
      cocktailId: req.params.id,
      requestedBy: req.user.id,
      ownerId: cocktail.ownerId,
    });
    return res.status(403).json({ message: 'Нет доступа к этому рецепту' });
  }
  res.json(cocktail);
});

router.post('/', async (req, res) => {
  const all = await cocktailsStore.readAll();

  const cocktail = {
    id: crypto.randomUUID(),
    ...pickEditableFields(req.body),
    createdAt: new Date().toISOString(),
    ownerId: req.user.id,
  };

  all.push(cocktail);
  await cocktailsStore.writeAll(all);
  res.status(201).json(cocktail);
});

router.patch('/:id', async (req, res) => {
  const all = await cocktailsStore.readAll();
  const index = all.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'Рецепт не найден' });
  }
  if (all[index].ownerId !== req.user.id) {
    logger.warn('cocktails.access_denied', {
      cocktailId: req.params.id,
      requestedBy: req.user.id,
      ownerId: all[index].ownerId.ownerId,
    });
    return res.status(403).json({ message: 'Нет доступа к этому рецепту' });
  }

  const updated = { ...all[index], ...pickEditableFields(req.body) };
  all[index] = updated;
  await cocktailsStore.writeAll(all);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const all = await cocktailsStore.readAll();
  const index = all.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'Рецепт не найден' });
  }
  if (all[index].ownerId !== req.user.id) {
    logger.warn('cocktails.access_denied', {
      cocktailId: req.params.id,
      requestedBy: req.user.id,
      ownerId: all[index].ownerId.ownerId,
    });
    return res.status(403).json({ message: 'Нет доступа к этому рецепту' });
  }

  all.splice(index, 1);
  await cocktailsStore.writeAll(all);
  res.status(204).send();
});
