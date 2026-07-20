// src/app/shared/images/image-compression.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { compressAndEncodeImageToBase64 } from './image-compression';

const MOCKED_DATA_URL = 'data:image/jpeg;base64,mocked-compressed-output';

function makeImageFile(content = 'fake-bytes', type = 'image/png'): File {
  return new File([content], 'photo.png', { type });
}

/**
 * Подменяет глобальный Image так, чтобы при установке src асинхронно
 * (queueMicrotask) сработал onload с заданными width/height, либо onerror при shouldFail.
 */
function installFakeImage(opts: { width: number; height: number; shouldFail?: boolean }) {
  class FakeImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    #src = '';

    set src(value: string) {
      this.#src = value;
      queueMicrotask(() => {
        if (opts.shouldFail) {
          this.onerror?.();
          return;
        }
        this.width = opts.width;
        this.height = opts.height;
        this.onload?.();
      });
    }

    get src() {
      return this.#src;
    }
  }

  vi.stubGlobal('Image', FakeImage);
}

function installCanvasMocks(opts: { ctxAvailable?: boolean } = {}) {
  const drawImageMock = vi.fn();
  const toDataURLMock = vi.fn().mockReturnValue(MOCKED_DATA_URL);

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((): unknown => {
    if (opts.ctxAvailable === false) {
      return null;
    }
    return { drawImage: drawImageMock };
  }) as typeof HTMLCanvasElement.prototype.getContext);

  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
    toDataURLMock as unknown as typeof HTMLCanvasElement.prototype.toDataURL,
  );

  return { drawImageMock, toDataURLMock };
}

describe('compressAndEncodeImageToBase64', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('уменьшает landscape-изображение до maxDimension по длинной стороне, сохраняя пропорции', async () => {
    installFakeImage({ width: 1200, height: 800 });
    const { drawImageMock, toDataURLMock } = installCanvasMocks();

    const result = await compressAndEncodeImageToBase64(makeImageFile());

    // scale = min(1, 900 / max(1200, 800)) = 900 / 1200 = 0.75
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 900, 600);
    expect(toDataURLMock).toHaveBeenCalledWith('image/jpeg', 0.82);
    expect(result).toBe(MOCKED_DATA_URL);
  });

  it('уменьшает portrait-изображение по высоте, а не по ширине', async () => {
    installFakeImage({ width: 800, height: 1200 });
    const { drawImageMock } = installCanvasMocks();

    await compressAndEncodeImageToBase64(makeImageFile());

    // Тот же scale 0.75, но теперь ограничивающая сторона - высота:
    // width = round(800 * 0.75) = 600, height = round(1200 * 0.75) = 900.
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 600, 900);
  });

  it('не увеличивает изображение, если оно уже меньше maxDimension (scale не может быть больше 1)', async () => {
    installFakeImage({ width: 400, height: 300 });
    const { drawImageMock } = installCanvasMocks();

    await compressAndEncodeImageToBase64(makeImageFile());

    // min(1, 900/400) = min(1, 2.25) = 1
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 300);
  });

  it('округляет дробные размеры через Math.round, а не обрезает/не оставляет float', async () => {
    installFakeImage({ width: 1000, height: 333 });
    const { drawImageMock } = installCanvasMocks();

    await compressAndEncodeImageToBase64(makeImageFile());

    // scale = 900/1000 = 0.9; height = 333 * 0.9 = 299.7 -> round -> 300.
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 900, 300);
  });

  it('пробрасывает кастомные maxDimension и quality в расчёт и в toDataURL', async () => {
    installFakeImage({ width: 2000, height: 2000 });
    const { drawImageMock, toDataURLMock } = installCanvasMocks();

    await compressAndEncodeImageToBase64(makeImageFile(), 400, 0.5);

    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 400);
    expect(toDataURLMock).toHaveBeenCalledWith('image/jpeg', 0.5);
  });

  it('отклоняет промис, если canvas 2d-контекст недоступен', async () => {
    installFakeImage({ width: 800, height: 600 });
    installCanvasMocks({ ctxAvailable: false });

    await expect(compressAndEncodeImageToBase64(makeImageFile())).rejects.toThrow(
      'Canvas недоступен в этом браузере',
    );
  });

  it('отклоняет промис, если изображение не загрузилось (повреждённый файл)', async () => {
    installFakeImage({ width: 0, height: 0, shouldFail: true });
    installCanvasMocks();

    await expect(compressAndEncodeImageToBase64(makeImageFile())).rejects.toThrow(
      'Не удалось загрузить изображение',
    );
  });

  it('отклоняет промис с сообщением по умолчанию, если FileReader падает без reader.error', async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => {
        (this.onerror as (() => void) | null)?.();
      });
    });

    await expect(compressAndEncodeImageToBase64(makeImageFile())).rejects.toThrow(
      'Не удалось прочитать файл',
    );
  });

  it('отклоняет промис, если результат чтения — не строка (например, ArrayBuffer)', async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => {
        Object.defineProperty(this, 'result', { value: new ArrayBuffer(0), configurable: true });
        (this.onload as (() => void) | null)?.();
      });
    });

    await expect(compressAndEncodeImageToBase64(makeImageFile())).rejects.toThrow(
      'Некорректный результат чтения файла',
    );
  });
});
