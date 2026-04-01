import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Credential, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-credential-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div class="d-flex align-items-center gap-3">
        <a routerLink="/settings/credentials" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left"></i>
        </a>
        <div>
          <h1 class="page-title mb-0">{{ isEdit() ? 'Edit Credential' : 'Add Credential' }}</h1>
          <p class="page-subtitle mb-0">{{ isEdit() ? credential()?.name : 'Configure access' }}</p>
        </div>
      </div>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="form-section">
            <div class="form-section-title">
              <i class="bi bi-info-circle"></i> Basic Information
            </div>
            <div class="mb-3">
              <label class="form-label">Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="GitHub Production"
                     [class.is-invalid]="form.get('name')?.invalid && (form.get('name')?.touched || formSubmitted())"
                     [class.is-valid]="form.get('name')?.valid && form.get('name')?.touched">
              @if (form.get('name')?.invalid && (form.get('name')?.touched || formSubmitted())) {
                <div class="invalid-feedback d-block">Name is required</div>
              }
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea class="form-control" formControlName="description" rows="2" placeholder="Production GitHub credentials"></textarea>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">
              <i class="bi bi-shield-lock"></i> Type
            </div>
            <div class="mb-3">
              <label class="form-label">Type *</label>
              <select class="form-select" formControlName="type" (change)="onTypeChange()">
                <optgroup label="Git Access">
                  <option value="username-password">Username / Password</option>
                  <option value="token">Access Token</option>
                  <option value="ssh-key">SSH Key</option>
                </optgroup>
              </select>
            </div>

            @if (form.get('type')?.value === 'username-password') {
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Username *</label>
                  <input type="text" class="form-control" formControlName="username" placeholder="your-username"
                         [class.is-invalid]="form.get('username')?.invalid && (form.get('username')?.touched || formSubmitted())"
                         [class.is-valid]="form.get('username')?.valid && form.get('username')?.touched">
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Password *</label>
                  <div class="input-group">
                    <input [type]="showPassword() ? 'text' : 'password'" class="form-control" formControlName="password" placeholder="••••••••"
                           [class.is-invalid]="form.get('password')?.invalid && (form.get('password')?.touched || formSubmitted())"
                           [class.is-valid]="form.get('password')?.valid && form.get('password')?.touched">
                    <button class="btn btn-outline-secondary" type="button" (click)="showPassword.set(!showPassword())">
                      <i class="bi bi-{{ showPassword() ? 'eye-slash' : 'eye' }}"></i>
                    </button>
                  </div>
                </div>
              </div>
            }

            @if (form.get('type')?.value === 'token') {
              <div class="mb-3">
                <label class="form-label">Access Token *</label>
                <div class="input-group">
                  <input [type]="showPassword() ? 'text' : 'password'" class="form-control" formControlName="token" placeholder="ghp_xxxxxxxxxxxx"
                         [class.is-invalid]="form.get('token')?.invalid && (form.get('token')?.touched || formSubmitted())"
                         [class.is-valid]="form.get('token')?.valid && form.get('token')?.touched">
                  <button class="btn btn-outline-secondary" type="button" (click)="showPassword.set(!showPassword())">
                    <i class="bi bi-{{ showPassword() ? 'eye-slash' : 'eye' }}"></i>
                  </button>
                </div>
                <div class="form-text">GitHub Personal Access Token, GitLab Personal Access Token, etc.</div>
              </div>
            }

            @if (form.get('type')?.value === 'ssh-key') {
              <div class="mb-3">
                <label class="form-label">SSH Private Key *</label>
                <textarea class="form-control" formControlName="privateKey" rows="8" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                       [class.is-invalid]="form.get('privateKey')?.invalid && (form.get('privateKey')?.touched || formSubmitted())"
                       [class.is-valid]="form.get('privateKey')?.valid && form.get('privateKey')?.touched"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Passphrase</label>
                <div class="input-group">
                  <input [type]="showPassword() ? 'text' : 'password'" class="form-control" formControlName="passphrase" placeholder="••••••••">
                  <button class="btn btn-outline-secondary" type="button" (click)="showPassword.set(!showPassword())">
                    <i class="bi bi-{{ showPassword() ? 'eye-slash' : 'eye' }}"></i>
                  </button>
                </div>
                <div class="form-text">Leave empty if your key has no passphrase.</div>
              </div>
            }
          </div>
        </div>

        <div class="col-lg-4">
          <div class="form-section sticky-top" style="top: 80px;">
            <div class="form-section-title">
              <i class="bi bi-lightbulb"></i> Help
            </div>
            @if (form.get('type')?.value === 'username-password') {
              <p class="small text-muted">Use this type for basic HTTP authentication with your Git server.</p>
            }
            @if (form.get('type')?.value === 'token') {
              <p class="small text-muted">Personal access tokens are recommended for GitHub, GitLab, etc.</p>
            }
            @if (form.get('type')?.value === 'ssh-key') {
              <p class="small text-muted">Generate a key: <code>ssh-keygen -t ed25519 -C "giwicd"</code></p>
            }

            <hr class="my-4">

            <div class="d-grid gap-2">
              <div class="alert alert-{{ form.valid ? 'success' : 'warning' }} py-2 small mb-3">
                <i class="bi bi-{{ form.valid ? 'check-circle' : 'exclamation-triangle' }} me-1"></i>
                {{ form.valid ? 'Form is valid' : 'Please fill in required fields' }}
              </div>
              <button type="submit" class="btn btn-{{ form.valid ? 'primary' : 'secondary' }}" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                {{ isEdit() ? 'Update Credential' : 'Save Credential' }}
              </button>
              <a routerLink="/settings/credentials" class="btn btn-outline-secondary">Cancel</a>
            </div>
          </div>
        </div>
      </div>
    </form>
  `
})
export class CredentialFormComponent implements OnInit {
  form!: FormGroup;
  credential = signal<Credential | null>(null);
  submitting = signal(false);
  formSubmitted = signal(false);
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCredential(id);
    }
  }

  isEdit(): boolean {
    return !!this.route.snapshot.paramMap.get('id');
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['username-password', Validators.required],
      username: [''],
      password: [''],
      token: [''],
      privateKey: [''],
      passphrase: ['']
    });
    this.onTypeChange();
  }

  onTypeChange(): void {
    const type = this.form.get('type')?.value;
    this.form.get('username')?.clearValidators();
    this.form.get('password')?.clearValidators();
    this.form.get('token')?.clearValidators();
    this.form.get('privateKey')?.clearValidators();

    if (type === 'username-password') {
      this.form.get('username')?.setValidators(Validators.required);
      this.form.get('password')?.setValidators(Validators.required);
    } else if (type === 'token') {
      this.form.get('token')?.setValidators(Validators.required);
    } else if (type === 'ssh-key') {
      this.form.get('privateKey')?.setValidators(Validators.required);
    }

    this.form.get('username')?.updateValueAndValidity();
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('token')?.updateValueAndValidity();
    this.form.get('privateKey')?.updateValueAndValidity();
  }

  loadCredential(id: string): void {
    this.api.get<ApiResponse<Credential>>(`/credentials/${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.credential.set(res.data);
          this.patchForm(res.data);
        }
      }
    });
  }

  patchForm(cred: Credential): void {
    this.form.patchValue({
      name: cred.name,
      description: cred.description,
      type: cred.type,
      username: cred.username || '',
      password: '',
      token: '',
      privateKey: '',
      passphrase: ''
    });
    this.onTypeChange();
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    if (this.form.invalid) return;

    this.submitting.set(true);
    const value = this.form.value;
    const id = this.route.snapshot.paramMap.get('id');

    const data: any = {
      name: value.name,
      type: value.type,
      description: value.description || ''
    };

    if (value.type === 'username-password') {
      data.username = value.username;
      if (value.password) data.password = value.password;
    } else if (value.type === 'token') {
      if (value.token) data.token = value.token;
    } else if (value.type === 'ssh-key') {
      if (value.privateKey) data.privateKey = value.privateKey;
      if (value.passphrase) data.passphrase = value.passphrase;
    }

    const request = id
      ? this.api.put<ApiResponse<Credential>>(`/credentials/${id}`, data)
      : this.api.post<ApiResponse<Credential>>('/credentials', data);

    request.subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.router.navigate(['/settings/credentials']);
        }
      },
      error: () => this.submitting.set(false)
    });
  }
}
