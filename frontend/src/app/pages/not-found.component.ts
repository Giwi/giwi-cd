import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div class="text-center">
        <div class="display-1 fw-bold text-muted mb-3">404</div>
        <h2 class="mb-3">Page Not Found</h2>
        <p class="text-muted mb-4">The page you're looking for doesn't exist or has been moved.</p>
        <a routerLink="/dashboard" class="btn btn-primary">
          <i class="bi bi-house me-1"></i> Go to Dashboard
        </a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
