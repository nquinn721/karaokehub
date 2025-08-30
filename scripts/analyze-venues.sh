#!/bin/bash

# Pre-Migration Venue Analysis Script
# This script analyzes current venue data to prepare for migration

echo "📊 Analyzing Current Venue Data"
echo "==============================="

# Create analysis script
cat > analyze_venues.js << 'EOF'
const { createConnection } = require('typeorm');

async function analyzeVenueData() {
    const connection = await createConnection();
    
    try {
        console.log('🔍 Analyzing current show venue data...\n');
        
        // Total shows
        const totalShows = await connection.query('SELECT COUNT(*) as count FROM shows WHERE "isActive" = true');
        console.log(`📈 Total active shows: ${totalShows[0].count}`);
        
        // Shows with venue data
        const showsWithVenue = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "isActive" = true AND "venue" IS NOT NULL
        `);
        console.log(`🏢 Shows with venue names: ${showsWithVenue[0].count}`);
        
        // Shows with address data
        const showsWithAddress = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "isActive" = true AND "address" IS NOT NULL
        `);
        console.log(`📍 Shows with addresses: ${showsWithAddress[0].count}`);
        
        // Shows with coordinates
        const showsWithCoords = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "isActive" = true AND "lat" IS NOT NULL AND "lng" IS NOT NULL
        `);
        console.log(`🗺️  Shows with coordinates: ${showsWithCoords[0].count}`);
        
        console.log('\n🎯 Unique Venue Analysis (by address):');
        
        // Unique venues by address (our primary key)
        const uniqueByAddress = await connection.query(`
            SELECT 
                COUNT(*) as total_unique_addresses,
                COUNT(CASE WHEN "venue" IS NOT NULL THEN 1 END) as with_venue_names
            FROM (
                SELECT DISTINCT "address", "city", "state"
                FROM shows 
                WHERE "isActive" = true 
                  AND "address" IS NOT NULL 
                  AND "city" IS NOT NULL 
                  AND "state" IS NOT NULL
            ) unique_addresses
        `);
        
        console.log(`   📍 Unique address combinations: ${uniqueByAddress[0].total_unique_addresses}`);
        console.log(`   🏢 With venue names: ${uniqueByAddress[0].with_venue_names}`);
        
        // Sample of venue duplicates by address
        console.log('\n🔍 Sample address analysis:');
        const addressSamples = await connection.query(`
            SELECT 
                "address",
                "city", 
                "state",
                COUNT(*) as show_count,
                COUNT(DISTINCT "venue") as unique_venue_names,
                array_agg(DISTINCT "venue") as venue_names
            FROM shows 
            WHERE "isActive" = true 
              AND "address" IS NOT NULL 
              AND "city" IS NOT NULL 
              AND "state" IS NOT NULL
            GROUP BY "address", "city", "state"
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10
        `);
        
        addressSamples.forEach((sample, index) => {
            console.log(`   ${index + 1}. ${sample.address}, ${sample.city}, ${sample.state}`);
            console.log(`      Shows: ${sample.show_count}, Venue names: ${sample.unique_venue_names}`);
            console.log(`      Names: ${sample.venue_names.filter(name => name).join(', ')}`);
            console.log('');
        });
        
        // Problematic cases
        console.log('⚠️  Potential Issues:');
        
        // Multiple venue names for same address
        const multipleNames = await connection.query(`
            SELECT COUNT(*) as count
            FROM (
                SELECT "address", "city", "state"
                FROM shows 
                WHERE "isActive" = true 
                  AND "address" IS NOT NULL 
                  AND "city" IS NOT NULL 
                  AND "state" IS NOT NULL
                  AND "venue" IS NOT NULL
                GROUP BY "address", "city", "state"
                HAVING COUNT(DISTINCT "venue") > 1
            ) multiple_venue_names
        `);
        console.log(`   🏢 Addresses with multiple venue names: ${multipleNames[0].count}`);
        
        // Shows without complete address data
        const incompleteAddress = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "isActive" = true 
              AND ("address" IS NULL OR "city" IS NULL OR "state" IS NULL)
        `);
        console.log(`   📍 Shows with incomplete address data: ${incompleteAddress[0].count}`);
        
        // Shows without any venue identifier
        const noVenueData = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "isActive" = true 
              AND "venue" IS NULL 
              AND ("address" IS NULL OR "city" IS NULL OR "state" IS NULL)
        `);
        console.log(`   ❌ Shows without any venue identifier: ${noVenueData[0].count}`);
        
        console.log('\n🎯 Migration Strategy:');
        console.log('   1. Create venues using DISTINCT ON (address, city, state)');
        console.log('   2. Choose first venue name alphabetically for each address');
        console.log('   3. Preserve all original data in legacy columns');
        console.log('   4. Link shows to venues by address matching');
        console.log('   5. Handle incomplete data with "Unknown Venue" fallback');
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
    } finally {
        await connection.close();
    }
}

analyzeVenueData();
EOF

node analyze_venues.js
rm analyze_venues.js
