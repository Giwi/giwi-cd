import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.isOpen()) {
      <div class="modal-backdrop show"></div>
      <div class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title">{{ confirmService.title() }}</h5>
              <button type="button" class="btn-close" (click)="confirmService.resolve(false)"></button>
            </div>
            <div class="modal-body pt-0">
              <p class="text-muted mb-4">{{ confirmService.message() }}</p>
            </div>
            <div class="modal-footer border-top-0 pt-3">
              <button type="button" class="btn btn-outline-secondary flex-fill me-2" (click)="confirmService.resolve(false)">
                Cancel
              </button>
              <button type="button" class="btn btn-danger flex-fill" (click)="confirmService.resolve(true)">
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
