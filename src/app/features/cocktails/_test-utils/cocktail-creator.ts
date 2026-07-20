import { Cocktail } from '../cocktail.model';

export function createCocktail(overrides: Partial<Cocktail> = {}): Cocktail {
  const cocktail: Cocktail = {
    id: 'c1',
    name: 'Мохито',
    description: 'Освежающий коктейль',
    imageBase64: 'data:image/png;base64,hero',
    steps: [{ id: 's1', text: 'Размять мяту', imagesBase64: ['data:image/png;base64,step'] }],
    createdAt: '2026-07-01T00:00:00.000Z',
    ownerId: 'u1',
    ...overrides,
  };

  return cocktail;
}
