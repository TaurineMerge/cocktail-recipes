import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CocktailDetailComponent } from './cocktail-detail.component';
import { CocktailRepository } from '../cocktail.repository';
import { createCocktail } from '../_test-utils';
import { Cocktail } from '../cocktail.model';

describe('CocktailDetailComponent', () => {
  let repository: { getById: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let dialogOpenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = { getById: vi.fn(), delete: vi.fn() };
    dialogOpenMock = vi.fn();
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CocktailRepository, useValue: repository },
        { provide: MatDialog, useValue: { open: dialogOpenMock } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } },
        },
      ],
    });

    return TestBed.createComponent(CocktailDetailComponent);
  }

  it('показывает спиннер, пока рецепт загружается', () => {
    const subject = new Subject<Cocktail>();
    repository.getById.mockReturnValue(subject.asObservable());

    const fixture = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();

    subject.next(createCocktail());
    subject.complete();
    fixture.detectChanges();
  });

  it('рендерит название, описание, hero-картинку и шаги при успешной загрузке', () => {
    repository.getById.mockReturnValue(of(createCocktail()));
    const fixture = setup();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Мохито');
    expect(el.textContent).toContain('Размять мяту');
    expect(el.querySelector('.cocktail-detail-page__hero')).not.toBeNull();
    expect(el.querySelectorAll('.cocktail-detail-page__step-images img').length).toBe(1);
  });

  it('не рендерит hero-блок, если imageBase64 не задан', () => {
    repository.getById.mockReturnValue(of(createCocktail({ imageBase64: undefined })));
    const fixture = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cocktail-detail-page__hero')).toBeNull();
  });

  it('показывает сообщение об ошибке при неудачной загрузке', () => {
    repository.getById.mockReturnValue(throwError(() => new Error('not found')));
    const fixture = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Не удалось загрузить рецепт');
  });

  describe('remove()', () => {
    it('удаляет рецепт и переходит на /cocktails только при подтверждении', () => {
      const cocktail = createCocktail({ id: 'c1' });
      repository.getById.mockReturnValue(of(cocktail));
      repository.delete.mockReturnValue(of(undefined));
      dialogOpenMock.mockReturnValue({ afterClosed: () => of(true) });

      const fixture = setup();
      fixture.detectChanges();

      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance.remove();

      expect(repository.delete).toHaveBeenCalledWith('c1');
      expect(navigateSpy).toHaveBeenCalledWith(['/cocktails']);
    });

    it('не удаляет рецепт, если диалог отменён', () => {
      repository.getById.mockReturnValue(of(createCocktail({ id: 'c1' })));
      dialogOpenMock.mockReturnValue({ afterClosed: () => of(false) });

      const fixture = setup();
      fixture.detectChanges();

      fixture.componentInstance.remove();

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
