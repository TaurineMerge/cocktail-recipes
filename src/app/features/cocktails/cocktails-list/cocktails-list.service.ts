import { computed, inject, Injectable, signal } from '@angular/core';
import { CocktailRepository } from '../cocktail.repository';
import { Cocktail } from '../cocktail.model';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CocktailsListService {
  readonly #repository = inject(CocktailRepository);

  readonly #cocktails = signal<readonly Cocktail[]>([]);
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);

  readonly cocktails = this.#cocktails.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly isEmpty = computed(() => !this.#loading() && this.#cocktails().length === 0);

  loadAll(): void {
    this.#loading.set(true);
    this.#error.set(null);

    this.#repository
      .getAll()
      .pipe(finalize(() => this.#loading.set(false)))
      .subscribe({
        next: (cocktails) => this.#cocktails.set(cocktails),
        error: () => this.#error.set('Не удалось загрузить рецепты'),
      });
  }

  remove(id: string): void {
    this.#error.set(null);

    this.#repository.delete(id).subscribe({
      next: () => this.#cocktails.update((list) => list.filter((cocktail) => cocktail.id !== id)),
      error: () => this.#error.set('Не удалось удалить рецепт'),
    });
  }
}
