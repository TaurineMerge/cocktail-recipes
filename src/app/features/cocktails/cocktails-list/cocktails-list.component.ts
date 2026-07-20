import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CocktailsListService } from './services/cocktails-list.service';
import { MatDialog } from '@angular/material/dialog';
import { Cocktail } from '../cocktail.model';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SORT_LABELS, SORT_OPTIONS, sortCocktails, SortOption } from './utils/cocktails-list-sort';

const MOBILE_BREAKPOINT = '(max-width: 599px)';

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
  readonly #breakpointObserver = inject(BreakpointObserver);
  readonly #router = inject(Router);

  protected readonly displayedColumns = ['image', 'name', 'createdAt', 'actions'];

  protected readonly sortLabels = SORT_LABELS;
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly sortOption = signal<SortOption>('date-desc');
  protected readonly sortLabel = computed(() => SORT_LABELS[this.sortOption()]);

  protected readonly isMobile = toSignal(
    this.#breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map((state) => state.matches)),
    { initialValue: this.#breakpointObserver.isMatched(MOBILE_BREAKPOINT) },
  );

  protected readonly sortedCocktails = computed(() =>
    sortCocktails(this.cocktailsListService.cocktails(), this.sortOption()),
  );

  setSort(option: SortOption): void {
    this.sortOption.set(option);
  }

  ngOnInit(): void {
    this.cocktailsListService.loadAll();
  }

  openDetail(cocktail: Cocktail): void {
    this.#router.navigate(['/cocktails', cocktail.id]);
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
}
