import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (isLoading) {
      <mat-progress-spinner [diameter]="size * 40" mode="indeterminate" />
    }
  `,
})
export class LoaderComponent {
  @Input() isLoading = false;
  @Input() size = 1;
}
