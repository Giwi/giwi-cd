---
title: "Introducing GiwiCD: A Modern, Self-Hosted CI/CD Platform for Developers"
date: 2026-04-05
author: GiwiSoft
tags: [cicd, devops, opensource, nodejs, angular]
---

# Introducing GiwiCD: A Modern, Self-Hosted CI/CD Platform for Developers

If you're a developer tired of waiting for slow cloud CI/CD pipelines or frustrated by complex configuration files, there's a new player in town. Meet **GiwiCD** — a lightweight, self-hosted CI/CD engine built with Node.js, Express, and Angular.

## Why Another CI/CD Tool?

The CI/CD space is crowded. Jenkins, GitHub Actions, GitLab CI, CircleCI — the list goes on. But each comes with trade-offs:

- **Jenkins**: Powerful but heavy, with a steep learning curve
- **GitHub Actions**: Tied to GitHub, can get expensive for private repos
- **GitLab CI**: Great if you're all-in on GitLab
- **CircleCI/Travis**: Cloud-only, usage-based pricing adds up

GiwiCD takes a different approach. It's designed for **developers who want a simple, fast, self-hosted CI/CD solution** that just works.

## What is GiwiCD?

GiwiCD is an open-source CI/CD platform that lets you:

- **Create pipelines visually** — No YAML files. Just click, drag, and configure.
- **Run builds in real-time** — Watch your builds execute live with WebSocket-streamed logs.
- **Manage credentials securely** — Store SSH keys, tokens, and notification credentials safely.
- **Get notified automatically** — Send build status to Telegram, Slack, Teams, or Email.
- **Trigger builds from anywhere** — Webhooks, push polling, or manual clicks.

## Key Features

### Visual Pipeline Builder

Create complex pipelines with multiple stages. Drag and drop to reorder, add notification steps, and configure triggers — all through an intuitive UI.

### Real-Time Build Logs

No more refreshing. Build logs stream to your browser in real-time via WebSocket. Filter by level, search through output, and watch stages complete live.

### Git Integration

Works with GitHub, GitLab, Bitbucket, and any Git server. Supports both HTTPS and SSH authentication. Automatic commit detection via push polling.

### Multi-Platform Notifications

Keep your team informed with build notifications to:

- **Telegram** — Bot-based messaging
- **Slack** — Incoming webhooks
- **Microsoft Teams** — Webhook connectors
- **Email** — SMTP delivery

### Role-Based Access Control

Admin and contributor roles with granular permissions. Control who can create pipelines, trigger builds, and manage settings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3) |
| Frontend | Angular 21, Bootstrap 5 |
| Real-time | WebSocket |
| Testing | Jest, Supertest, Jasmine |
| CI/CD | GitHub Actions, Docker |

## Getting Started

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/Giwi/giwi-cd.git
cd giwi-cd

# Start with Docker Compose
docker-compose up --build
```

Open http://localhost:4200 and login with:
- **Email**: `admin@giwicd.local`
- **Password**: `admin123`

### Manual Installation

```bash
# Install backend
cd backend && npm install && npm run build

# Install frontend
cd ../frontend && npm install

# Start both services
cd backend && npm start  # Terminal 1
cd frontend && npm start  # Terminal 2
```

## Use Cases

### 1. Personal Projects

Deploy your side projects without paying for cloud CI. GiwiCD runs on a $5 VPS and handles everything from testing to deployment.

### 2. Small Teams

Give your team a shared CI/CD platform without the complexity of Jenkins or the cost of cloud solutions.

### 3. Educational Environments

Perfect for teaching CI/CD concepts. The visual pipeline builder makes it easy for students to understand build workflows.

### 4. Edge/IoT Deployments

Lightweight enough to run on edge devices. Deploy builds directly to IoT hardware without cloud intermediaries.

## Architecture

GiwiCD follows a clean, modular architecture:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │◄────►│    Backend    │◄────►│   Workers    │
│   (Angular)  │      │   (Express)   │      │  (Builds)    │
│  localhost   │      │  localhost    │      │  localhost    │
│    :4200     │      │    :3000     │      │    :3000     │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Database   │
                      │  (SQLite)    │
                      └──────────────┘
```

The build executor runs stages sequentially, with each stage containing multiple steps. Real-time updates are pushed to the frontend via WebSocket.

## Screenshots

### Landing Page

![Landing Page](images/landing.png)

### Dashboard

![Dashboard](images/dashboard.png)

### Pipeline Management

![Pipelines](images/pipelines.png)

### Build History

![Builds](images/builds.png)

## Roadmap

GiwiCD is actively developed. Upcoming features include:

- [ ] Parallel stage execution
- [ ] Build artifact caching
- [ ] Docker-in-Docker support
- [ ] Plugin system for custom runners
- [ ] Multi-environment deployments
- [ ] Slack app integration

## Contributing

GiwiCD is open-source under the MIT License. Contributions are welcome!

```bash
# Fork the repo
git clone https://github.com/YOUR_USERNAME/giwi-cd.git
cd giwi-cd

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run tests
cd backend && npm test
```

## Conclusion

GiwiCD fills a gap in the CI/CD ecosystem. It's not trying to replace Jenkins for enterprise monoliths or GitHub Actions for GitHub-centric workflows. Instead, it offers a **simple, fast, self-hosted alternative** that respects your time and your infrastructure.

If you're looking for a CI/CD solution that:

- Runs on a single VPS
- Has a visual pipeline builder
- Streams build logs in real-time
- Supports multiple notification platforms
- Is easy to set up and maintain

...then GiwiCD might be exactly what you need.

**[View on GitHub](https://github.com/Giwi/giwi-cd)** | **[Read the Docs](docs/README.md)** | **[Try the Demo](http://localhost:4200)**

---

*Built with ❤️ by [GiwiSoft](https://giwi.fr)*
