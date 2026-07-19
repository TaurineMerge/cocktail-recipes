import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CocktailRepository } from '../cocktail.repository';
import { Cocktail, CocktailForm, CocktailRecipeStep } from '../cocktail.model';
import { ImageUploadComponent } from '../../../shared/images/image-upload/image-upload.component';
import { ImageCollectionUploadComponent } from '../../../shared/images/image-collection-upload/image-collection-upload.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

type StepFormGroup = FormGroup<{
  id: FormControl<string>;
  text: FormControl<string>;
  imagesBase64: FormControl<string[]>;
}>;

const STEPPER_VERTICAL_BREAKPOINT = '(max-width: 719px)';

@Component({
  selector: 'app-cocktail-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DragDropModule,
    ImageUploadComponent,
    ImageCollectionUploadComponent,
  ],
  templateUrl: './cocktail-form.component.html',
  styleUrl: './cocktail-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CocktailFormComponent {
  readonly #fb = inject(FormBuilder);
  readonly #repository = inject(CocktailRepository);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #breakpointObserver = inject(BreakpointObserver);

  readonly #cocktailId = this.#route.snapshot.paramMap.get('id');
  protected readonly isEditMode = this.#cocktailId !== null;

  protected readonly isLoading = signal(this.isEditMode);
  protected readonly isSubmitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected readonly stepperOrientation = toSignal(
    this.#breakpointObserver
      .observe(STEPPER_VERTICAL_BREAKPOINT)
      .pipe(map((state) => (state.matches ? 'vertical' : 'horizontal'))),
    {
      initialValue: this.#breakpointObserver.isMatched(STEPPER_VERTICAL_BREAKPOINT)
        ? 'vertical'
        : 'horizontal',
    },
  );

  protected readonly form = this.#fb.nonNullable.group({
    basicInfo: this.#fb.nonNullable.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      imageBase64: this.#fb.control<string | undefined>(undefined),
    }),
    steps: this.#fb.array<StepFormGroup>([], Validators.minLength(1)),
  });

  constructor() {
    if (this.#cocktailId) {
      this.#repository.getById(this.#cocktailId).subscribe({
        next: (cocktail) => this.#patchForm(cocktail),
        error: () => this.loadError.set('Не удалось загрузить рецепт'),
        complete: () => this.isLoading.set(false),
      });
    } else {
      this.addStep();
    }
  }

  protected get stepsArray(): FormArray<StepFormGroup> {
    return this.form.controls.steps;
  }

  addStep(): void {
    this.stepsArray.push(this.#createStepGroup());
  }

  removeStep(index: number): void {
    this.stepsArray.removeAt(index);
  }

  reorderSteps(event: CdkDragDrop<unknown>): void {
    moveItemInArray(this.stepsArray.controls, event.previousIndex, event.currentIndex);
    this.stepsArray.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const payload: CocktailForm = {
      name: raw.basicInfo.name,
      description: raw.basicInfo.description,
      imageBase64: raw.basicInfo.imageBase64 ?? undefined,
      steps: raw.steps as CocktailRecipeStep[],
    };

    const request$ = this.isEditMode
      ? this.#repository.update(this.#cocktailId!, payload)
      : this.#repository.create(payload);

    request$.subscribe({
      next: (cocktail) => this.#router.navigate(['/cocktails', cocktail.id]),
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('Не удалось сохранить рецепт. Попробуйте ещё раз');
      },
    });
  }

  #patchForm(cocktail: Cocktail): void {
    this.form.controls.basicInfo.patchValue({
      name: cocktail.name,
      description: cocktail.description,
      imageBase64: cocktail.imageBase64,
    });

    this.stepsArray.clear();
    for (const step of cocktail.steps) {
      this.stepsArray.push(this.#createStepGroup(step));
    }
  }

  #createStepGroup(step?: CocktailRecipeStep): StepFormGroup {
    return this.#fb.nonNullable.group({
      id: this.#fb.nonNullable.control(step?.id ?? crypto.randomUUID()),
      text: this.#fb.nonNullable.control(step?.text ?? '', [
        Validators.required,
        Validators.maxLength(300),
      ]),
      imagesBase64: this.#fb.nonNullable.control<string[]>([...(step?.imagesBase64 ?? [])]),
    });
  }
}
