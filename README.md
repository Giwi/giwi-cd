# GiwiCD - CI/CD Engine

> A modern, self-hosted CI/CD platform built with Node.js, Express, and Angular

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Angular](https://img.shields.io/badge/Angular-20-red)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## Features

- **Pipeline Management** - Create and manage CI/CD pipelines with multiple stages
- **Pipeline Templates** - Pre-built templates for Node.js, Python, Go, Java, Rust, Docker, and more
- **Drag & Drop Reordering** - Easily reorder stages and steps in pipelines
- **Git Integration** - Automatic git checkout with SSH/HTTPS credential support
- **Real-time Builds** - Live build logs and progress visualization via WebSocket
- **Build History Auto-refresh** - Automatically updates when builds start or complete
- **Enhanced Log Viewer** - Search/filter logs by level, auto-scroll toggle, line numbers
- **User Management** - Role-based access control (Admin/User)
- **Credential Manager** - Secure storage for SSH keys, tokens, and notification credentials
- **Notifications** - Send build status to Telegram, Slack, Teams, and Email during build execution
- **Dynamic Variables** - Build notifications support {{PIPELINE_NAME}}, {{BUILD_NUMBER}}, {{BRANCH}}, {{STATUS}}, {{COMMIT}}, {{DURATION}}, {{BUILD_URL}}
- **Push Polling** - Automatically detect new commits and trigger builds
- **Build Retention** - Configure how many builds to keep per pipeline
- **Artifact Storage** - Store and download build artifacts
- **System Logs** - Admin access to server logs with search/filter
- **Theme Support** - Light and dark mode with modern UI
- **Responsive Design** - Works on desktop and mobile
- **API Pagination** - paginated list endpoints
- **API Versioning** - `/api/v1/` prefix for backward compatibility
- **TypeScript** - Full type-safe backend with strict compilation
- **Comprehensive Tests** - Jest test suite with coverage
- **Docker** - Multi-platform image for amd64/arm64
- **Graceful Shutdown** - Wait for builds to complete before stopping

## CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing and Docker image building.

```bash
# Push a tag to trigger a new release build
git tag v1.0.0 && git push origin v1.0.0
```

This will:
1. Run backend and frontend tests
2. Build and push Docker image to GHCR

## Docker

```bash
# Pull the latest image from GHCR
docker pull ghcr.io/giwi/giwi-cd:latest

# Run the container
docker run -d \
  --name giwicd \
  -p 3000:3000 \
  -p 4200:4200 \
  -e JWT_SECRET=your-secret \
  ghcr.io/giwi/giwi-cd:latest
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd giwicd

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running

#### Development

```bash
# Terminal 1 - Backend (port 3000)
cd backend && npm start

# Terminal 2 - Frontend (port 4200)
cd frontend && npm start
```

#### Docker

```bash
# Build and start
docker-compose up --build

# Or with custom JWT secret
JWT_SECRET=your-secret docker-compose up --build
```

Open http://localhost:4200 and login with:
- **Email**: admin@giwicd.local
- **Password**: admin123

### Running Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `FRONTEND_URL` | No | http://localhost:4200 | CORS origin |
| `DB_FILE` | No | ./data/db.json | Database file path |
| `LOG_LEVEL` | No | info | Logging level (error/warn/info/debug) |

## API Endpoints

> All endpoints support both `/api/` and `/api/v1/` prefixes for backward compatibility.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/version` | GET | No | Get API version |
| `/api/health` | GET | No | Health check |
| `/api/health/live` | GET | No | Liveness probe |
| `/api/health/ready` | GET | No | Readiness probe |
| `/api/auth/register` | POST | No | Register user |
| `/api/auth/login` | POST | No | Login |
| `/api/dashboard` | GET | Optional | Dashboard stats |
| `/api/pipelines` | GET | Yes | List pipelines (paginated) |
| `/api/pipelines` | POST | Yes | Create pipeline |
| `/api/pipelines/:id` | GET | Yes | Get pipeline |
| `/api/pipelines/:id` | PUT | Yes | Update pipeline |
| `/api/pipelines/:id` | DELETE | Yes | Delete pipeline |
| `/api/pipelines/:id/trigger` | POST | Yes | Trigger build |
| `/api/pipelines/:id/toggle` | PATCH | Yes | Enable/disable pipeline |
| `/api/pipelines/:id/cancel` | POST | Yes | Cancel running build |
| `/api/builds` | GET | Yes | List builds (paginated) |
| `/api/builds/:id` | GET | Yes | Get build |
| `/api/builds/:id/cancel` | POST | Yes | Cancel build |
| `/api/builds/:id/logs` | GET | Yes | Get build logs |
| `/api/credentials` | GET | Yes | List credentials |
| `/api/credentials` | POST | Yes | Create credential |
| `/api/credentials/:id` | GET | Yes | Get credential |
| `/api/credentials/:id` | PUT | Yes | Update credential |
| `/api/credentials/:id` | DELETE | Yes | Delete credential |
| `/api/credentials/:id/test` | POST | Yes | Test notification |
| `/api/artifacts/:pipelineId/:buildId` | GET | Yes | List artifacts |
| `/api/artifacts/:name` | GET | Yes | Download artifact |
| `/api/admin/users` | GET | Admin | List users |
| `/api/admin/users` | POST | Admin | Create user |
| `/api/admin/users/:id` | PUT | Admin | Update user |
| `/api/admin/users/:id` | DELETE | Admin | Delete user |
| `/api/admin/settings` | GET | Admin | Get settings |
| `/api/admin/settings` | PUT | Admin | Update settings |
| `/api/admin/logs` | GET | Admin | Get server logs |
| `/api/admin/logs` | DELETE | Admin | Clear logs |

## Documentation

Detailed documentation is available in [docs/README.md](docs/README.md).

## Screenshots

See the application in action in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

## Project Structure

```
giwicd/
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── config/          # Configuration, validation
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # Data models
│   │   ├── services/        # Build executor, Git service, WebSocket
│   │   └── middleware/     # Auth, rate limiting, CSRF, logging
│   ├── data/                # JSON database
│   ├── __tests__/           # Jest tests
│   └── jest.config.js
├── frontend/                 # Angular SPA
│   ├── src/app/
│   │   ├── pages/           # Page components
│   │   ├── services/        # API, Auth, WebSocket
│   │   └── components/      # Reusable components
│   └── Dockerfile
├── docker-compose.yml
├── docs/                    # Documentation
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3) |
| Auth | JWT, bcrypt |
| Real-time | WebSocket |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Testing | Jest, Supertest |
| Frontend | Angular 20 |
| Styling | SCSS, CSS Variables |

## Security Features

- JWT authentication with role-based access
- Rate limiting on auth and API endpoints
- CSRF protection with token validation
- Input validation on all endpoints
- Secure credential storage (masked in responses)
- Environment validation at startup

## License

MIT
