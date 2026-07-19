export function compressAndEncodeImageToBase64(
  file: File,
  maxDimension = 900,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'));

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Некорректный результат чтения файла'));
        return;
      }

      const img = new Image();

      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));

      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas недоступен в этом браузере'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
