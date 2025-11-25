#!/bin/bash

# Database Backup Script for TrustBridge
# Add to crontab: 0 2 * * * /path/to/backup-db.sh

BACKUP_DIR="/opt/backups"
DB_PATH="/opt/trustbridge/data/reports.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/reports_$DATE.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Copy database file
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "✅ Database backed up to: $BACKUP_FILE"
    
    # Compress old backups (older than 1 day)
    find "$BACKUP_DIR" -name "reports_*.db" -mtime +1 -exec gzip {} \;
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "reports_*.db.gz" -mtime +7 -delete
    
    echo "✅ Backup completed successfully"
else
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

