import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CocktailRepository } from '../cocktail.repository';
import { Cocktail } from '../cocktail.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cocktail-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './cocktail-detail.component.html',
  styleUrl: './cocktail-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CocktailDetailComponent {
  readonly #repository = inject(CocktailRepository);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);

  readonly #id = this.#route.snapshot.paramMap.get('id')!;

  protected readonly cocktail = signal<Cocktail | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.#repository.getById(this.#id).subscribe({
      next: (cocktail) => this.cocktail.set(cocktail),
      error: () => this.error.set('Не удалось загрузить рецепт'),
      complete: () => this.isLoading.set(false),
    });
  }

  remove(): void {
    const cocktail = this.cocktail();
    if (!cocktail) {
      return;
    }

    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Удалить рецепт?',
        message: `«${cocktail.name}» будет удалён без возможности восстановить.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.#repository.delete(cocktail.id).subscribe(() => this.#router.navigate(['/cocktails']));
      }
    });
  }
}
