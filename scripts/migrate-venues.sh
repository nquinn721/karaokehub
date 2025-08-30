#!/bin/bash

# Venue-Show Migration Script
# This script helps migrate from the old venue-in-show structure to the new venue-show relationship

echo "🏢 KaraokeHub Venue-Show Migration Tool"
echo "=================================="

# Function to check if TypeORM CLI is available
check_typeorm() {
    if ! command -v npx typeorm &> /dev/null; then
        echo "❌ TypeORM CLI not found. Please install it first:"
        echo "   npm install -g typeorm"
        exit 1
    fi
}

# Function to run migration
run_migration() {
    echo "📊 Running venue-show separation migration..."
    npx typeorm migration:run
    if [ $? -eq 0 ]; then
        echo "✅ Database migration completed successfully"
    else
        echo "❌ Migration failed. Check the logs above."
        exit 1
    fi
}

# Function to migrate legacy data
migrate_legacy_data() {
    echo "🔄 Migrating legacy venue data from shows..."
    echo "This will create venues from existing show data and link them."
    
    # Create a temporary migration script
    cat > migrate_venues.js << 'EOF'
const { createConnection } = require('typeorm');

async function migrateLegacyData() {
    const connection = await createConnection();
    
    try {
        // Get shows without venueId but with legacy venue data
        const showsToMigrate = await connection.query(`
            SELECT id, "legacyVenue", "legacyAddress", "legacyCity", "legacyState", 
                   "legacyZip", "legacyLat", "legacyLng", "legacyVenuePhone", "legacyVenueWebsite"
            FROM shows 
            WHERE "venueId" IS NULL 
            AND "legacyVenue" IS NOT NULL
        `);
        
        console.log(`Found ${showsToMigrate.length} shows to migrate`);
        
        let venuesCreated = 0;
        let showsLinked = 0;
        
        for (const show of showsToMigrate) {
            // Check if venue already exists
            const existingVenue = await connection.query(`
                SELECT id FROM venues 
                WHERE LOWER(name) = LOWER($1)
                AND (city = $2 OR (city IS NULL AND $2 IS NULL))
                AND (state = $3 OR (state IS NULL AND $3 IS NULL))
                LIMIT 1
            `, [show.legacyVenue, show.legacyCity, show.legacyState]);
            
            let venueId;
            
            if (existingVenue.length > 0) {
                venueId = existingVenue[0].id;
            } else {
                // Create new venue
                const newVenue = await connection.query(`
                    INSERT INTO venues (name, address, city, state, zip, lat, lng, phone, website)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                `, [
                    show.legacyVenue,
                    show.legacyAddress,
                    show.legacyCity,
                    show.legacyState,
                    show.legacyZip,
                    show.legacyLat,
                    show.legacyLng,
                    show.legacyVenuePhone,
                    show.legacyVenueWebsite
                ]);
                
                venueId = newVenue[0].id;
                venuesCreated++;
            }
            
            // Link show to venue
            await connection.query(`
                UPDATE shows SET "venueId" = $1 WHERE id = $2
            `, [venueId, show.id]);
            
            showsLinked++;
        }
        
        console.log(`✅ Migration complete:`);
        console.log(`   - ${venuesCreated} venues created`);
        console.log(`   - ${showsLinked} shows linked to venues`);
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    } finally {
        await connection.close();
    }
}

migrateLegacyData();
EOF

    node migrate_venues.js
    rm migrate_venues.js
}

# Function to verify migration
verify_migration() {
    echo "🔍 Verifying migration results..."
    
    cat > verify_migration.js << 'EOF'
const { createConnection } = require('typeorm');

async function verifyMigration() {
    const connection = await createConnection();
    
    try {
        // Check venue count
        const venueCount = await connection.query('SELECT COUNT(*) as count FROM venues');
        console.log(`📊 Total venues: ${venueCount[0].count}`);
        
        // Check shows linked to venues
        const linkedShows = await connection.query(`
            SELECT COUNT(*) as count FROM shows WHERE "venueId" IS NOT NULL
        `);
        console.log(`🔗 Shows linked to venues: ${linkedShows[0].count}`);
        
        // Check shows without venues
        const unlinkedShows = await connection.query(`
            SELECT COUNT(*) as count FROM shows WHERE "venueId" IS NULL AND "isActive" = true
        `);
        console.log(`⚠️  Active shows without venues: ${unlinkedShows[0].count}`);
        
        // Sample venue data
        const sampleVenues = await connection.query(`
            SELECT v.name, v.city, v.state, COUNT(s.id) as show_count
            FROM venues v
            LEFT JOIN shows s ON v.id = s."venueId"
            GROUP BY v.id, v.name, v.city, v.state
            ORDER BY show_count DESC
            LIMIT 5
        `);
        
        console.log('\n🏆 Top venues by show count:');
        sampleVenues.forEach(venue => {
            console.log(`   ${venue.name} (${venue.city}, ${venue.state}): ${venue.show_count} shows`);
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error);
    } finally {
        await connection.close();
    }
}

verifyMigration();
EOF

    node verify_migration.js
    rm verify_migration.js
}

# Function to cleanup legacy columns (USE WITH CAUTION)
cleanup_legacy_columns() {
    echo "⚠️  WARNING: This will permanently remove legacy venue columns from shows table!"
    echo "   Make sure you have a backup and the migration is working correctly."
    read -p "   Type 'CONFIRM' to proceed: " confirmation
    
    if [ "$confirmation" != "CONFIRM" ]; then
        echo "❌ Cleanup cancelled."
        return
    fi
    
    echo "🧹 Removing legacy venue columns..."
    
    cat > cleanup_legacy.js << 'EOF'
const { createConnection } = require('typeorm');

async function cleanupLegacyColumns() {
    const connection = await createConnection();
    
    try {
        const columnsToRemove = [
            'legacyVenue', 'legacyAddress', 'legacyCity', 'legacyState', 
            'legacyZip', 'legacyLat', 'legacyLng', 'legacyVenuePhone', 'legacyVenueWebsite'
        ];
        
        for (const column of columnsToRemove) {
            await connection.query(`ALTER TABLE shows DROP COLUMN IF EXISTS "${column}"`);
            console.log(`✅ Removed column: ${column}`);
        }
        
        console.log('🎉 Legacy columns cleanup complete!');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    } finally {
        await connection.close();
    }
}

cleanupLegacyColumns();
EOF

    node cleanup_legacy.js
    rm cleanup_legacy.js
}

# Main menu
case "$1" in
    "migrate")
        check_typeorm
        run_migration
        migrate_legacy_data
        verify_migration
        echo "🎉 Migration complete! Review the results above."
        ;;
    "verify")
        verify_migration
        ;;
    "cleanup")
        cleanup_legacy_columns
        ;;
    *)
        echo "Usage: $0 {migrate|verify|cleanup}"
        echo ""
        echo "Commands:"
        echo "  migrate  - Run full migration (database + data)"
        echo "  verify   - Check migration results"
        echo "  cleanup  - Remove legacy columns (DANGEROUS)"
        echo ""
        echo "Example: ./migrate-venues.sh migrate"
        exit 1
        ;;
esac
