import { inject, Injectable } from '@angular/core';
import { CocktailRepository } from './cocktail.repository';
import { Observable } from 'rxjs';
import { CocktailForm, Cocktail } from './cocktail.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable()
export class CocktailApiService extends CocktailRepository {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = `${environment.apiBaseUrl}/cocktails`;

  override create(cocktail: CocktailForm): Observable<Cocktail> {
    const url = this.#buildUrl();
    return this.#http.post<Cocktail>(url, cocktail);
  }

  override update(
    cocktailId: string,
    updatedCocktail: Partial<CocktailForm>,
  ): Observable<Cocktail> {
    const url = this.#buildUrl(cocktailId);
    return this.#http.patch<Cocktail>(url, updatedCocktail);
  }

  override delete(cocktailId: string): Observable<void> {
    const url = this.#buildUrl(cocktailId);
    return this.#http.delete<void>(url);
  }

  override getAll(): Observable<readonly Cocktail[]> {
    const url = this.#buildUrl();
    return this.#http.get<Cocktail[]>(url);
  }

  override getById(cocktailId: string): Observable<Cocktail> {
    const url = this.#buildUrl(cocktailId);
    return this.#http.get<Cocktail>(url);
  }

  #buildUrl(id?: string): string {
    return id ? `${this.#baseUrl}/${id}` : this.#baseUrl;
  }
}
