import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { compressAndEncodeImageToBase64 } from '../image-compression';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploadComponent {
  readonly control = input.required<FormControl<string | null | undefined>>();
  readonly label = input('Добавить фото');

  protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isCompressing = signal(false);
  protected readonly isDraggingOver = signal(false);

  openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // чтобы повторный выбор того же файла тоже сработал
    if (file) {
      await this.#handleFile(file);
    }
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await this.#handleFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  remove(): void {
    this.control().setValue(undefined);
    this.control().markAsDirty();
  }

  async #handleFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      return;
    }
    this.isCompressing.set(true);
    try {
      const imgBase64 = await compressAndEncodeImageToBase64(file);
      this.control().setValue(imgBase64);
      this.control().markAsDirty();
    } finally {
      this.isCompressing.set(false);
    }
  }
}
