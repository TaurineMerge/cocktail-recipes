import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { CocktailsListService } from './cocktails-list.service';
import { CocktailRepository } from '../../cocktail.repository';
import { Cocktail } from '../../cocktail.model';
import { createCocktail } from '../../_test-utils';

describe('CocktailsListService', () => {
  let service: CocktailsListService;
  let repository: {
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  function loadWith(cocktails: Cocktail[]) {
    repository.getAll.mockReturnValue(of(cocktails));
    service.loadAll();
  }

  beforeEach(() => {
    repository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [CocktailsListService, { provide: CocktailRepository, useValue: repository }],
    });

    service = TestBed.inject(CocktailsListService);
  });

  describe('начальное состояние', () => {
    it('до первого loadAll() список пуст, не грузится, isEmpty - true', () => {
      expect(service.cocktails()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.isEmpty()).toBe(true);
    });
  });

  describe('loadAll()', () => {
    it('при успешном выполнении заполняет cocktails и сбрасывает loading/error', () => {
      const cocktails = [
        createCocktail({ id: 'c1' }),
        createCocktail({ id: 'c2', name: 'Негрони' }),
      ];
      loadWith(cocktails);

      expect(repository.getAll).toHaveBeenCalledOnce();
      expect(service.cocktails()).toEqual(cocktails);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.isEmpty()).toBe(false);
    });

    it('выставляет loading в true на время запроса и обратно в false после ответа', () => {
      const subject = new Subject<readonly Cocktail[]>();
      repository.getAll.mockReturnValue(subject.asObservable());

      service.loadAll();
      expect(service.loading()).toBe(true);

      subject.next([createCocktail()]);
      subject.complete();

      expect(service.loading()).toBe(false);
    });

    it('при ошибке выставляет error, сбрасывает loading, не трогает предыдущий список', () => {
      const existing = [createCocktail({ id: 'stale' })];
      loadWith(existing);

      expect(service.cocktails()).toEqual(existing);

      repository.getAll.mockReturnValueOnce(throwError(() => new Error('network down')));
      service.loadAll();

      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('Не удалось загрузить рецепты');
      expect(service.cocktails()).toEqual(existing);
    });

    it('сбрасывает предыдущую ошибку при новой попытке загрузки', () => {
      repository.getAll.mockReturnValueOnce(throwError(() => new Error('fail')));
      service.loadAll();

      expect(service.error()).not.toBeNull();

      loadWith([createCocktail()]);

      expect(service.error()).toBeNull();
    });
  });

  describe('isEmpty', () => {
    it('true, когда список пуст и загрузка не идёт', () => {
      loadWith([]);

      expect(service.isEmpty()).toBe(true);
    });

    it('false во время загрузки, даже если список пока пуст', () => {
      const subject = new Subject<readonly Cocktail[]>();
      repository.getAll.mockReturnValue(subject.asObservable());

      service.loadAll();

      expect(service.loading()).toBe(true);
      expect(service.isEmpty()).toBe(false);
    });
  });

  describe('remove()', () => {
    it('при успешном выполнении убирает коктейль из списка по id', () => {
      const cocktails = [createCocktail({ id: 'c1' }), createCocktail({ id: 'c2' })];
      loadWith(cocktails);

      repository.delete.mockReturnValue(of(undefined));
      service.remove('c1');

      expect(repository.delete).toHaveBeenCalledWith('c1');
      expect(service.cocktails().map((c) => c.id)).toEqual(['c2']);
    });

    it('при ошибке не трогает список и выкидывает error', () => {
      const cocktails = [createCocktail({ id: 'c1' })];
      loadWith(cocktails);

      repository.delete.mockReturnValue(throwError(() => new Error('forbidden')));
      service.remove('c1');

      expect(service.cocktails()).toEqual(cocktails);
      expect(service.error()).toBe('Не удалось удалить рецепт');
    });

    it('сбрасывает предыдущую ошибку перед повторной попыткой удаления', () => {
      loadWith([createCocktail({ id: 'c1' })]);

      repository.delete.mockReturnValueOnce(throwError(() => new Error('fail')));
      service.remove('c1');
      expect(service.error()).not.toBeNull();

      repository.delete.mockReturnValueOnce(of(undefined));
      service.remove('c1');

      expect(service.error()).toBeNull();
    });
  });
});
