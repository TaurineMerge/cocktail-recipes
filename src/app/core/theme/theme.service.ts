import { effect, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'cocktail-recipes-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly #mode = signal<ThemeMode>(this.resolveInitialMode());
  readonly mode = this.#mode.asReadonly();

  constructor() {
    effect(() => {
      const currentMode = this.mode();
      document.documentElement.classList.toggle('dark-theme', currentMode === 'dark');
      localStorage.setItem(STORAGE_KEY, currentMode);
    });
  }

  setMode(mode: ThemeMode): void {
    this.#mode.set(mode);
  }

  private resolveInitialMode(): ThemeMode {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;

    return isDarkPreferred ? 'dark' : 'light';
  }
}
