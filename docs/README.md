# GiwiCD - CI/CD Engine

> A modern, self-hosted CI/CD platform built with Node.js and Angular

## Features

- **Pipeline Management** - Create and manage CI/CD pipelines with multiple stages
- **Git Integration** - Automatic git checkout with SSH/HTTPS credential support
- **Real-time Builds** - Live build logs via WebSocket
- **User Management** - Role-based access control (Admin/Contributor)
- **Credential Manager** - Secure storage for SSH keys and tokens
- **Notifications** - Send build status to Telegram, Slack, Teams, and Email (SMTP)
- **Push Polling** - Automatically detect new commits and trigger builds
- **Theme Support** - Light and dark mode with modern UI
- **Responsive Design** - Works on desktop and mobile

## Prerequisites

- Node.js 18+
- npm or yarn
- Git

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd giwicd

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Configuration

### Backend Environment

Create a `.env` file in the `backend` directory:

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Frontend Configuration

The frontend proxy configuration is set in `frontend/proxy.conf.json` to forward API requests to the backend.

## Running the Application

### Development Mode

```bash
# Terminal 1 - Start backend
cd backend
npm start

# Terminal 2 - Start frontend
cd frontend
npm start
```

Access the application:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api

### Default Credentials

On first startup, an admin user is created:

- **Email**: admin@giwicd.local
- **Password**: admin123

> ⚠️ Change this password immediately in production!

### Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Ports:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

**Environment Variables:**

Create a `.env` file or use environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-in-production` | Secret for JWT tokens |
| `PORT` | `3000` | Backend port |
| `FRONTEND_URL` | `http://localhost:4200` | Frontend URL for CORS |
| `NODE_ENV` | `production` | Node environment |

**SMTP Configuration (for email notifications):**

Add to backend `.env`:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=GiwiCD <noreply@example.com>
```

## Project Structure

```
giwicd/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── middleware/      # Auth, error handling
│   │   ├── models/          # Data models (User, Pipeline, Build, etc.)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (BuildExecutor, GitService)
│   │   ├── app.js          # Express app setup
│   │   └── index.js        # Server entry point
│   ├── data/
│   │   └── db.json         # JSON database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Reusable components
│   │   │   ├── guards/     # Route guards
│   │   │   ├── models/     # TypeScript interfaces
│   │   │   ├── pages/      # Page components
│   │   │   └── services/   # Angular services
│   │   ├── styles.scss     # Global styles
│   │   └── app.ts          # Main app component
│   └── package.json
└── README.md
```

## User Guide

### Authentication

#### Login

1. Navigate to http://localhost:4200/login
2. Enter your email and password
3. Click "Sign in"
4. You'll be redirected to the dashboard

#### Registration

If registration is enabled by an admin:

1. Navigate to http://localhost:4200/register
2. Enter email, password, and optional username
3. Click "Create account"

### Dashboard

The dashboard provides an overview of:

- **Stats Cards** - Total builds, success rate, recent builds
- **Recent Builds** - Last 5 builds with status
- **Pipeline Overview** - All pipelines with quick actions

### Pipelines

#### Creating a Pipeline

1. Click "New Pipeline" or navigate to `/pipelines/new`
2. Fill in the details:
   - **Name**: Unique identifier for the pipeline
   - **Description**: Optional description
   - **Repository URL**: Git repository URL (e.g., `https://github.com/user/repo.git`)
   - **Branch**: Default branch (default: `main`)
   - **Credential**: Optional - select for private repositories
3. Add stages:
   - Click "Add Stage"
   - Enter stage name (e.g., "Build", "Test", "Deploy")
   - Add steps with commands
4. Configure triggers (manual, push, schedule)
5. Click "Save Pipeline"

#### Pipeline Stages

Each stage contains:

- **Name**: Stage identifier
- **Steps**: Commands to execute
- **Continue on Error**: Proceed even if a step fails

Example stage with commands:

```yaml
Stage: Build
  Step 1: npm install
  Step 2: npm run build
```

