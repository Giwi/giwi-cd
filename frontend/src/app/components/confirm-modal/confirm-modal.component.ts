import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.isOpen()) {
      <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ confirmService.title() }}</h5>
              <button type="button" class="btn-close" (click)="confirmService.resolve(false)"></button>
            </div>
            <div class="modal-body">
              <p>{{ confirmService.message() }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="confirmService.resolve(false)">
                Cancel
              </button>
              <button type="button" class="btn btn-danger" (click)="confirmService.resolve(true)">
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmModalComponent {
  confirmService = inject(ConfirmService);
}
