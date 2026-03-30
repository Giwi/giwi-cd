# GiwiCD Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GiwiCD                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Frontend   │      │    Backend    │      │   Workers    │ │
│  │   (Angular)  │◄────►│   (Express)   │◄────►│  (Builds)    │ │
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
│   ├── POST   /register        - User registration
│   ├── GET    /me              - Get current user
│   └── PUT    /password        - Change password
│
├── /pipelines
│   ├── GET    /                - List all pipelines
│   ├── GET    /:id             - Get pipeline details
│   ├── POST   /                - Create pipeline
│   ├── PUT    /:id             - Update pipeline
│   ├── DELETE /:id             - Delete pipeline
│   └── POST  /:id/trigger      - Trigger build
│
├── /builds
│   ├── GET    /                - List all builds
│   ├── GET    /:id             - Get build details
│   ├── GET    /:id/logs        - Get build logs
│   └── POST  /:id/cancel       - Cancel build
│
├── /credentials
│   ├── GET    /                - List credentials
│   ├── POST   /                - Create credential
│   └── DELETE /:id             - Delete credential
│
├── /webhooks
│   ├── GET    /webhook/:id     - Trigger webhook
│   └── POST   /webhook/:id     - Push event webhook
│
└── /admin
    ├── GET    /users           - List users
    ├── GET    /settings        - Get settings
    └── PUT    /settings        - Update settings
```

## Build Pipeline Execution

```
Pipeline Trigger
      │
      ▼
┌─────────────────┐
│  Git Checkout   │
│  (clone/pull)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Stage 1      │────►│    Stage 2      │
│   (Build)       │     │    (Test)       │
└────────┬────────┘     └────────┬────────┘
         │                      │
         ▼                      ▼
   ┌─────────┐           ┌─────────┐
   │ Step 1  │           │ Step 1  │
   └─────────┘           └─────────┘
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
│       ├── command
│       └── [notification fields]
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
├── description
├── provider
├── createdAt
└── updatedAt
```

## WebSocket Events

```
Server ─────────────────────────────► Client

build:log      - Log entry from build
build:stage    - Stage started
build:complete - Build finished
build:cancelled - Build cancelled
```

## Technology Stack

```
Frontend                    Backend
─────────                  ──────
Angular 20                 Node.js 18+
TypeScript                  Express.js
Bootstrap 5                 JSON DB (lowdb)
Bootstrap Icons             JWT Auth
SCSS                        WebSocket
```
