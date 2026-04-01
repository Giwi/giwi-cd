import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-container">
      <nav class="landing-nav">
        <div class="nav-brand">
          <i class="bi bi-stack"></i>
          <span>GiwiCD</span>
        </div>
        <div class="nav-links">
          <a href="https://github.com/giwi/giwicd" target="_blank" rel="noopener" class="btn btn-link text-muted" title="GitHub">
            <i class="bi bi-github"></i>
          </a>
          <a routerLink="/login" class="btn btn-outline-light">Sign In</a>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="text-gradient">GiwiCD</span>
            <br>
            Your Self-Hosted CI/CD Platform
          </h1>
          <p class="hero-subtitle">
            Build, test, and deploy your applications with ease. 
            Modern, lightweight, and designed for developers.
          </p>
          <div class="hero-actions">
            <a routerLink="/login" class="btn btn-outline-light btn-lg">
              <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="pipeline-preview">
            <div class="stage">
              <div class="stage-header">
                <span class="stage-dot success"></span>
                <span>Build</span>
              </div>
              <div class="steps">
                <div class="step"><i class="bi bi-terminal"></i> npm install</div>
                <div class="step"><i class="bi bi-terminal"></i> npm run build</div>
              </div>
            </div>
            <div class="connector"></div>
            <div class="stage">
              <div class="stage-header">
                <span class="stage-dot success"></span>
                <span>Test</span>
              </div>
              <div class="steps">
                <div class="step"><i class="bi bi-terminal"></i> npm test</div>
              </div>
            </div>
            <div class="connector"></div>
            <div class="stage">
              <div class="stage-header">
                <span class="stage-dot pending"></span>
                <span>Deploy</span>
              </div>
              <div class="steps">
                <div class="step"><i class="bi bi-terminal"></i> ./deploy.sh</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="features">
        <h2 class="section-title">Why GiwiCD?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-diagram-3"></i>
            </div>
            <h3>Pipeline Management</h3>
            <p>Create and manage CI/CD pipelines with multiple stages. Define your build process visually.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-lightning-charge"></i>
            </div>
            <h3>Real-time Builds</h3>
            <p>Watch your builds execute in real-time with live logs streaming directly to your browser.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-bell"></i>
            </div>
            <h3>Notifications</h3>
            <p>Get notified via Telegram, Slack, Teams, or Email when your builds complete.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-key"></i>
            </div>
            <h3>Credential Manager</h3>
            <p>Securely store SSH keys, tokens, and passwords for private repositories.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-github"></i>
            </div>
            <h3>Git Integration</h3>
            <p>Automatic git checkout with support for HTTPS and SSH authentication.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-moon-stars"></i>
            </div>
            <h3>Modern UI</h3>
            <p>Beautiful interface with light and dark mode. Fully responsive for all devices.</p>
          </div>
        </div>
      </section>

      <section class="tech-stack">
        <h2 class="section-title">Built With</h2>
        <div class="tech-items">
          <div class="tech-item">
            <i class="bi bi-hexagon"></i>
            <span>Angular</span>
          </div>
          <div class="tech-item">
            <i class="bi bi-box-seam"></i>
            <span>Node.js</span>
          </div>
          <div class="tech-item">
            <i class="bi bi-bootstrap"></i>
            <span>Bootstrap</span>
          </div>
          <div class="tech-item">
            <i class="bi bi-git"></i>
            <span>Git</span>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <span>&copy; 2026 <a href="https://giwi.fr" target="_blank" rel="noopener">GiwiSoft</a>. <a href="https://github.com/giwi/giwicd" target="_blank" rel="noopener">GitHub</a>.</span>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .landing-container {
      min-height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
    }

    .landing-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--bg-surface);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
    }

    .nav-brand i {
      font-size: 1.5rem;
    }

    .nav-links .btn-outline-light {
      --bs-btn-border-color: var(--border);
      --bs-btn-color: var(--text-primary);
    }

    .nav-links .btn-link {
      color: var(--text-muted);
      font-size: 1.25rem;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      padding: 4rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
      align-items: center;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 1.5rem;
    }

    .text-gradient {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
      max-width: 500px;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
    }

    .hero-visual {
      display: flex;
      justify-content: center;
    }

    .pipeline-preview {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      box-shadow: var(--shadow-xl);
    }

    .stage {
      background: var(--bg-muted);
      border-radius: var(--radius);
      padding: 1rem;
      min-width: 200px;
    }

    .stage-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .stage-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .stage-dot.success {
      background: #238636;
    }

    .stage-dot.pending {
      background: var(--text-muted);
    }

    .steps {
      font-size: 0.875rem;
    }

    .step {
      padding: 0.25rem 0;
      color: var(--text-muted);
    }

    .step i {
      margin-right: 0.5rem;
      color: var(--primary);
    }

    .connector {
      width: 2px;
      height: 24px;
      background: var(--border);
      margin: 0 auto;
    }

    .features {
      padding: 6rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 3rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    .feature-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .feature-icon i {
      font-size: 1.5rem;
      color: #fff;
    }

    .feature-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .feature-card p {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0;
    }

    .tech-stack {
      padding: 4rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
    }

    .tech-items {
      display: flex;
      justify-content: center;
      gap: 3rem;
      flex-wrap: wrap;
    }

    .tech-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
    }

    .tech-item i {
      font-size: 1.5rem;
      color: var(--primary);
    }

    .landing-footer {
      padding: 0.75rem 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      background: var(--bg-surface);
      margin-top: auto;
      
      a {
        color: var(--text-primary);
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }

    @media (max-width: 768px) {
      .hero {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 2rem;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .hero-subtitle {
        margin: 0 auto 2rem;
      }

      .hero-actions {
        justify-content: center;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .tech-items {
        gap: 1.5rem;
      }
    }
  `]
})
export class LandingComponent {}
