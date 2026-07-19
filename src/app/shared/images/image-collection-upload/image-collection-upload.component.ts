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
  selector: 'app-images-upload',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './image-collection-upload.component.html',
  styleUrl: './image-collection-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCollectionUploadComponent {
  readonly control = input.required<FormControl<string[]>>();

  protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isCompressing = signal(false);

  openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) {
      return;
    }

    this.isCompressing.set(true);
    try {
      const compressed = await Promise.all(
        files
          .filter((f) => f.type.startsWith('image/'))
          .map((f) => compressAndEncodeImageToBase64(f)),
      );
      this.control().setValue([...this.control().value, ...compressed]);
      this.control().markAsDirty();
    } finally {
      this.isCompressing.set(false);
    }
  }

  removeAt(index: number): void {
    const next = this.control().value.filter((_, i) => i !== index);
    this.control().setValue(next);
    this.control().markAsDirty();
  }
}
