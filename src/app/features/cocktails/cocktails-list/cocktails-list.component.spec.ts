import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CocktailsListComponent } from './cocktails-list.component';
import { CocktailsListService } from './services/cocktails-list.service';
import { Cocktail } from '../cocktail.model';
import { createCocktail } from '../_test-utils';

describe('CocktailsListComponent', () => {
  let cocktailsSignal: ReturnType<typeof signal<readonly Cocktail[]>>;
  let loadingSignal: ReturnType<typeof signal<boolean>>;
  let errorSignal: ReturnType<typeof signal<string | null>>;
  let fakeService: {
    cocktails: typeof cocktailsSignal;
    loading: typeof loadingSignal;
    error: typeof errorSignal;
    isEmpty: ReturnType<typeof computed<boolean>>;
    loadAll: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let dialogOpenMock: ReturnType<typeof vi.fn>;
  let matchesMobile: boolean;

  beforeEach(() => {
    cocktailsSignal = signal<readonly Cocktail[]>([]);
    loadingSignal = signal(false);
    errorSignal = signal<string | null>(null);
    matchesMobile = false;
    dialogOpenMock = vi.fn();

    fakeService = {
      cocktails: cocktailsSignal,
      loading: loadingSignal,
      error: errorSignal,
      isEmpty: computed(() => !loadingSignal() && cocktailsSignal().length === 0),
      loadAll: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CocktailsListService, useValue: fakeService as unknown as CocktailsListService },
        { provide: MatDialog, useValue: { open: dialogOpenMock } },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: matchesMobile, breakpoints: {} }),
            isMatched: () => matchesMobile,
          },
        },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(CocktailsListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('вызывает loadAll() при инициализации', () => {
    createComponent();
    expect(fakeService.loadAll).toHaveBeenCalledOnce();
  });

  it('показывает спиннер, пока loading() true', () => {
    loadingSignal.set(true);
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });

  it('показывает сообщение об ошибке из сервиса', () => {
    errorSignal.set('Не удалось загрузить рецепты');
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Не удалось загрузить рецепты');
  });

  it('показывает empty-state, когда список пуст и загрузка завершена', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Пока нет ни одного рецепта');
  });

  it('рендерит таблицу на десктопе (isMobile = false)', () => {
    cocktailsSignal.set([createCocktail()]);
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cocktails-page__cards')).toBeNull();
  });

  it('рендерит карточки на мобильном (isMobile = true)', () => {
    matchesMobile = true;
    cocktailsSignal.set([createCocktail()]);
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.cocktails-page__cards')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  describe('remove()', () => {
    it('вызывает service.remove() только при подтверждении в диалоге', () => {
      const cocktail = createCocktail({ id: 'c1' });
      cocktailsSignal.set([cocktail]);
      dialogOpenMock.mockReturnValue({ afterClosed: () => of(true) });

      const fixture = createComponent();
      fixture.componentInstance.remove(cocktail);

      expect(dialogOpenMock).toHaveBeenCalledOnce();
      expect(fakeService.remove).toHaveBeenCalledWith('c1');
    });

    it('не вызывает service.remove(), если диалог отменён', () => {
      const cocktail = createCocktail({ id: 'c1' });
      cocktailsSignal.set([cocktail]);
      dialogOpenMock.mockReturnValue({ afterClosed: () => of(false) });

      const fixture = createComponent();
      fixture.componentInstance.remove(cocktail);

      expect(fakeService.remove).not.toHaveBeenCalled();
    });
  });

  describe('openDetail()', () => {
    it('переходит на страницу деталей коктейля по клику на строку/карточку', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const cocktail = createCocktail({ id: 'c1' });

      const fixture = createComponent();
      fixture.componentInstance.openDetail(cocktail);

      expect(navigateSpy).toHaveBeenCalledWith(['/cocktails', 'c1']);
    });
  });

  describe('сортировка', () => {
    // тесты сортировки см. в cocktails-list-sort.spec.ts
    it('setSort() меняет вариант сортировки и это отражается в sortedCocktails', () => {
      cocktailsSignal.set([
        createCocktail({ id: 'a', name: 'Б' }),
        createCocktail({ id: 'b', name: 'А' }),
      ]);
      const fixture = createComponent();

      fixture.componentInstance.setSort('name-asc');
      fixture.detectChanges();

      const component = fixture.componentInstance as unknown as {
        sortedCocktails: () => Cocktail[];
      };
      expect(component.sortedCocktails().map((c) => c.id)).toEqual(['b', 'a']);
    });
  });
});
