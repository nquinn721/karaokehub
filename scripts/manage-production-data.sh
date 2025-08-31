#!/bin/bash

# Safe Production Data Management Script
# Prevents accidental overwriting of user data in production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUPS_DIR="$PROJECT_ROOT/backups"
EXPORTS_DIR="$PROJECT_ROOT/exports"

# Ensure directories exist
mkdir -p "$BACKUPS_DIR" "$EXPORTS_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if we're in production
check_environment() {
    if [[ "$NODE_ENV" == "production" ]] || [[ "$DATABASE_URL" == *"production"* ]]; then
        print_warning "PRODUCTION ENVIRONMENT DETECTED!"
        echo -e "${YELLOW}Are you sure you want to continue? This will affect production data.${NC}"
        read -p "Type 'CONFIRM' to proceed: " confirmation
        if [[ "$confirmation" != "CONFIRM" ]]; then
            print_error "Operation cancelled for safety"
            exit 1
        fi
    fi
}

# Function to create a full backup before any operation
create_safety_backup() {
    print_status "Creating safety backup of protected tables..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUPS_DIR/safety_backup_$TIMESTAMP.sql"
    
    # Backup only user-critical tables
    PROTECTED_TABLES="users user_sessions user_feature_overrides favorite_shows feedback show_reviews"
    
    if command -v mysqldump &> /dev/null; then
        mysqldump \
            --host="${DB_HOST:-localhost}" \
            --port="${DB_PORT:-3306}" \
            --user="${DB_USER:-root}" \
            ${DB_PASSWORD:+--password="$DB_PASSWORD"} \
            --single-transaction \
            --no-create-db \
            "${DB_NAME:-karaokehub}" \
            $PROTECTED_TABLES > "$BACKUP_FILE"
        
        print_success "Safety backup created: $BACKUP_FILE"
    else
        print_warning "mysqldump not found, skipping safety backup"
    fi
}

# Function to export safe data from local
export_safe_data() {
    print_status "Exporting safe data from local database..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    EXPORT_FILE="$EXPORTS_DIR/safe_data_export_$TIMESTAMP.sql"
    
    # Use our Node.js export script
    cd "$PROJECT_ROOT"
    node scripts/safe-data-export.js --output "$EXPORT_FILE"
    
    print_success "Safe data exported to: $EXPORT_FILE"
    echo "$EXPORT_FILE"  # Return the filename
}

# Function to import safe data
# Function to import data safely
import_data() {
    local source_file="$1"
    local dry_run="$2"
    local tables="$3"
    
    if [[ ! -f "$source_file" ]]; then
        print_error "Source file not found: $source_file"
        exit 1
    fi
    
    print_status "Starting safe data import..."
    print_warning "This will affect: venues, shows, djs, vendors, parsed_schedules"
    print_status "Protected tables (users, sessions, etc.) will NOT be touched"
    
    local import_cmd="node $SCRIPT_DIR/safe-data-import-typeorm.js --source $source_file"
    
    if [[ "$dry_run" == "true" ]]; then
        import_cmd="$import_cmd --dry-run"
        print_status "DRY RUN MODE - No changes will be made"
    fi
    
    if [[ -n "$tables" ]]; then
        import_cmd="$import_cmd --tables $tables"
        print_status "Importing only: $tables"
    fi
    
    check_environment
    
    if [[ "$dry_run" != "true" ]]; then
        print_status "Creating backup first..."
        backup_production_data
    fi
    
    print_status "Executing: $import_cmd"
    if eval "$import_cmd"; then
        if [[ "$dry_run" == "true" ]]; then
            print_success "Dry run completed successfully"
        else
            print_success "Data import completed successfully"
        fi
    else
        print_error "Import failed"
        exit 1
    fi
}

# Function to show current database statistics
show_database_stats() {
    print_status "Current Database Statistics:"
    
    cat << 'EOF' | mysql \
        --host="${DB_HOST:-localhost}" \
        --port="${DB_PORT:-3306}" \
        --user="${DB_USER:-root}" \
        ${DB_PASSWORD:+--password="$DB_PASSWORD"} \
        "${DB_NAME:-karaokehub}" \
        --batch --silent

SELECT 
    'Users' as 'Table',
    COUNT(*) as 'Count',
    '🔒 PROTECTED' as 'Status'
FROM users
UNION ALL
SELECT 
    'Venues' as 'Table',
    COUNT(*) as 'Count', 
    '✅ Safe to update' as 'Status'
FROM venues
UNION ALL
SELECT 
    'Shows' as 'Table',
    COUNT(*) as 'Count',
    '✅ Safe to update' as 'Status' 
FROM shows
UNION ALL
SELECT 
    'DJs' as 'Table',
    COUNT(*) as 'Count',
    '✅ Safe to update' as 'Status'
FROM djs
UNION ALL
SELECT 
    'Vendors' as 'Table',
    COUNT(*) as 'Count',
    '✅ Safe to update' as 'Status'
FROM vendors
UNION ALL
SELECT 
    'Favorites' as 'Table',
    COUNT(*) as 'Count',
    '🔒 PROTECTED' as 'Status'
FROM favorite_shows
UNION ALL
SELECT 
    'Feedback' as 'Table', 
    COUNT(*) as 'Count',
    '🔒 PROTECTED' as 'Status'
FROM feedback;
EOF
}

# Function to validate environment variables
validate_env() {
    if [[ -z "$DB_NAME" ]]; then
        print_warning "DB_NAME not set, using default: karaokehub"
    fi
    
    if [[ -z "$DB_USER" ]]; then
        print_warning "DB_USER not set, using default: root"
    fi
    
    if [[ -z "$DB_HOST" ]]; then
        print_warning "DB_HOST not set, using default: localhost"
    fi
}

# Main menu function
show_menu() {
    echo
    echo "🔒 Safe Production Data Management"
    echo "=================================="
    echo "1. Show database statistics"
    echo "2. Export safe data from local"
    echo "3. Import safe data (dry run)"
    echo "4. Import safe data (LIVE - affects database)"
    echo "5. Create safety backup"
    echo "6. Exit"
    echo
}

# Main script logic
main() {
    print_status "Safe Production Data Management Tool"
    print_status "======================================"
    
    validate_env
    check_environment
    
    while true; do
        show_menu
        read -p "Choose an option (1-6): " choice
        
        case $choice in
            1)
                show_database_stats
                ;;
            2)
                export_file=$(export_safe_data)
                print_success "Export completed: $export_file"
                ;;
            3)
                read -p "Enter path to import file: " import_file
                import_safe_data "$import_file" "true"
                ;;
            4)
                print_warning "This will modify the database!"
                read -p "Enter path to import file: " import_file
                create_safety_backup
                import_safe_data "$import_file" "false"
                ;;
            5)
                create_safety_backup
                ;;
            6)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-6."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
