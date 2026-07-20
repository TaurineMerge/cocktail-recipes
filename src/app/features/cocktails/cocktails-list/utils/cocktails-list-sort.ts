import { Cocktail } from '../../cocktail.model';

export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
export const SORT_OPTIONS = ['date-desc', 'date-asc', 'name-asc', 'name-desc'] as const;

export const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': 'Сначала новые',
  'date-asc': 'Сначала старые',
  'name-asc': 'По названию (А–Я)',
  'name-desc': 'По названию (Я–А)',
};

export function sortCocktails(cocktails: readonly Cocktail[], option: SortOption): Cocktail[] {
  const sorted = [...cocktails];

  switch (option) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));

    case 'date-asc':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    case 'date-desc':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
