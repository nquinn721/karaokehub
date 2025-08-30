#!/bin/bash

# Pre-Migration Venue Analysis
# This script analyzes current venue data before running the venue-show separation

echo "🔍 Pre-Migration Venue Analysis"
echo "=============================="

# Create analysis script
cat > analyze_venues.js << 'EOF'
const { createConnection } = require('typeorm');

async function analyzeVenues() {
    const connection = await createConnection();
    
    try {
        console.log('📊 Current Show Data Analysis:');
        console.log('==============================\n');
        
        // Total shows
        const totalShows = await connection.query(`
            SELECT COUNT(*) as count FROM shows WHERE "isActive" = true
        `);
        console.log(`📈 Total active shows: ${totalShows[0].count}`);
        
        // Shows with venue names
        const showsWithVenues = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "venue" IS NOT NULL AND "venue" != '' AND "isActive" = true
        `);
        console.log(`🏢 Shows with venue names: ${showsWithVenues[0].count}`);
        
        // Shows with addresses
        const showsWithAddresses = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "address" IS NOT NULL AND "address" != '' AND "isActive" = true
        `);
        console.log(`📍 Shows with addresses: ${showsWithAddresses[0].count}`);
        
        // Unique venues by address (our primary grouping strategy)
        const uniqueByAddress = await connection.query(`
            SELECT COUNT(*) as count FROM (
                SELECT DISTINCT "address", "city", "state" 
                FROM shows 
                WHERE "address" IS NOT NULL AND "address" != '' AND "isActive" = true
            ) as unique_addresses
        `);
        console.log(`🏠 Unique addresses: ${uniqueByAddress[0].count}`);
        
        // Unique venues by name+city (fallback for shows without addresses)
        const uniqueByNameCity = await connection.query(`
            SELECT COUNT(*) as count FROM (
                SELECT DISTINCT "venue", "city", "state" 
                FROM shows 
                WHERE ("address" IS NULL OR "address" = '') 
                AND "venue" IS NOT NULL AND "venue" != '' 
                AND "isActive" = true
            ) as unique_name_city
        `);
        console.log(`🏢 Unique venue names (no address): ${uniqueByNameCity[0].count}`);
        
        // Shows with coordinates
        const showsWithCoords = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL AND "isActive" = true
        `);
        console.log(`🗺️  Shows with coordinates: ${showsWithCoords[0].count}`);
        
        console.log('\n📊 Venue Statistics by Address:');
        console.log('===============================');
        
        // Top addresses by show count
        const topAddresses = await connection.query(`
            SELECT "address", "city", "state", 
                   array_agg(DISTINCT "venue") as venue_names,
                   COUNT(*) as show_count
            FROM shows 
            WHERE "address" IS NOT NULL AND "address" != '' AND "isActive" = true
            GROUP BY "address", "city", "state"
            ORDER BY COUNT(*) DESC
            LIMIT 10
        `);
        
        topAddresses.forEach((addr, index) => {
            const venueNames = addr.venue_names ? addr.venue_names.filter(Boolean).join(', ') : 'No names';
            console.log(`${index + 1}. ${addr.address}, ${addr.city}, ${addr.state}`);
            console.log(`   Shows: ${addr.show_count}, Venue names: ${venueNames}\n`);
        });
        
        console.log('🔧 Potential Issues:');
        console.log('===================');
        
        // Shows without venue names or addresses
        const problematicShows = await connection.query(`
            SELECT COUNT(*) as count FROM shows 
            WHERE ("venue" IS NULL OR "venue" = '')
            AND ("address" IS NULL OR "address" = '')
            AND "isActive" = true
        `);
        console.log(`❌ Shows without venue name or address: ${problematicShows[0].count}`);
        
        // Potential duplicates (same address, different venue names)
        const potentialDuplicates = await connection.query(`
            SELECT "address", "city", "state", 
                   array_agg(DISTINCT "venue") as venue_names,
                   COUNT(DISTINCT "venue") as venue_count
            FROM shows 
            WHERE "address" IS NOT NULL AND "address" != '' 
            AND "venue" IS NOT NULL AND "venue" != ''
            AND "isActive" = true
            GROUP BY "address", "city", "state"
            HAVING COUNT(DISTINCT "venue") > 1
            ORDER BY COUNT(DISTINCT "venue") DESC
            LIMIT 5
        `);
        
        if (potentialDuplicates.length > 0) {
            console.log(`⚠️  Addresses with multiple venue names (will use first name):`);
            potentialDuplicates.forEach((dup, index) => {
                const venueNames = dup.venue_names.join(', ');
                console.log(`${index + 1}. ${dup.address}: ${venueNames}`);
            });
        } else {
            console.log(`✅ No addresses with conflicting venue names`);
        }
        
        console.log('\n🎯 Migration Strategy:');
        console.log('=====================');
        console.log('1. Group shows by address (primary key for venues)');
        console.log('2. Use most common venue name for each address');
        console.log('3. Average coordinates for venues with same address');
        console.log('4. Handle shows without addresses separately (group by venue name + city)');
        console.log('5. Link all shows to appropriate venues\n');
        
        const estimatedVenues = parseInt(uniqueByAddress[0].count) + parseInt(uniqueByNameCity[0].count);
        console.log(`📊 Estimated venues to be created: ${estimatedVenues}`);
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
    } finally {
        await connection.close();
    }
}

analyzeVenues();
EOF

node analyze_venues.js
rm analyze_venues.js
