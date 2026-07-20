import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CocktailApiService } from './cocktail-api.service';
import { environment } from '../../../environments/environment';
import { CocktailForm } from './cocktail.model';
import { createCocktail } from './_test-utils';

const BASE_URL = `${environment.apiBaseUrl}/cocktails`;

describe('CocktailApiService', () => {
  let service: CocktailApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CocktailApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CocktailApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() делает GET на /cocktails без тела', () => {
    const cocktails = [createCocktail()];

    service.getAll().subscribe((result) => {
      expect(result).toEqual(cocktails);
    });

    const req = httpMock.expectOne(BASE_URL);

    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();

    req.flush(cocktails);
  });

  it('getById(id) делает GET на /cocktails/:id', () => {
    const cocktail = createCocktail({ id: 'c42' });

    service.getById('c42').subscribe((result) => {
      expect(result).toEqual(cocktail);
    });

    const req = httpMock.expectOne(`${BASE_URL}/c42`);

    expect(req.request.method).toBe('GET');

    req.flush(cocktail);
  });

  it('create(form) делает POST на /cocktails с телом формы как есть', () => {
    const form: CocktailForm = {
      name: 'Негрони',
      description: 'Горький классический коктейль',
      steps: [{ id: 's1', text: 'Смешать в стакане со льдом' }],
    };
    const created = createCocktail({ id: 'new-id', ...form });

    service.create(form).subscribe((result) => {
      expect(result).toEqual(created);
    });

    const req = httpMock.expectOne(BASE_URL);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);

    req.flush(created);
  });

  it('update(id, patch) делает PATCH на /cocktails/:id с частичным телом', () => {
    const patch: Partial<CocktailForm> = { name: 'Новое название' };
    const updated = createCocktail({ id: 'c1', name: 'Новое название' });

    service.update('c1', patch).subscribe((result) => {
      expect(result).toEqual(updated);
    });

    const req = httpMock.expectOne(`${BASE_URL}/c1`);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);

    req.flush(updated);
  });

  it('delete(id) делает DELETE на /cocktails/:id', () => {
    let completed = false;

    service.delete('c1').subscribe({
      complete: () => (completed = true),
    });

    const req = httpMock.expectOne(`${BASE_URL}/c1`);

    expect(req.request.method).toBe('DELETE');

    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('пробрасывает HTTP-ошибку', () => {
    let receivedStatus: number | undefined;

    service.getById('missing').subscribe({
      error: (err) => (receivedStatus = err.status),
    });

    const req = httpMock.expectOne(`${BASE_URL}/missing`);
    req.flush({ message: 'Рецепт не найден' }, { status: 404, statusText: 'Not Found' });

    expect(receivedStatus).toBe(404);
  });
});
