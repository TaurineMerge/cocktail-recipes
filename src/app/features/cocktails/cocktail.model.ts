export interface CocktailRecipeStep {
  readonly id: string;
  readonly text: string;
  readonly imagesBase64?: readonly string[];
}

export interface Cocktail {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageBase64?: string;
  readonly steps: readonly CocktailRecipeStep[];
  readonly createdAt: string; // ISO-формат
  readonly ownerId: string;
}

export interface CocktailForm {
  name: string;
  description: string;
  imageBase64?: string;
  steps: CocktailRecipeStep[];
}
