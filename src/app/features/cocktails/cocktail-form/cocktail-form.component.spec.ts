import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CocktailFormComponent } from './cocktail-form.component';
import { CocktailRepository } from '../cocktail.repository';
import { FormArray, FormGroup } from '@angular/forms';
import { createCocktail } from '../_test-utils';
import { Cocktail } from '../cocktail.model';
import { Component } from '@angular/core';

type TestableComponent = {
  form: FormGroup<any>;
  stepsArray: FormArray<any>;
  isEditMode: boolean;
  isLoading: () => boolean;
  isSubmitting: () => boolean;
  loadError: () => string | null;
  submitError: () => string | null;
  addStep: () => void;
  removeStep: (i: number) => void;
  reorderSteps: (event: any) => void;
  submit: () => void;
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

function fillValidForm(component: TestableComponent) {
  component.form.controls['basicInfo'].patchValue({
    name: 'Дайкири',
    description: 'Кубинская классика',
  });
  component.stepsArray.at(0).patchValue({
    text: 'Смешать в шейкере',
  });
}

describe('CocktailFormComponent', () => {
  let repository: {
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
  });

  function setup(routeId: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'cocktails/:id', component: DummyComponent },
          { path: 'cocktails', component: DummyComponent },
        ]),
        provideNoopAnimations(),
        { provide: CocktailRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(CocktailFormComponent);
    const component = fixture.componentInstance as unknown as TestableComponent;
    return { fixture, component };
  }

  describe('режим создания (без id в маршруте)', () => {
    it('сразу добавляет один пустой шаг, isEditMode - false', () => {
      const { component } = setup(null);

      expect(component.isEditMode).toBe(false);
      expect(component.stepsArray.length).toBe(1);
      expect(component.isLoading()).toBe(false);
    });

    it('не вызывает repository.getById()', () => {
      setup(null);
      expect(repository.getById).not.toHaveBeenCalled();
    });

    it('submit() с невалидной формой помечает все поля touched и не шлёт запрос', () => {
      const { fixture, component } = setup(null);
      fixture.detectChanges();

      component.submit();

      expect(repository.create).not.toHaveBeenCalled();
      expect(component.form.controls['basicInfo'].touched).toBe(true);
    });

    it('submit() с валидной формой вызывает repository.create() с собранным payload', () => {
      const { fixture, component } = setup(null);
      fixture.detectChanges();

      fillValidForm(component);

      const created = createCocktail({ id: 'new-id', name: 'Дайкири' });
      repository.create.mockReturnValue(of(created));
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.submit();

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Дайкири',
        description: 'Кубинская классика',
        imageBase64: undefined,
        steps: [{ id: expect.any(String), text: 'Смешать в шейкере', imagesBase64: [] }],
      });
      expect(navigateSpy).toHaveBeenCalledWith(['/cocktails', 'new-id']);
    });

    it('submit() при ошибке сети выставляет submitError и снимает isSubmitting', () => {
      const { fixture, component } = setup(null);
      fixture.detectChanges();

      fillValidForm(component);

      repository.create.mockReturnValue(throwError(() => new Error('network down')));

      component.submit();

      expect(component.isSubmitting()).toBe(false);
      expect(component.submitError()).toBe('Не удалось сохранить рецепт. Попробуйте ещё раз');
    });

    it('повторный вызов submit() во время уже идущего запроса игнорируется', () => {
      const { fixture, component } = setup(null);
      fixture.detectChanges();

      fillValidForm(component);

      const subject = new Subject<Cocktail>();

      repository.create.mockReturnValue(subject.asObservable());

      component.submit();
      component.submit();

      expect(repository.create).toHaveBeenCalledTimes(1);

      subject.next(createCocktail());
      subject.complete();
    });
  });

  describe('режим редактирования (id есть в маршруте)', () => {
    it('показывает спиннер, пока рецепт загружается', () => {
      const subject = new Subject<Cocktail>();
      repository.getById.mockReturnValue(subject.asObservable());

      const { fixture } = setup('c1');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();

      subject.next(createCocktail());
      subject.complete();
      fixture.detectChanges();
    });

    it('заполняет форму данными загруженного рецепта', () => {
      const cocktail = createCocktail({
        name: 'Апероль Шпритц',
        description: 'Лёгкий аперитив',
        steps: [
          { id: 's1', text: 'Налить просекко', imagesBase64: [] },
          { id: 's2', text: 'Добавить апероль', imagesBase64: ['data:image/png;base64,abc'] },
        ],
      });
      repository.getById.mockReturnValue(of(cocktail));

      const { component } = setup('c1');

      expect(component.isLoading()).toBe(false);
      expect(component.form.controls['basicInfo'].value.name).toBe('Апероль Шпритц');
      expect(component.stepsArray.length).toBe(2);
      expect(component.stepsArray.at(1).value.text).toBe('Добавить апероль');
    });

    it('при ошибке загрузки выставляет loadError и не трогает форму', () => {
      repository.getById.mockReturnValue(throwError(() => new Error('not found')));

      const { component } = setup('c1');

      expect(component.isLoading()).toBe(false);
      expect(component.loadError()).toBe('Не удалось загрузить рецепт');
      expect(component.stepsArray.length).toBe(0);
    });

    it('submit() вызывает repository.update() с id из маршрута', () => {
      repository.getById.mockReturnValue(of(createCocktail({ id: 'c1' })));
      const { component } = setup('c1');

      const updated = createCocktail({ id: 'c1', name: 'Обновлённое имя' });
      repository.update.mockReturnValue(of(updated));
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.submit();

      expect(repository.update).toHaveBeenCalledWith('c1', expect.any(Object));
      expect(navigateSpy).toHaveBeenCalledWith(['/cocktails', 'c1']);
    });
  });

  describe('управление шагами', () => {
    it('addStep() добавляет новый пустой шаг в конец', () => {
      const { component } = setup(null);

      component.addStep();

      expect(component.stepsArray.length).toBe(2);
      expect(component.stepsArray.at(1).value.text).toBe('');
    });

    it('removeStep(index) удаляет шаг по индексу', () => {
      const { component } = setup(null);
      component.addStep();
      component.stepsArray.at(0).patchValue({ text: 'Первый' });
      component.stepsArray.at(1).patchValue({ text: 'Второй' });

      component.removeStep(0);

      expect(component.stepsArray.length).toBe(1);
      expect(component.stepsArray.at(0).value.text).toBe('Второй');
    });

    it('removeStep() не даёт удалить единственный шаг в списке', () => {
      const { component } = setup(null);

      component.removeStep(0);

      expect(component.stepsArray.length).toBe(1);
    });

    it('reorderSteps() меняет порядок шагов через moveItemInArray', () => {
      const { component } = setup(null);
      component.addStep();
      component.addStep();
      component.stepsArray.at(0).patchValue({ text: 'A' });
      component.stepsArray.at(1).patchValue({ text: 'B' });
      component.stepsArray.at(2).patchValue({ text: 'C' });

      component.reorderSteps({ previousIndex: 0, currentIndex: 2 });

      expect(component.stepsArray.controls.map((c) => c.value.text)).toEqual(['B', 'C', 'A']);
    });
  });
});
