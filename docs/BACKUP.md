# Backup & Restore Guide

## Database Location

The SQLite database is stored at `backend/data/db.db`.

## Backup

### Manual Backup

```bash
# Copy the database file
cp backend/data/db.db /path/to/backup/db-$(date +%Y%m%d).db

# Or create a compressed archive
tar -czf giwicd-backup-$(date +%Y%m%d).tar.gz backend/data/
```

### Automated Backup (Cron)

```bash
# Add to crontab - run daily at 2am
0 2 * * * cp /home/giwicd/backend/data/db.db /backup/giwicd-db-$(date +\%Y\%m\%d).db
```

### Docker Volume Backup

```bash
# If using Docker volumes
docker volume ls | grep giwicd
docker run --rm -v giwicd_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/giwicd-db.tar.gz /data
```

## Restore

### From File

```bash
# Stop the application
# Copy backup to data directory
cp /path/to/backup/db-20240101.db backend/data/db.db
# Start the application
```

### From Docker Backup

```bash
# Extract from archive
tar -xzf giwicd-backup.tar.gz

# Restore to volume
docker run --rm -v giwicd_backend_data:/data -v $(pwd)/backend/data:/backup alpine cp /backup/db.db /data/
```

## Important Files to Backup

1. `backend/data/db.db` - Main database
2. `backend/data/db.db-wal` - SQLite WAL file (if using WAL mode)
3. `backend/data/db.db-shm` - SQLite shared memory (if using WAL mode)

## Environment Backup

Save your environment variables:

```bash
# Export environment (exclude secrets)
env | grep -E "^(PORT|JWT_|NODE_|FRONTEND_)" > .env.backup
```

## Disaster Recovery Checklist

1. Stop all services
2. Create a fresh database if needed: `touch backend/data/db.db`
3. Restore database file
4. Verify permissions: `chmod 664 backend/data/db.db`
5. Start services
6. Verify application health
7. Test login and basic functionality
