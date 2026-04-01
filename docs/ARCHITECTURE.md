# GiwiCD Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GiwiCD                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Frontend   │      │    Backend    │      │   Workers    │ │
│  │   (Angular) │◄────►│   (Express)   │◄────►│  (Builds)    │ │
│  │  localhost   │      │  localhost    │      │  localhost    │ │
│  │    :4200     │      │    :3000     │      │    :3000     │ │
│  └──────────────┘      └──────┬───────┘      └──────────────┘ │
│                               │                              ▲  │
│                               ▼                              │  │
│                        ┌──────────────┐                    │  │
│                        │   Database   │                    │  │
│                        │  (JSON File) │────────────────────┘  │
│                        │  db.json     │                      │
│                        └──────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser    │────►│   Backend    │────►│  Build      │
│  (Angular)  │◄────│  (Express)   │◄────│  Executor   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Database    │
                   │  (db.json)   │
                   └──────────────┘
```

## API Routes

```
/api
├── /auth
│   ├── POST   /login          - User login
│   ├── POST   /register       - User registration
│   ├── GET    /me             - Get current user
│   └── PUT    /password       - Change password
│
├── /pipelines
│   ├── GET    /               - List all pipelines
│   ├── GET    /:id            - Get pipeline details
│   ├── POST   /               - Create pipeline
│   ├── POST   /import         - Import pipeline from JSON
│   ├── PUT    /:id            - Update pipeline
│   ├── DELETE /:id            - Delete pipeline
│   ├── POST  /:id/trigger    - Trigger build
│   ├── POST  /:id/toggle     - Enable/disable pipeline
│   └── GET   /:id/builds     - Get pipeline builds
│
├── /builds
│   ├── GET    /               - List all builds
│   ├── GET    /:id            - Get build details
│   ├── GET    /:id/logs       - Get build logs
│   └── POST  /:id/cancel      - Cancel build
│
├── /credentials
│   ├── GET    /               - List credentials
│   ├── GET    /:id            - Get credential details
│   ├── POST   /               - Create credential
│   ├── PUT    /:id            - Update credential
│   ├── POST   /:id/test      - Test credential
│   └── DELETE /:id            - Delete credential
│
├── /webhooks
│   ├── GET    /webhook/:id    - Trigger webhook manually
│   └── POST   /webhook/:id    - Push event webhook (GitHub/GitLab)
│
├── /admin
│   ├── GET    /users          - List users
│   ├── POST   /users          - Create user
│   ├── PUT    /users/:id      - Update user
│   ├── DELETE /users/:id      - Delete user
│   ├── GET    /settings       - Get settings
│   └── PUT    /settings      - Update settings
│
└── /notifications
    └── GET    /defaults       - Get notification defaults
```

## Build Pipeline Execution

```
Pipeline Trigger
      │
      ▼
┌─────────────────┐
│  Git Checkout  │
│  (clone/pull)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Stage 1      │────►│    Stage 2      │
│   (Build)       │     │    (Test)       │
└────────┬────────┘     └────────┬────────┘
         │                    │
         ▼                    ▼
   ┌─────────┐          ┌─────────┐
   │ Step 1  │          │ Step 1  │
   └─────────┘          └─────────┘
```

## Database Schema

```
users
├── id          (UUID)
├── email
├── username
├── password    (hashed)
├── role        (admin/contributor)
├── createdAt
└── updatedAt

pipelines
├── id          (UUID)
├── name
├── description
├── repositoryUrl
├── branch
├── credentialId
├── enabled
├── triggers
│   ├── manual
│   ├── push
│   └── schedule
├── stages
│   ├── name
│   ├── continueOnError
│   └── steps[]
│       ├── type       (command/notification)
│       ├── provider   (telegram/slack/teams/mail)
│       ├── credentialId
│       ├── channel    (optional for slack/teams)
│       ├── message
│       └── command
├── environment[]
├── createdAt
└── updatedAt

builds
├── id          (UUID)
├── pipelineId
├── pipelineName
├── number
├── status      (pending/running/success/failed/cancelled)
├── branch
├── commit
├── commitMessage
├── triggeredBy
├── startedAt
├── finishedAt
├── duration
├── stages[]
│   ├── name
│   ├── status
│   └── steps[]
└── logs[]

credentials
├── id          (UUID)
├── name
├── type        (token/username-password/ssh-key/telegram/slack/teams/mail)
├── username
├── token
├── password
├── privateKey
├── passphrase
├── smtp        (for mail type)
├── from/to     (for mail type)
├── description
├── createdAt
└── updatedAt

settings
├── registrationEnabled
├── notificationDefaults
│   ├── telegram.defaultChannel
│   ├── slack.defaultChannel
│   └── teams.defaultChannel
└── createdAt
```

## WebSocket Events

```
Server ─────────────────────────────► Client

build:log      - Log entry from build
build:stage    - Stage started/completed
build:step     - Step started/completed
build:complete - Build finished
build:cancelled - Build cancelled
```

## Technology Stack

```
Frontend                    Backend
────────                   ──────
Angular 20                 Node.js 18+
TypeScript                 Express.js
Bootstrap 5                JSON DB (lowdb)
Bootstrap Icons           JWT Auth
SCSS                       WebSocket
                           Git operations (simple-git)
```

## Features

### Pipeline Management
- Create, edit, delete pipelines
- Import/export pipelines as JSON
- Enable/disable pipelines
- Manual and webhook triggers

### Build Execution
- Parallel stage execution
- Step-by-step execution
- Real-time logs via WebSocket
- Build history and status

### Notifications
- Telegram, Slack, Teams, Email support
- Customizable messages with variables
- Per-pipeline notification configuration
- Credential-based authentication

### Security
- JWT authentication
- Role-based access (admin/contributor)
- Credential encryption
- Secure Git operations

### User Management
- User registration (optional)
- Role management
- Profile settings
