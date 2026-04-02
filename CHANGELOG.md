# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-02

### Added

- **Pipeline Stage/Step Reordering** - Drag & drop functionality to reorder stages and steps in pipelines
- **Build History Auto-refresh** - Build list automatically updates via WebSocket when builds start or complete
- **Stage Progress Visualization** - Horizontal pill-based progress bar showing build stages with colored status indicators
- **Build Retention** - New `keepBuilds` parameter in pipeline settings to control how many builds are kept per pipeline
- **Dynamic Duration Variable** - `{{DURATION}}` variable is now calculated dynamically during build execution (not at the end)
- **Notification During Build** - Notification steps are now executed when reached in the pipeline, not just at the end
- **API Authentication** - All API endpoints (except auth, dashboard, webhooks) now require JWT authentication by default
- **SEO Improvements** - Added meta tags, Open Graph, Twitter cards, and canonical URLs
- **Credential Types for Notifications** - Support for Telegram, Slack, Teams, and Email credentials in the credential manager

### Changed

- **Notification Execution** - Notifications are now triggered when their step is executed in the pipeline, allowing for mid-build notifications
- **WebSocket URL** - Frontend now uses dynamic `window.location.host` instead of hardcoded localhost for WebSocket connection

### Fixed

- **Card Border Radius** - Fixed inconsistent border radius between card headers and card bodies
- **Notification Step Navigation** - Fixed redirect issue when editing notification steps (now goes to notifications list instead of credentials)
- **Telegram Chat ID** - Improved error handling for Telegram bot communication

### Security

- Added authentication middleware to all protected API routes
- Public routes are now explicitly defined (auth, dashboard, webhooks)

### Documentation

- Updated README with new features
- Added SEO meta tags to index.html
- Added dynamic meta tag updates in landing component
- Updated docs/README.md with latest feature descriptions