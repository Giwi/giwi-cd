# GiwiCD - CI/CD Engine

> A modern, self-hosted CI/CD platform built with Node.js, Express, and Angular

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Angular](https://img.shields.io/badge/Angular-20-red)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## Features

- **Pipeline Management** - Create and manage CI/CD pipelines with multiple stages
- **Git Integration** - Automatic git checkout with SSH/HTTPS credential support
- **Real-time Builds** - Live build logs via WebSocket
- **User Management** - Role-based access control (Admin/Contributor)
- **Credential Manager** - Secure storage for SSH keys and tokens
- **Theme Support** - Light and dark mode with modern UI
- **Responsive Design** - Works on desktop and mobile

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

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

```bash
# Terminal 1 - Backend (port 3000)
cd backend && npm start

# Terminal 2 - Frontend (port 4200)
cd frontend && npm start
```

Open http://localhost:4200 and login with:
- **Email**: admin@giwicd.local
- **Password**: admin123

## Documentation

Detailed documentation is available in [docs/README.md](docs/README.md).

## Project Structure

```
giwicd/
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── models/           # Data models
│   │   ├── services/         # Build executor, Git service
│   │   └── middleware/       # Auth, error handling
│   └── data/db.json          # JSON database
├── frontend/                 # Angular SPA
│   └── src/app/
│       ├── pages/            # Page components
│       ├── services/         # API, Auth, WebSocket
│       └── guards/           # Route protection
└── docs/                    # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Database | LowDB (JSON) |
| Auth | JWT, bcrypt |
| Real-time | WebSocket |
| Frontend | Angular 20 |
| Styling | SCSS, CSS Variables |

## License

MIT
