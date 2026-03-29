import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Pipeline, Stage, Step, Credential, ApiResponse } from '../../models/types';

@Component({
  selector: 'app-pipeline-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
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
                    <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
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
                          <div class="input-group mb-2" [class.has-validation]="getStepControl(i, j)?.invalid">
                            <span class="input-group-text bg-light">$</span>
                            <input type="text" class="form-control" [formControlName]="j" placeholder="npm install"
                                   [class.is-invalid]="getStepControl(i, j)?.invalid && (getStepControl(i, j)?.touched || formSubmitted())"
                                   [class.is-valid]="getStepControl(i, j)?.valid && getStepControl(i, j)?.touched">
                            <button type="button" class="btn btn-outline-danger" (click)="removeStep(i, j)">
                              <i class="bi bi-x"></i>
                            </button>
                            @if (getStepControl(i, j)?.invalid && (getStepControl(i, j)?.touched || formSubmitted())) {
                              <div class="invalid-feedback">Command is required</div>
                            }
                          </div>
                        }
                        <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" (click)="addStep(i)">
                          <i class="bi bi-plus-circle me-1"></i> Add Step
                        </button>
                      </ng-container>
                    </div>
                  </div>
                </ng-container>
              }
            </ng-container>
            
            @if (stages.length === 0) {
              <div class="text-center py-4 text-muted border rounded bg-light">
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

            @if (credentials().length > 0) {
              <div class="form-section-title mt-4">
                <i class="bi bi-key"></i> Variables d'identifiants
              </div>
              <div class="alert alert-info py-2 small mb-0">
                <p class="mb-1">Utilisez les variables dans vos commandes:</p>
                <ul class="mb-0 small">
                  @for (cred of credentials(); track cred.id) {
                    <li><code>{{ getCredVar(cred.name) }}</code></li>
                  }
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
    (pipeline.stages || []).forEach(stage => {
      this.addStage(stage);
    });
  }

  addStage(stageData?: Stage): void {
    const stageGroup = this.fb.group({
      name: [stageData?.name || '', Validators.required],
      continueOnError: [stageData?.continueOnError || false],
      steps: this.fb.array([])
    });

    (stageData?.steps || []).forEach(step => {
      this.addStepToStage(stageGroup, step);
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

  addStep(stageIndex: number): void {
    const steps = this.getSteps(stageIndex);
    steps.push(this.fb.control('', Validators.required));
  }

  private addStepToStage(stageGroup: FormGroup, stepData?: Step): void {
    const steps = stageGroup.get('steps') as FormArray;
    steps.push(this.fb.control(stepData?.command || '', Validators.required));
  }

  removeStep(stageIndex: number, stepIndex: number): void {
    this.getSteps(stageIndex).removeAt(stepIndex);
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
    const data: any = {
      name: rawValue.name,
      description: rawValue.description || '',
      repositoryUrl: rawValue.repositoryUrl || '',
      branch: rawValue.branch || 'main',
      enabled: rawValue.enabled ?? true,
      triggers: rawValue.triggers,
      stages: (rawValue.stages || []).map((stage: any) => ({
        name: stage.name,
        continueOnError: stage.continueOnError ?? false,
        steps: (stage.steps || []).map((cmd: string) => ({ command: cmd }))
      }))
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
