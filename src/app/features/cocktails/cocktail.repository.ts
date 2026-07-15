import { Observable } from 'rxjs';
import { Cocktail, CocktailForm } from './cocktail.model';

export abstract class CocktailRepository {
  abstract getAll(): Observable<readonly Cocktail[]>;
  abstract getById(id: string): Observable<Cocktail>;
  abstract create(recipe: CocktailForm): Observable<Cocktail>;
  abstract update(id: string, newRecipe: Partial<CocktailForm>): Observable<Cocktail>;
  abstract delete(id: string): Observable<void>;
}
