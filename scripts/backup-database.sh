#!/bin/bash

# Database Backup Script
# Creates timestamped backups of the local Supabase database
# Format: backup/db/yyMMdd_HHmm_database_backup.sql

# Get the database URL from supabase status
DB_URL="postgresql://postgres:postgres@localhost:54342/postgres"

# Create backup directory if it doesn't exist
BACKUP_DIR="backup/db"
mkdir -p "$BACKUP_DIR"

# Generate timestamp in yyMMdd_HHmm format
TIMESTAMP=$(date +"%y%m%d_%H%M")
BACKUP_FILE="$BACKUP_DIR/${TIMESTAMP}_database_backup.sql"

echo "🔄 Starting database backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo "🕐 Timestamp: $TIMESTAMP"

# Create the backup using pg_dump
# --clean: Include DROP statements
# --if-exists: Use IF EXISTS for DROP statements
# --create: Include CREATE DATABASE statement
# --no-owner: Skip ownership commands
# --no-privileges: Skip privilege/grant commands
pg_dump "$DB_URL" \
  --clean \
  --if-exists \
  --create \
  --no-owner \
  --no-privileges \
  --verbose \
  > "$BACKUP_FILE" 2> "${BACKUP_FILE}.log"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Get file size
    FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    
    echo "✅ Backup completed successfully!"
    echo "📄 Backup file: $BACKUP_FILE"
    echo "📊 File size: $FILE_SIZE"
    
    # Remove the log file if backup was successful
    rm -f "${BACKUP_FILE}.log"
    
    # Show recent backups
    echo ""
    echo "📚 Recent backups:"
    ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null | head -5 | awk '{print "   " $9 " (" $5 ")"}'
else
    echo "❌ Backup failed! Check ${BACKUP_FILE}.log for details"
    exit 1
fi

echo ""
echo "💡 To restore from this backup:"
echo "   psql $DB_URL < $BACKUP_FILE"