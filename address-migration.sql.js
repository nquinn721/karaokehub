#!/usr/bin/env node

/**
 * Database migration script to fix address parsing
 * This script generates SQL commands to update existing show records
 */

// Generate proper SQL update statements with state inference
const addresses = [
  { current: "8010 Surf Drive Panama City Beach", address: "8010 Surf Drive", city: "Panama City Beach", state: "FL" },
  { current: "8711 Sancus Blvd. Columbus, Ohio", address: "8711 Sancus Blvd.", city: "Columbus", state: "OH" },
  { current: "1930 Lewis Turner Blvd Fort Walton Beach", address: "1930 Lewis Turner Blvd", city: "Fort Walton Beach", state: "FL" },
  { current: "1112 North High Street Columbus", address: "1112 North High Street", city: "Columbus", state: "OH" },
  { current: "Front Beach Road Panama City Beach", address: "Front Beach Road", city: "Panama City Beach", state: "FL" },
  { current: "630 North High Street Columbus, Ohio", address: "630 North High Street", city: "Columbus", state: "OH" },
  { current: "8939 South Old State Road Lewis Center, Ohio", address: "8939 South Old State Road", city: "Lewis Center", state: "OH" },
  { current: "59 Potter Street Delaware", address: "59 Potter Street", city: "Delaware", state: "OH" }
];

console.log('-- Database Migration: Fix Address Parsing');
console.log('-- Generated on:', new Date().toISOString());
console.log('-- Purpose: Separate address, city, and state fields\n');

addresses.forEach(({ current, address, city, state }) => {
  console.log(`-- Fix: "${current}"`);
  console.log(`UPDATE shows SET`);
  console.log(`  address = '${address.replace(/'/g, "''")}',`);
  console.log(`  city = '${city.replace(/'/g, "''")}',`);
  console.log(`  state = '${state}'`);
  console.log(`WHERE address = '${current.replace(/'/g, "''")}';`);
  console.log('');
});

console.log('-- Verify the changes');
console.log('SELECT id, address, city, state, venue FROM shows WHERE city IS NOT NULL ORDER BY city, state;');
