import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

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
          <a routerLink="/login" class="btn btn-primary">Sign In</a>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-content">
          <div class="badge-new">Version 1.0.0 available</div>
          <h1 class="hero-title">
            <span class="text-gradient">GiwiCD</span>
            <br>
            Modern CI/CD for your projects
          </h1>
          <p class="hero-subtitle">
            Automate your builds, tests, and deployments in just a few clicks. 
            A high-performance, self-hosted solution designed for developers.
          </p>
          <div class="hero-actions">
            <a routerLink="/login" class="btn btn-primary btn-lg px-4">
              <i class="bi bi-rocket-takeoff me-2"></i>Get Started
            </a>
            <a href="https://github.com/giwi/giwicd" target="_blank" class="btn btn-outline-secondary btn-lg px-4">
              <i class="bi bi-github me-2"></i>Documentation
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="dashboard-mockup">
            <div class="mockup-header">
              <div class="mockup-dots"><span></span><span></span><span></span></div>
              <div class="mockup-address">giwicd.local/dashboard</div>
            </div>
            <div class="mockup-body">
              <div class="mockup-sidebar">
                <div class="mockup-item active"></div>
                <div class="mockup-item"></div>
                <div class="mockup-item"></div>
              </div>
              <div class="mockup-content">
                <div class="pipeline-preview">
                  <div class="stage">
                    <div class="stage-header">
                      <span class="stage-dot success pulse"></span>
                      <span>Build</span>
                    </div>
                    <div class="steps">
                      <div class="step"><i class="bi bi-check2-circle text-success"></i> npm install</div>
                      <div class="step"><i class="bi bi-check2-circle text-success"></i> npm run build</div>
                    </div>
                  </div>
                  <div class="connector pulse-line"></div>
                  <div class="stage">
                    <div class="stage-header">
                      <span class="stage-dot success pulse"></span>
                      <span>Test</span>
                    </div>
                    <div class="steps">
                      <div class="step"><i class="bi bi-check2-circle text-success"></i> npm test</div>
                    </div>
                  </div>
                  <div class="connector pulse-line"></div>
                  <div class="stage">
                    <div class="stage-header">
                      <span class="stage-dot in-progress spin"></span>
                      <span>Deploy</span>
                    </div>
                    <div class="steps">
                      <div class="step"><i class="bi bi-arrow-repeat spin"></i> ./deploy.sh</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="workflow-section">
        <div class="container">
          <h2 class="section-title">How does it work?</h2>
          <div class="workflow-steps">
            <div class="workflow-step">
              <div class="workflow-icon"><i class="bi bi-git"></i></div>
              <h4>1. Push</h4>
              <p>Push your code to GitHub, GitLab, or your private Git server.</p>
            </div>
            <div class="workflow-arrow"><i class="bi bi-chevron-right"></i></div>
            <div class="workflow-step">
              <div class="workflow-icon"><i class="bi bi-gear-wide-connected"></i></div>
              <h4>2. Build</h4>
              <p>GiwiCD detects the change and automatically triggers your pipeline.</p>
            </div>
            <div class="workflow-arrow"><i class="bi bi-chevron-right"></i></div>
            <div class="workflow-step">
              <div class="workflow-icon"><i class="bi bi-cloud-check"></i></div>
              <h4>3. Deploy</h4>
              <p>Your application is tested and deployed to production instantly.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="features">
        <h2 class="section-title">Key Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-diagram-3"></i>
            </div>
            <h3>Pipeline Management</h3>
            <p>Create and manage complex pipelines with multiple stages. Define your process visually.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-lightning-charge"></i>
            </div>
            <h3>Real-time Builds</h3>
            <p>Watch your builds execute live with logs streamed via WebSocket.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-bell"></i>
            </div>
            <h3>Notifications</h3>
            <p>Stay informed via Telegram, Slack, or Email as soon as a build completes.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-key"></i>
            </div>
            <h3>Secrets Management</h3>
            <p>Securely store SSH keys and tokens for your private repositories.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-box-seam"></i>
            </div>
            <h3>Docker Ready</h3>
            <p>Easily deploy GiwiCD with Docker Compose on any server.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-moon-stars"></i>
            </div>
            <h3>Modern Interface</h3>
            <p>Polished UI with native dark mode and fully responsive design.</p>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <span>&copy; 2026 <a href="https://giwi.fr" target="_blank" rel="noopener">GiwiSoft</a>. Built with passion for developers.</span>
      </footer>
      <script defer src="https://analytics.giwi.fr/script.js" data-website-id="61d8fe09-bf30-4ccc-b967-98e46099eba2"></script>
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

    .badge-new {
      display: inline-block;
      padding: 0.4rem 1rem;
      background: rgba(var(--primary-rgb), 0.1);
      color: var(--primary);
      border-radius: 100px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(var(--primary-rgb), 0.2);
    }

    .hero-visual {
      display: flex;
      justify-content: center;
      perspective: 1000px;
    }

    .dashboard-mockup {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 600px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: rotateY(-5deg) rotateX(5deg);
      transition: transform 0.5s ease;
    }

    .dashboard-mockup:hover {
      transform: rotateY(0deg) rotateX(0deg);
    }

    .mockup-header {
      background: var(--bg-muted);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .mockup-dots {
      display: flex;
      gap: 6px;
    }

    .mockup-dots span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #4b5563;
    }

    .mockup-address {
      background: var(--bg-surface);
      padding: 0.2rem 1rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-grow: 1;
      text-align: center;
    }

    .mockup-body {
      display: flex;
      height: 300px;
    }

    .mockup-sidebar {
      width: 60px;
      background: var(--bg-muted);
      border-right: 1px solid var(--border);
      padding: 1rem 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .mockup-item {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: var(--border);
    }

    .mockup-item.active {
      background: var(--primary);
    }

    .mockup-content {
      flex-grow: 1;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .pipeline-preview {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stage {
      background: var(--bg-muted);
      border-radius: var(--radius);
      padding: 0.75rem;
    }

    .stage-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .stage-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .stage-dot.success {
      background: #238636;
    }

    .stage-dot.in-progress {
      background: #9a6700;
    }

    .pulse {
      animation: pulse-animation 2s infinite;
    }

    @keyframes pulse-animation {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .spin {
      animation: spin-animation 2s linear infinite;
    }

    @keyframes spin-animation {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .steps {
      font-size: 0.75rem;
    }

    .step {
      padding: 0.2rem 0;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .connector {
      width: 2px;
      height: 12px;
      background: var(--border);
      margin-left: 20px;
    }

    .pulse-line {
      background: linear-gradient(to bottom, var(--border), var(--primary), var(--border));
      background-size: 200% 200%;
      animation: line-pulse 2s linear infinite;
    }

    @keyframes line-pulse {
      0% { background-position: 0% 0%; }
      100% { background-position: 0% 100%; }
    }

    .workflow-section {
      background: var(--bg-muted);
      padding: 6rem 2rem;
    }

    .workflow-steps {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2rem;
      margin-top: 3rem;
    }

    .workflow-step {
      text-align: center;
      flex: 1;
      max-width: 250px;
    }

    .workflow-icon {
      width: 80px;
      height: 80px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--primary);
      margin: 0 auto 1.5rem;
      box-shadow: var(--shadow-md);
    }

    .workflow-arrow {
      font-size: 2rem;
      color: var(--border);
    }

    .workflow-step h4 {
      margin-bottom: 1rem;
      font-weight: 700;
    }

    .workflow-step p {
      color: var(--text-muted);
      font-size: 0.9375rem;
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
export class LandingComponent {
  constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('GiwiCD - Modern CI/CD Engine');
    this.meta.updateTag({ name: 'description', content: 'GiwiCD is a modern, self-hosted CI/CD engine for automated build, test, and deployment workflows. Open source and free to use.' });
    this.meta.updateTag({ name: 'keywords', content: 'CI/CD, continuous integration, continuous deployment, DevOps, automation, build automation, open source, self-hosted' });
    this.meta.updateTag({ property: 'og:title', content: 'GiwiCD - Modern CI/CD Engine' });
    this.meta.updateTag({ property: 'og:description', content: 'A modern, self-hosted CI/CD engine for automated build, test, and deployment workflows.' });
    this.meta.updateTag({ name: 'twitter:title', content: 'GiwiCD - Modern CI/CD Engine' });
    this.meta.updateTag({ name: 'twitter:description', content: 'A modern, self-hosted CI/CD engine for automated build, test, and deployment workflows.' });
  }
}
