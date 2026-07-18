import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CocktailsListService } from './cocktails-list.service';
import { MatDialog } from '@angular/material/dialog';
import { Cocktail } from '../cocktail.model';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Sort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
const SORT_OPTIONS = ['date-desc', 'date-asc', 'name-asc', 'name-desc'] as const;

const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': 'Сначала новые',
  'date-asc': 'Сначала старые',
  'name-asc': 'По названию (А–Я)',
  'name-desc': 'По названию (Я–А)',
};

@Component({
  selector: 'app-cocktails-list',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  templateUrl: './cocktails-list.component.html',
  styleUrl: './cocktails-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CocktailsListComponent implements OnInit {
  protected readonly cocktailsListService = inject(CocktailsListService);
  readonly #dialog = inject(MatDialog);

  protected readonly displayedColumns = ['image', 'name', 'createdAt', 'actions'];

  protected readonly sortLabels = SORT_LABELS;
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly sortOption = signal<SortOption>('date-desc');
  protected readonly sortLabel = computed(() => SORT_LABELS[this.sortOption()]);

  protected readonly sortState = signal<Pick<Sort, 'active' | 'direction'>>({
    active: 'createdAt',
    direction: 'desc',
  });

  protected readonly sortedCocktails = computed(() =>
    this.#sortCocktails(this.cocktailsListService.cocktails(), this.sortOption()),
  );

  setSort(option: SortOption): void {
    this.sortOption.set(option);
  }

  ngOnInit(): void {
    this.cocktailsListService.loadAll();
  }

  remove(cocktail: Cocktail): void {
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Удалить рецепт?',
        message: `«${cocktail.name}» будет удалён без возможности восстановления.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.cocktailsListService.remove(cocktail.id);
      }
    });
  }

  #sortCocktails(cocktails: readonly Cocktail[], option: SortOption): Cocktail[] {
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
}
