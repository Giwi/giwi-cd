import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Pipeline, Stage, Step, Credential, ApiResponse } from '../../models/types';

interface NotificationStep {
  type: 'notification';
  name: string;
  provider: 'telegram' | 'slack' | 'teams' | 'mail';
  credentialId?: string;
  channel?: string;
  webhookUrl?: string;
  message?: string;
  continueOnError?: boolean;
}

@Component({
  selector: 'app-pipeline-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TitleCasePipe],
  template: `
    <div class="page-header">
      <div class="d-flex align-items-center gap-3">
        <a routerLink="/pipelines" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left"></i>
        </a>
        <div>
          <h1 class="page-title mb-0">{{ isEdit() ? 'Edit Pipeline' : 'New Pipeline' }}</h1>
          <p class="page-subtitle mb-0">{{ isEdit() ? pipeline()?.name : 'Create a new CI/CD pipeline' }}</p>
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
              <label class="form-label">Pipeline Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="my-awesome-pipeline"
                     [class.is-invalid]="form.get('name')?.invalid && (form.get('name')?.touched || formSubmitted())"
                     [class.is-valid]="form.get('name')?.valid && form.get('name')?.touched">
              @if (form.get('name')?.invalid && (form.get('name')?.touched || formSubmitted())) {
                <div class="invalid-feedback d-block">Pipeline name is required</div>
              }
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea class="form-control" formControlName="description" rows="2" placeholder="What does this pipeline do?"></textarea>
            </div>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Repository URL</label>
                <input type="text" class="form-control" formControlName="repositoryUrl" placeholder="https://github.com/user/repo">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Branch</label>
                <input type="text" class="form-control" formControlName="branch" placeholder="main"
                       [class.is-invalid]="form.get('branch')?.invalid && (form.get('branch')?.touched || formSubmitted())"
                       [class.is-valid]="form.get('branch')?.valid && form.get('branch')?.touched">
              </div>
            </div>
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="form-label mb-0">Credential</label>
                @if (credentials().length === 0) {
                  <a routerLink="/settings/credentials/new" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-plus me-1"></i> Create Credential
                  </a>
                }
              </div>
              <select class="form-select" formControlName="credentialId">
                <option [ngValue]="null">No credential (public repo)</option>
                @for (cred of credentials(); track cred.id) {
                  <option [ngValue]="cred.id">{{ cred.name }} ({{ getTypeLabel(cred.type) }})</option>
                }
              </select>
              <div class="form-text">Select credentials for private repositories</div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title d-flex justify-content-between align-items-center">
              <span><i class="bi bi-list-task"></i> Stages</span>
              <button type="button" class="btn btn-sm btn-outline-primary" (click)="addStage()">
                <i class="bi bi-plus"></i> Add Stage
              </button>
            </div>
            
            <ng-container formArrayName="stages">
              @for (stage of stages.controls; track $index; let i = $index) {
                <ng-container [formGroupName]="i">
                  <div class="card mb-3">
                    <div class="card-header card-header-theme py-2 d-flex justify-content-between align-items-center">
                      <span class="fw-semibold">
                        <i class="bi bi-chevron-right me-1"></i> Stage {{ i + 1 }}: {{ stage.get('name')?.value || 'Untitled' }}
                      </span>
                      <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-secondary" (click)="moveStage(i, -1)" [disabled]="i === 0">
                          <i class="bi bi-arrow-up"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary" (click)="moveStage(i, 1)" [disabled]="i === stages.length - 1">
                          <i class="bi bi-arrow-down"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" (click)="removeStage(i)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-8 mb-3">
                          <label class="form-label">Stage Name</label>
                          <input type="text" class="form-control" formControlName="name" placeholder="Build"
                                 [class.is-invalid]="stage.get('name')?.invalid && (stage.get('name')?.touched || formSubmitted())"
                                 [class.is-valid]="stage.get('name')?.valid && stage.get('name')?.touched">
                          @if (stage.get('name')?.invalid && (stage.get('name')?.touched || formSubmitted())) {
                            <div class="invalid-feedback d-block">Stage name is required</div>
                          }
                        </div>
                        <div class="col-md-4 mb-3 d-flex align-items-end">
                          <div class="form-check">
                            <input type="checkbox" class="form-check-input" formControlName="continueOnError" id="continue{{i}}">
                            <label class="form-check-label" for="continue{{i}}">Continue on error</label>
                          </div>
                        </div>
                      </div>
                      
                      <ng-container [formArrayName]="'steps'">
                        <label class="form-label">Steps</label>
                        @for (step of getStepsControls(i); track $index; let j = $index) {
                          @if (isNotificationStep(i, j)) {
                            <div class="card mb-2 border-0" [class]="getProviderCardClass(i, j)">
                              <div class="card-body py-2">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                  <span class="badge" [class]="getProviderBadgeClass(i, j)">
                                    <i class="bi {{ getProviderIcon(i, j) }} me-1"></i> {{ getStepProvider(i, j) | titlecase }}
                                  </span>
                                  <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeStep(i, j)">
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </div>
                                <div class="row g-2">
                                  <div class="col-md-4">
                                    <select class="form-select form-select-sm" [formControlName]="j" (change)="onProviderChange(i, j)">
                                      <option value="command">Command</option>
                                      <option value="notification-telegram">Telegram</option>
                                      <option value="notification-slack">Slack</option>
                                      <option value="notification-teams">Teams</option>
                                      <option value="notification-mail">Mail</option>
                                    </select>
                                  </div>
                                  <div class="col-md-4">
                                    <select class="form-select form-select-sm" [formControlName]="getNotificationCredentialControl(i, j)">
                                      <option value="">Select credential</option>
                                      @for (cred of getNotificationCredentials(); track cred.id) {
                                        <option [value]="cred.id">{{ cred.name }}</option>
                                      }
                                    </select>
                                  </div>
                                  <div class="col-md-4">
                                    <input type="text" class="form-control form-control-sm" [placeholder]="getChannelPlaceholder(i, j)"
                                           [formControlName]="getNotificationChannelControl(i, j)">
                                  </div>
                                </div>
                                <div class="row g-2 mt-2">
                                  <div class="col-12">
                                    <textarea class="form-control form-control-sm" rows="2" [placeholder]="getMessagePlaceholder()"
                                              [formControlName]="getNotificationMessageControl(i, j)"></textarea>
                                    <div class="form-text small">Variables: {{ '{{PIPELINE_NAME}}' }}, {{ '{{BRANCH}}' }}, {{ '{{STATUS}}' }}, {{ '{{BUILD_NUMBER}}' }}, {{ '{{COMMIT}}' }}, {{ '{{DURATION}}' }}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          } @else {
                            <div class="input-group mb-2" [class.has-validation]="getStepControl(i, j)?.invalid">
                              <span class="input-group-text bg-muted">$</span>
                              <input type="text" class="form-control" [formControlName]="j" placeholder="npm install"
                                     [class.is-invalid]="getStepControl(i, j)?.invalid && (getStepControl(i, j)?.touched || formSubmitted())"
                                     [class.is-valid]="getStepControl(i, j)?.valid && getStepControl(i, j)?.touched">
                              <button type="button" class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" (click)="$event.stopPropagation()">
                                <span class="visually-hidden">Toggle step type</span>
                              </button>
                              <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" (click)="convertToNotification(i, j, 'telegram')"><i class="bi bi-telegram me-2"></i>Telegram</a></li>
                                <li><a class="dropdown-item" (click)="convertToNotification(i, j, 'slack')"><i class="bi bi-chat-dots me-2"></i>Slack</a></li>
                                <li><a class="dropdown-item" (click)="convertToNotification(i, j, 'teams')"><i class="bi bi-people me-2"></i>Teams</a></li>
                                <li><a class="dropdown-item" (click)="convertToNotification(i, j, 'mail')"><i class="bi bi-envelope me-2"></i>Mail</a></li>
                              </ul>
                              <button type="button" class="btn btn-outline-danger" (click)="removeStep(i, j)">
                                <i class="bi bi-x"></i>
                              </button>
                              @if (getStepControl(i, j)?.invalid && (getStepControl(i, j)?.touched || formSubmitted())) {
                                <div class="invalid-feedback">Command is required</div>
                              }
                            </div>
                          }
                        }
                        <div class="btn-group btn-group-sm">
                          <button type="button" class="btn btn-link text-decoration-none p-0 me-3" (click)="addStep(i)">
                            <i class="bi bi-plus-circle me-1"></i> Add Command
                          </button>
                          <div class="dropdown">
                            <button type="button" class="btn btn-link text-decoration-none p-0 text-success dropdown-toggle" data-bs-toggle="dropdown">
                              <i class="bi bi-bell me-1"></i> Add Notification
                            </button>
                            <ul class="dropdown-menu">
                              <li><a class="dropdown-item" (click)="addNotificationStep(i, 'telegram')"><i class="bi bi-telegram text-info me-2"></i>Telegram</a></li>
                              <li><a class="dropdown-item" (click)="addNotificationStep(i, 'slack')"><i class="bi bi-chat-dots text-danger me-2"></i>Slack</a></li>
                              <li><a class="dropdown-item" (click)="addNotificationStep(i, 'teams')"><i class="bi bi-people text-primary me-2"></i>Teams</a></li>
                              <li><a class="dropdown-item" (click)="addNotificationStep(i, 'mail')"><i class="bi bi-envelope text-success me-2"></i>Mail</a></li>
                            </ul>
                          </div>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                </ng-container>
              }
            </ng-container>
            
            @if (stages.length === 0) {
              <div class="text-center py-4 text-muted border rounded bg-muted">
                <i class="bi bi-list-task fs-1 d-block mb-2"></i>
                No stages yet. Add a stage to define your pipeline.
              </div>
            }
          </div>
        </div>

        <div class="col-lg-4">
          <div class="form-section sticky-top" style="top: 80px;">
            <div class="form-section-title">
              <i class="bi bi-gear"></i> Settings
            </div>
            <div class="mb-3">
              <div class="form-check form-switch">
                <input type="checkbox" class="form-check-input" formControlName="enabled" id="enabled">
                <label class="form-check-label" for="enabled">Enable Pipeline</label>
              </div>
            </div>

            <div class="form-section-title mt-4">
              <i class="bi bi-lightning"></i> Triggers
            </div>
            <ng-container formGroupName="triggers">
              <div class="form-check mb-2">
                <input type="checkbox" class="form-check-input" formControlName="manual" id="manual">
                <label class="form-check-label" for="manual">Manual trigger</label>
              </div>
              <div class="form-check mb-2">
                <input type="checkbox" class="form-check-input" formControlName="push" id="push">
                <label class="form-check-label" for="push">On push</label>
              </div>
            </ng-container>

            @if (getGitCredentials().length > 0) {
              <div class="form-section-title mt-4">
                <i class="bi bi-key"></i> Variables Git
              </div>
              <div class="alert alert-info py-2 small mb-0">
                <p class="mb-1">Utilisez les variables dans vos commandes:</p>
                <ul class="mb-0 small">
                  @for (cred of getGitCredentials(); track cred.id) {
                    <li><code>{{ getCredVar(cred.name) }}</code></li>
                  }
                </ul>
              </div>
            }
            
            @if (getNotificationCredentials().length > 0) {
              <div class="form-section-title mt-4">
                <i class="bi bi-bell"></i> Notifications
              </div>
              <div class="alert alert-success py-2 small mb-0">
                <p class="mb-1">Credenciales de notificación disponibles:</p>
                <ul class="mb-0 small">
                  @for (cred of getNotificationCredentials(); track cred.id) {
                    <li><i class="bi bi-{{ getCredIcon(cred.type) }} me-1"></i> {{ cred.name }}</li>
                  }
                </ul>
              </div>
            }

            @if (isEdit() && pipeline()) {
              <div class="form-section-title mt-4">
                <i class="bi bi-webhook"></i> Webhook URL
              </div>
              <div class="alert alert-secondary py-2 small mb-0">
                <p class="mb-2 small">Use this URL to trigger builds automatically:</p>
                <div class="input-group input-group-sm">
                  <input type="text" class="form-control" [value]="getWebhookUrl()" readonly #webhookInput>
                  <button class="btn btn-outline-secondary" (click)="copyWebhookUrl(webhookInput)" title="Copy">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </div>
                <hr class="my-2">
                <p class="mb-1 small"><strong>Configuration:</strong></p>
                <ul class="mb-0 small text-muted">
                  <li><strong>GitHub:</strong> Settings → Webhooks → Add webhook</li>
                  <li><strong>GitLab:</strong> Settings → Webhooks</li>
                  <li><strong>Bitbucket:</strong> Repository settings → Webhooks</li>
                </ul>
              </div>
            }

            <hr class="my-4">

            <div class="d-grid gap-2">
              <div class="alert alert-{{ form.valid ? 'success' : 'warning' }} py-2 small mb-3">
                <i class="bi bi-{{ form.valid ? 'check-circle' : 'exclamation-triangle' }} me-1"></i>
                {{ form.valid ? 'Form is valid' : 'Please fill in all required fields' }}
              </div>
              <button type="submit" class="btn btn-{{ form.valid ? 'primary' : 'secondary' }}" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                {{ isEdit() ? 'Update Pipeline' : 'Create Pipeline' }}
              </button>
              <a routerLink="/pipelines" class="btn btn-outline-secondary">Cancel</a>
            </div>
          </div>
        </div>
      </div>
    </form>
  `
})
export class PipelineFormComponent implements OnInit {
  form!: FormGroup;
  pipeline = signal<Pipeline | null>(null);
  credentials = signal<Credential[]>([]);
  submitting = signal(false);
  formSubmitted = signal(false);
  notificationSteps = signal<Map<string, { provider: string; channel: string }>>(new Map());

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCredentials();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPipeline(id);
    }
  }

  loadCredentials(): void {
    this.api.get<ApiResponse<Credential[]>>('/credentials').subscribe({
      next: (res) => {
        if (res.success) {
          this.credentials.set(res.data);
        }
      }
    });
  }

  isEdit(): boolean {
    return !!this.route.snapshot.paramMap.get('id');
  }

  get stages(): FormArray {
    return this.form.get('stages') as FormArray;
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      repositoryUrl: [''],
      credentialId: [null],
      branch: ['main', Validators.required],
      enabled: [true],
      triggers: this.fb.group({
        manual: [true],
        push: [false],
        schedule: [null]
      }),
      stages: this.fb.array([])
    });
  }

  loadPipeline(id: string): void {
    this.api.get<ApiResponse<Pipeline>>(`/pipelines/${id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.pipeline.set(res.data);
          this.patchForm(res.data);
        }
      }
    });
  }

  patchForm(pipeline: Pipeline): void {
    this.form.patchValue({
      name: pipeline.name,
      description: pipeline.description,
      repositoryUrl: pipeline.repositoryUrl,
      credentialId: pipeline.credentialId || null,
      branch: pipeline.branch,
      enabled: pipeline.enabled,
      triggers: {
        manual: pipeline.triggers?.manual ?? true,
        push: pipeline.triggers?.push ?? false,
        schedule: pipeline.triggers?.schedule ?? null
      }
    });

    this.stages.clear();
    (pipeline.stages || []).forEach((stage, sIdx) => {
      this.addStage(stage, sIdx);
    });
  }

  addStage(stageData?: Stage, stageIndex?: number): void {
    const stageGroup = this.fb.group({
      name: [stageData?.name || '', Validators.required],
      continueOnError: [stageData?.continueOnError || false],
      steps: this.fb.array([])
    });

    (stageData?.steps || []).forEach((step, stepIdx) => {
      this.addStepToStage(stageGroup, step, stageIndex ?? this.stages.length, stepIdx);
    });

    this.stages.push(stageGroup);
  }

  getSteps(stageIndex: number): FormArray {
    return this.stages.at(stageIndex).get('steps') as FormArray;
  }

  getStepsControls(stageIndex: number): any[] {
    return this.getSteps(stageIndex).controls as any[];
  }

  getStepControl(stageIndex: number, stepIndex: number): any {
    return this.getSteps(stageIndex).at(stepIndex);
  }

  getStepKey(stageIndex: number, stepIndex: number): string {
    return `${stageIndex}-${stepIndex}`;
  }

  isNotificationStep(stageIndex: number, stepIndex: number): boolean {
    const key = this.getStepKey(stageIndex, stepIndex);
    return this.notificationSteps().has(key);
  }

  getStepProvider(stageIndex: number, stepIndex: number): string {
    const key = this.getStepKey(stageIndex, stepIndex);
    return this.notificationSteps().get(key)?.provider || '';
  }

  getNotificationCredentials(): Credential[] {
    return this.credentials().filter(c => ['telegram', 'slack', 'teams', 'mail'].includes(c.type));
  }

  getNotificationChannelControl(stageIndex: number, stepIndex: number): string {
    return 'ch-' + this.getStepKey(stageIndex, stepIndex);
  }

  getNotificationCredentialControl(stageIndex: number, stepIndex: number): string {
    return 'cred-' + this.getStepKey(stageIndex, stepIndex);
  }

  getNotificationMessageControl(stageIndex: number, stepIndex: number): string {
    return 'msg-' + this.getStepKey(stageIndex, stepIndex);
  }

  getProviderCardClass(stageIndex: number, stepIndex: number): string {
    const provider = this.getStepProvider(stageIndex, stepIndex);
    const colors: Record<string, string> = {
      'telegram': 'bg-info-subtle',
      'slack': 'bg-danger-subtle',
      'teams': 'bg-primary-subtle',
      'mail': 'bg-success-subtle'
    };
    return colors[provider] || 'bg-muted';
  }

  getProviderBadgeClass(stageIndex: number, stepIndex: number): string {
    const provider = this.getStepProvider(stageIndex, stepIndex);
    const colors: Record<string, string> = {
      'telegram': 'bg-primary',
      'slack': 'bg-danger',
      'teams': 'bg-primary',
      'mail': 'bg-success'
    };
    return colors[provider] || 'bg-secondary';
  }

  getProviderIcon(stageIndex: number, stepIndex: number): string {
    const provider = this.getStepProvider(stageIndex, stepIndex);
    const icons: Record<string, string> = {
      'telegram': 'bi-telegram',
      'slack': 'bi-chat-dots',
      'teams': 'bi-people',
      'mail': 'bi-envelope'
    };
    return icons[provider] || 'bi-bell';
  }

  getChannelPlaceholder(stageIndex: number, stepIndex: number): string {
    const provider = this.getStepProvider(stageIndex, stepIndex);
    if (provider === 'telegram') return 'Chat ID (e.g. -1001234567890)';
    if (provider === 'mail') return 'Recipient email (e.g. user@example.com)';
    return 'Webhook URL or channel name';
  }

  getMessagePlaceholder(): string {
    return 'Message (optional). Example: ✅ Build #{{BUILD_NUMBER}} completed in {{DURATION}}';
  }

  private ensureControlExists(stageIndex: number, controlName: string, defaultValue: string = ''): string {
    const steps = this.getSteps(stageIndex);
    let control = steps.get(controlName);
    if (!control) {
      control = this.fb.control(defaultValue);
      (steps as any).push(control);
    }
    return controlName;
  }

  addStep(stageIndex: number): void {
    const steps = this.getSteps(stageIndex);
    steps.push(this.fb.control('', Validators.required));
  }

  addNotificationStep(stageIndex: number, provider: string): void {
    const steps = this.getSteps(stageIndex);
    const stepIndex = steps.length;
    const key = this.getStepKey(stageIndex, stepIndex);
    
    steps.push(this.fb.control(`notification-${provider}`, Validators.required));
    this.ensureControlExists(stageIndex, 'ch-' + key, '');
    this.ensureControlExists(stageIndex, 'cred-' + key, '');
    this.ensureControlExists(stageIndex, 'msg-' + key, this.getDefaultMessage());
    
    const newMap = new Map(this.notificationSteps());
    newMap.set(key, { provider, channel: '' });
    this.notificationSteps.set(newMap);
  }

  convertToNotification(stageIndex: number, stepIndex: number, provider: string): void {
    const key = this.getStepKey(stageIndex, stepIndex);
    const steps = this.getSteps(stageIndex);
    steps.at(stepIndex).setValue(`notification-${provider}`);
    
    this.ensureControlExists(stageIndex, 'ch-' + key, '');
    this.ensureControlExists(stageIndex, 'cred-' + key, '');
    this.ensureControlExists(stageIndex, 'msg-' + key, this.getDefaultMessage());
    
    const newMap = new Map(this.notificationSteps());
    newMap.set(key, { provider, channel: '' });
    this.notificationSteps.set(newMap);
  }

  onProviderChange(stageIndex: number, stepIndex: number): void {
    const value = this.getStepControl(stageIndex, stepIndex)?.value || '';
    const provider = value.replace('notification-', '');
    const key = this.getStepKey(stageIndex, stepIndex);
    
    if (value.startsWith('notification-')) {
      this.ensureControlExists(stageIndex, 'ch-' + key, '');
      this.ensureControlExists(stageIndex, 'cred-' + key, '');
      this.ensureControlExists(stageIndex, 'msg-' + key, this.getDefaultMessage());
      
      const newMap = new Map(this.notificationSteps());
      const existing = newMap.get(key) || { provider, channel: '' };
      newMap.set(key, { ...existing, provider });
      this.notificationSteps.set(newMap);
    } else {
      const newMap = new Map(this.notificationSteps());
      newMap.delete(key);
      this.notificationSteps.set(newMap);
    }
  }

  private getDefaultMessage(): string {
    return '✅ Build #{{BUILD_NUMBER}} completed successfully\n' +
           'Pipeline: {{PIPELINE_NAME}}\n' +
           'Branch: {{BRANCH}}\n' +
           'Duration: {{DURATION}}';
  }

  private addStepToStage(stageGroup: FormGroup, stepData?: Step, stageIndex?: number, stepIdx?: number): void {
    const steps = stageGroup.get('steps') as FormArray;
    const sIdx = stageIndex ?? this.stages.length;
    const stIdx = stepIdx ?? steps.length;
    
    if (stepData?.type === 'notification' && stepData.provider) {
      const key = this.getStepKey(sIdx, stIdx);
      const newMap = new Map(this.notificationSteps());
      newMap.set(key, { provider: stepData.provider, channel: stepData.channel || '' });
      this.notificationSteps.set(newMap);
      
      steps.push(this.fb.control(`notification-${stepData.provider}`, Validators.required));
      this.ensureControlExists(stageIndex!, 'ch-' + key, stepData.channel || '');
      this.ensureControlExists(stageIndex!, 'cred-' + key, stepData.credentialId || '');
      this.ensureControlExists(stageIndex!, 'msg-' + key, stepData.message || this.getDefaultMessage());
    } else {
      steps.push(this.fb.control(stepData?.command || '', Validators.required));
    }
  }

  removeStep(stageIndex: number, stepIndex: number): void {
    const key = this.getStepKey(stageIndex, stepIndex);
    const steps = this.getSteps(stageIndex);
    
    if (this.notificationSteps().has(key)) {
      const controlsToRemove = ['ch-' + key, 'cred-' + key, 'msg-' + key];
      controlsToRemove.reverse().forEach(name => {
        const idx = steps.controls.findIndex((c: any) => c instanceof this.fb.group ? false : (steps.get(name) === c));
        if (idx > stepIndex) {
          steps.removeAt(idx);
        }
      });
    }
    
    steps.removeAt(stepIndex);
    
    const newMap = new Map(this.notificationSteps());
    newMap.delete(key);
    this.notificationSteps.set(newMap);
  }

  removeStage(index: number): void {
    this.stages.removeAt(index);
  }

  moveStage(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < this.stages.length) {
      const stage = this.stages.at(index);
      this.stages.removeAt(index);
      this.stages.insert(newIndex, stage);
    }
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'username-password': 'Login/Mdp',
      'token': 'Token',
      'ssh-key': 'SSH'
    };
    return labels[type] || type;
  }

  getCredVar(name: string): string {
    return '${CRED:' + name + '}';
  }

  getGitCredentials(): Credential[] {
    return this.credentials().filter(c => !['telegram', 'slack', 'teams', 'mail'].includes(c.type));
  }

  getCredIcon(type: string): string {
    const icons: Record<string, string> = {
      'telegram': 'telegram',
      'slack': 'chat-dots',
      'teams': 'people',
      'mail': 'envelope'
    };
    return icons[type] || 'key';
  }

  getWebhookUrl(): string {
    const pipelineId = this.pipeline()?.id;
    if (!pipelineId) return '';
    return `${this.api.baseUrl}/webhooks/${pipelineId}`;
  }

  copyWebhookUrl(input: HTMLInputElement): void {
    navigator.clipboard.writeText(input.value).then(() => {
      alert('URL copied to clipboard!');
    });
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    
    if (this.form.invalid) {
      console.log('Form invalid:', this.form.errors);
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      return;
    }

    this.submitting.set(true);
    const rawValue = this.form.getRawValue();
    const stagesData = (rawValue.stages || []).map((stage: any, sIdx: number) => {
      const steps: any[] = [];
      let i = 0;
      while (i < (stage.steps || []).length) {
        const cmd = stage.steps[i];
        const key = this.getStepKey(sIdx, i);
        
        if (typeof cmd === 'string' && cmd.startsWith('notification-')) {
          const provider = cmd.replace('notification-', '');
          const channel = stage.steps[i + 1] || '';
          const credentialId = stage.steps[i + 2] || '';
          const message = stage.steps[i + 3] || '';
          
          steps.push({
            type: 'notification',
            name: `${provider} notification`,
            provider: provider,
            credentialId: credentialId || undefined,
            channel: channel,
            message: message || this.getDefaultMessage()
          });
          i += 4;
        } else {
          steps.push({ command: cmd });
          i++;
        }
      }
      
      return {
        name: stage.name,
        continueOnError: stage.continueOnError ?? false,
        steps: steps
      };
    });

    const data: any = {
      name: rawValue.name,
      description: rawValue.description || '',
      repositoryUrl: rawValue.repositoryUrl || '',
      branch: rawValue.branch || 'main',
      enabled: rawValue.enabled ?? true,
      triggers: rawValue.triggers,
      stages: stagesData
    };

    if (rawValue.credentialId) {
      data.credentialId = rawValue.credentialId;
    }

    const id = this.route.snapshot.paramMap.get('id');
    const request = id
      ? this.api.put<ApiResponse<Pipeline>>(`/pipelines/${id}`, data)
      : this.api.post<ApiResponse<Pipeline>>('/pipelines', data);

    request.subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.router.navigate(['/pipelines']);
        }
      },
      error: (err) => {
        console.error('Error creating pipeline:', err);
        this.submitting.set(false);
      }
    });
  }
}