#### Running a Pipeline

1. Click the "Run" button on a pipeline card
2. Optionally specify branch and commit
3. Watch the build progress in real-time

### Builds

#### Viewing Build Details

1. Navigate to `/builds` for build history
2. Click on a build to view details:
   - **Build Info**: Pipeline, branch, commit, trigger
   - **Stages**: Visual pipeline with status
   - **Logs**: Real-time build logs

#### Build Logs

- Logs stream in real-time via WebSocket
- Filter by level: All, Errors, Warnings
- Timestamps for each log entry
- Auto-scroll to latest

#### Cancelling a Build

For running builds, click "Cancel" to abort.

### Credentials

Credentials enable access to private repositories and notification services.

#### Creating a Credential

1. Navigate to `/settings/credentials` (Git credentials)
2. Click "Add"
3. Select type:
   - **Username/Password**: For basic auth
   - **Token**: Personal access token (GitHub, GitLab, Bitbucket)
   - **SSH Key**: Private key for SSH authentication

For notification credentials, navigate to `/settings/notifications`:
   - **Telegram Bot**: Bot Token from @BotFather
   - **Slack Webhook**: Webhook URL
   - **Teams Webhook**: Webhook URL
   - **Email (SMTP)**: SMTP password (optional)

4. Enter the details and save

#### Using Credentials

Reference credentials in pipeline commands:

```
${CRED:my-ssh-key}
```

### Notifications

GiwiCD supports sending build status notifications to multiple platforms.

#### Supported Providers

- **Telegram** - Send messages via Telegram Bot API
- **Slack** - Send messages via Slack webhooks
- **Teams** - Send messages via Microsoft Teams webhooks
- **Email** - Send messages via SMTP

#### Adding a Notification Step

1. Edit a pipeline and add a new stage (e.g., "Notify")
2. Click "Add Notification" dropdown
3. Select a provider (Telegram, Slack, Teams, or Email)
4. Configure:
   - **Telegram**: Bot Token (from @BotFather) and Chat ID
   - **Slack**: Webhook URL (from Slack App settings)
   - **Teams**: Webhook URL (from Teams incoming webhook connector)
   - **Email**: Recipient email address (SMTP configured in server settings)

#### Setting up Email Notifications

1. Configure SMTP in the backend `.env` file:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-user
   SMTP_PASS=your-password
   SMTP_FROM=GiwiCD <noreply@example.com>
   ```
2. Create a notification credential (Settings → Notifications → Add)
3. Add the SMTP password to the credential (optional)
4. In pipeline, select "Email" as notification provider

#### Message Variables

Use these variables in notification messages:

| Variable | Description |
|----------|-------------|
| `{{PIPELINE_NAME}}` | Pipeline name |
| `{{BRANCH}}` | Git branch |
| `{{STATUS}}` | Build status (success/failed) |
| `{{BUILD_NUMBER}}` | Build number |
| `{{COMMIT}}` | Commit SHA (short) |
| `{{COMMIT_MESSAGE}}` | Commit message |
| `{{TRIGGERED_BY}}` | Trigger source (manual/push) |
| `{{DURATION}}` | Build duration |

Example message:
```
✅ Build #{{BUILD_NUMBER}} completed successfully!
Pipeline: {{PIPELINE_NAME}}
Branch: {{BRANCH}}
Duration: {{DURATION}}
```

### Push Polling

GiwiCD can automatically check your git repository for new commits.

#### Enabling Push Triggers

1. Edit a pipeline
2. Enable "On push" trigger
3. Optionally enable "Polling" for automatic detection

The polling service checks all enabled pipelines every 60 seconds using `git ls-remote` to detect new commits.

### User Management (Admin)

Admins can manage users from `/settings/users`:

- **Create Users**: Add new users with role assignment
- **Edit Users**: Change username, role, or password
- **Delete Users**: Remove users (except self)
- **Roles**: Admin (full access) or Contributor (standard access)

### Settings

#### Profile Settings (`/settings/profile`)

- Update username
- Change password

#### Admin Settings (`/settings`)

- **Allow Registration**: Enable/disable public sign-up
- **Max Concurrent Builds**: 1-10 simultaneous builds
- **Default Timeout**: Build step timeout in seconds
- **Retention Days**: How long to keep build history

### Theme

Toggle between light and dark mode using the sun/moon icon in the topbar.

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/logout` | Logout |

### Pipelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipelines` | List pipelines |
| GET | `/api/pipelines/:id` | Get pipeline |
| POST | `/api/pipelines` | Create pipeline |
| PUT | `/api/pipelines/:id` | Update pipeline |
| DELETE | `/api/pipelines/:id` | Delete pipeline |
| POST | `/api/pipelines/:id/trigger` | Trigger build |
| PATCH | `/api/pipelines/:id/toggle` | Enable/disable |

### Builds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/builds` | List builds |
| GET | `/api/builds/stats` | Build statistics |
| GET | `/api/builds/:id` | Get build |
| GET | `/api/builds/:id/logs` | Get logs |
| POST | `/api/builds/:id/cancel` | Cancel build |
| DELETE | `/api/builds/:id` | Delete build |

### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credentials` | List credentials |
| GET | `/api/credentials/:id` | Get credential |
| POST | `/api/credentials` | Create credential |
| PUT | `/api/credentials/:id` | Update credential |
| DELETE | `/api/credentials/:id` | Delete credential |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/:pipelineId` | Trigger build via webhook |
| POST | `/api/webhooks` | Trigger by repo URL |
| GET | `/api/webhooks/generate/:pipelineId` | Generate webhook URL |

### Polling

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/polling/check/:pipelineId` | Check pipeline now |
| POST | `/api/polling/check-all` | Check all pipelines |

### Admin (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/settings` | Get settings |
| PUT | `/api/admin/settings` | Update settings |

## Architecture

### Backend

```
Express.js
├── Routes (auth, pipelines, builds, credentials, admin, webhooks, polling)
├── Models (User, Pipeline, Build, Credential)
├── Services
│   ├── BuildExecutor - Build execution engine
│   ├── GitService - Git clone/pull operations
│   ├── NotificationService - Telegram, Slack, Teams, Email notifications
│   ├── PollingService - Git repository polling
│   └── WebSocketManager - Real-time communication
└── Middleware (JWT auth, error handling)
```

### Frontend

```
Angular 20 (Standalone Components)
├── Pages
│   ├── Dashboard
│   ├── Pipelines (list, form)
│   ├── Builds (list, detail)
│   └── Settings (profile, credentials, admin)
├── Services
│   ├── AuthService - Authentication state
│   ├── ApiService - HTTP client
│   └── WebSocketService - Real-time updates
└── Guards (auth, guest, admin)
```

### Database Schema

```json
{
  "users": [...],
  "pipelines": [...],
  "builds": [...],
  "credentials": [...],
  "settings": {...}
}
```

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connected` | Server → Client | Connection established |
| `subscribe` | Client → Server | Subscribe to build |
| `build:log` | Server → Client | Log entry |
| `build:stage` | Server → Client | Stage started |
| `build:complete` | Server → Client | Build finished |
| `build:cancelled` | Server → Client | Build cancelled |

## Security Considerations

1. **Change default credentials** - Update the admin password immediately
2. **JWT Secret** - Use a strong, random secret in production
3. **Registration** - Disable public registration in production
4. **Credentials** - Never expose credentials in logs or URLs
5. **Timeouts** - Configure appropriate build timeouts

## Troubleshooting

### Build fails with "Repository not found"

- Verify the repository URL is correct
- Check if the credential is valid
- Ensure the branch exists

### WebSocket not connecting

- Check if the backend is running on port 3000
- Verify no firewall blocking WebSocket connections
- Check browser console for errors

### Dark mode not applying

- Clear browser cache
- Check localStorage for theme preference
- Verify CSS variables are loaded

## License

MIT License

## Support

For issues and feature requests, please open an issue on the project repository.
