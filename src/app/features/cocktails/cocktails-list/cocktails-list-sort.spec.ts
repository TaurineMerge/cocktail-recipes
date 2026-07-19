import { describe, it, expect } from 'vitest';
import { sortCocktails } from './cocktails-list-sort';
import { createCocktail } from '../_test-utils';

describe('sortCocktails', () => {
  it('не мутирует исходный массив', () => {
    const originalCocktails = [
      createCocktail({ id: 'a', name: 'Б' }),
      createCocktail({ id: 'b', name: 'А' }),
    ];
    const originalCocktailsOrderIds = originalCocktails.map((cocktail) => cocktail.id);

    const result = sortCocktails(originalCocktails, 'name-asc');

    expect(result).not.toBe(originalCocktails);
    expect(originalCocktails.map((cocktail) => cocktail.id)).toEqual(originalCocktailsOrderIds);
  });

  it.each(['date-desc', 'date-asc', 'name-asc', 'name-desc'] as const)(
    'возвращает пустой массив при переданном пустом массиве для %s',
    (sort) => expect(sortCocktails([], sort)).toEqual([]),
  );

  it('name-asc сортирует по алфавиту в порядке возрастания с учётом кириллической локали', () => {
    const cocktails = [
      createCocktail({ id: 'c1', name: 'Мохито' }),
      createCocktail({ id: 'c2', name: 'Апероль' }),
      createCocktail({ id: 'c3', name: 'Негрони' }),
      createCocktail({ id: 'c4', name: 'Ежевичный сауэр' }),
    ];

    const result = sortCocktails(cocktails, 'name-asc');

    expect(result.map((c) => c.name)).toEqual(['Апероль', 'Ежевичный сауэр', 'Мохито', 'Негрони']);
  });

  it('name-desc соответствует name-asc в обратном порядке', () => {
    const cocktails = [
      createCocktail({ id: 'c1', name: 'Мохито' }),
      createCocktail({ id: 'c2', name: 'Апероль' }),
      createCocktail({ id: 'c3', name: 'Негрони' }),
      createCocktail({ id: 'c4', name: 'Ежевичный сауэр' }),
    ];

    const asc = sortCocktails(cocktails, 'name-asc').map((c) => c.id);
    const desc = sortCocktails(cocktails, 'name-desc').map((c) => c.id);

    expect(desc).toEqual([...asc].reverse());
  });

  it('date-desc ставит самый новый рецепт первым', () => {
    const cocktails = [
      createCocktail({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      createCocktail({ id: 'new', createdAt: '2026-07-15T00:00:00.000Z' }),
      createCocktail({ id: 'mid', createdAt: '2026-04-01T00:00:00.000Z' }),
    ];

    const result = sortCocktails(cocktails, 'date-desc');

    expect(result.map((c) => c.id)).toEqual(['new', 'mid', 'old']);
  });

  it('date-asc ставит самый старый рецепт первым', () => {
    const cocktails = [
      createCocktail({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      createCocktail({ id: 'new', createdAt: '2026-07-15T00:00:00.000Z' }),
      createCocktail({ id: 'mid', createdAt: '2026-04-01T00:00:00.000Z' }),
    ];

    const result = sortCocktails(cocktails, 'date-asc');

    expect(result.map((c) => c.id)).toEqual(['old', 'mid', 'new']);
  });

  it('сохраняет порядок элементов с одинаковой датой', () => {
    const cocktails = [
      createCocktail({ id: '5', createdAt: '2026-03-01T00:00:00.000Z' }),
      createCocktail({ id: '1', createdAt: '2026-01-01T00:00:00.000Z' }),
      createCocktail({ id: '2', createdAt: '2026-01-01T00:00:00.000Z' }),
      createCocktail({ id: '3', createdAt: '2026-02-01T00:00:00.000Z' }),
      createCocktail({ id: '4', createdAt: '2026-02-01T00:00:00.000Z' }),
    ];

    expect(sortCocktails(cocktails, 'date-asc').map((c) => c.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });
});
