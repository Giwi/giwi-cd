import { Injectable, signal } from '@angular/core';
import { Stage, Step } from '../models/types';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'language' | 'container' | 'static' | 'custom';
  stages: Stage[];
  repositoryUrl?: string;
  branch?: string;
  suggestedCommands?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PipelineTemplatesService {
  private templates = signal<PipelineTemplate[]>([
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'Build and test a Node.js application',
      icon: 'bi-node-js',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Install Dependencies',
          steps: [{ command: 'npm install' }]
        },
        {
          name: 'Lint',
          steps: [{ command: 'npm run lint' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'npm test' }]
        },
        {
          name: 'Build',
          steps: [{ command: 'npm run build' }]
        }
      ]
    },
    {
      id: 'nodejs-docker',
      name: 'Node.js + Docker',
      description: 'Build Node.js app and create Docker image',
      icon: 'bi-box-seam',
      category: 'container',
      branch: 'main',
      stages: [
        {
          name: 'Install Dependencies',
          steps: [{ command: 'npm install' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'npm test' }]
        },
        {
          name: 'Build',
          steps: [{ command: 'npm run build' }]
        },
        {
          name: 'Build Docker Image',
          steps: [{ command: 'docker build -t $IMAGE_NAME .' }]
        },
        {
          name: 'Push Docker Image',
          steps: [{ command: 'docker push $IMAGE_NAME' }]
        }
      ],
      suggestedCommands: ['docker build -t myapp:latest .', 'docker push myapp:latest']
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Build and test a Python application',
      icon: 'bi-code-slash',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Install Dependencies',
          steps: [{ command: 'pip install -r requirements.txt' }]
        },
        {
          name: 'Lint',
          steps: [{ command: 'pylint .' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'pytest' }]
        }
      ]
    },
    {
      id: 'python-docker',
      name: 'Python + Docker',
      description: 'Build Python app and create Docker image',
      icon: 'bi-box-seam',
      category: 'container',
      branch: 'main',
      stages: [
        {
          name: 'Install Dependencies',
          steps: [{ command: 'pip install -r requirements.txt' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'pytest' }]
        },
        {
          name: 'Build Docker Image',
          steps: [{ command: 'docker build -t $IMAGE_NAME .' }]
        },
        {
          name: 'Push Docker Image',
          steps: [{ command: 'docker push $IMAGE_NAME' }]
        }
      ]
    },
    {
      id: 'go',
      name: 'Go',
      description: 'Build and test a Go application',
      icon: 'bi-code-square',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Download Dependencies',
          steps: [{ command: 'go mod download' }]
        },
        {
          name: 'Lint',
          steps: [{ command: 'golangci-lint run' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'go test -v ./...' }]
        },
        {
          name: 'Build',
          steps: [{ command: 'go build -o app .' }]
        }
      ]
    },
    {
      id: 'java-maven',
      name: 'Java (Maven)',
      description: 'Build and test a Java application with Maven',
      icon: 'bi-cup-hot',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Build',
          steps: [{ command: 'mvn clean package -DskipTests' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'mvn test' }]
        }
      ]
    },
    {
      id: 'java-gradle',
      name: 'Java (Gradle)',
      description: 'Build and test a Java application with Gradle',
      icon: 'bi-cup-hot',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Build',
          steps: [{ command: './gradlew build -x test' }]
        },
        {
          name: 'Test',
          steps: [{ command: './gradlew test' }]
        }
      ]
    },
    {
      id: 'rust',
      name: 'Rust',
      description: 'Build and test a Rust application',
      icon: 'bi-gear',
      category: 'language',
      branch: 'main',
      stages: [
        {
          name: 'Build',
          steps: [{ command: 'cargo build --release' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'cargo test' }]
        },
        {
          name: 'Clippy (Lint)',
          steps: [{ command: 'cargo clippy -- -D warnings' }]
        }
      ]
    },
    {
      id: 'static-site',
      name: 'Static Site',
      description: 'Build and deploy a static website',
      icon: 'bi-globe',
      category: 'static',
      branch: 'main',
      stages: [
        {
          name: 'Install',
          steps: [{ command: 'npm install' }]
        },
        {
          name: 'Build',
          steps: [{ command: 'npm run build' }]
        },
        {
          name: 'Deploy',
          steps: [{ command: 'echo "Deploy to your hosting provider"' }]
        }
      ]
    },
    {
      id: 'docker-multiarch',
      name: 'Docker Multi-Arch',
      description: 'Build and push multi-architecture Docker images',
      icon: 'bi-layers',
      category: 'container',
      branch: 'main',
      stages: [
        {
          name: 'Set up QEMU',
          steps: [
            { command: 'docker run --rm --privileged multiarch/qemu-user-static --reset -p yes' }
          ]
        },
        {
          name: 'Build for amd64',
          steps: [
            { command: 'docker buildx build --platform linux/amd64 -t $IMAGE_NAME:amd64 . --push' }
          ]
        },
        {
          name: 'Build for arm64',
          steps: [
            { command: 'docker buildx build --platform linux/arm64 -t $IMAGE_NAME:arm64 . --push' }
          ]
        },
        {
          name: 'Create Manifest',
          steps: [
            { command: 'docker manifest create $IMAGE_NAME $IMAGE_NAME:amd64 $IMAGE_NAME:arm64' },
            { command: 'docker manifest push $IMAGE_NAME' }
          ]
        }
      ],
      suggestedCommands: [
        'docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest . --push'
      ]
    },
    {
      id: 'simple-test',
      name: 'Simple Test',
      description: 'Run basic tests on any project',
      icon: 'bi-check-circle',
      category: 'custom',
      branch: 'main',
      stages: [
        {
          name: 'Install',
          steps: [{ command: 'make install || echo "No install step"' }]
        },
        {
          name: 'Test',
          steps: [{ command: 'make test || echo "No test step"' }]
        }
      ]
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Start from scratch with your own stages',
      icon: 'bi-gear-wide-connected',
      category: 'custom',
      branch: 'main',
      stages: [
        {
          name: 'Build',
          steps: [{ command: 'echo "Add your build commands"' }]
        }
      ]
    }
  ]);

  getTemplates() {
    return this.templates();
  }

  getTemplateById(id: string): PipelineTemplate | undefined {
    return this.templates().find(t => t.id === id);
  }

  getTemplatesByCategory(category: string): PipelineTemplate[] {
    return this.templates().filter(t => t.category === category);
  }
}
