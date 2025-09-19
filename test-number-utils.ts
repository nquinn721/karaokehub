/**
 * Test script to verify number utility functions work correctly with database decimal types
 */

import { formatNumber, formatPrice, safeAdd, toNumber } from '../client/src/utils/numberUtils';

// Simulate data coming from database - decimal fields as strings
const testData = {
  coinPackage: {
    priceUSD: '9.99', // MySQL decimal(8,2)
    coinAmount: '1000', // MySQL int
    bonusCoins: '100', // MySQL int
  },
  microphone: {
    coinPrice: '500', // MySQL int
    price: '4.99', // MySQL decimal(10,2)
  },
};

console.log('=== Testing Number Utility Functions ===');

// Test toNumber conversion
console.log('\n1. toNumber conversion:');
console.log(`  priceUSD string "9.99" -> ${toNumber(testData.coinPackage.priceUSD)}`);
console.log(`  coinAmount string "1000" -> ${toNumber(testData.coinPackage.coinAmount)}`);
console.log(`  already number 1500 -> ${toNumber(1500)}`);
console.log(`  undefined -> ${toNumber(undefined)}`);
console.log(`  invalid string "abc" -> ${toNumber('abc')}`);

// Test formatPrice
console.log('\n2. formatPrice formatting:');
console.log(`  formatPrice("9.99") -> "$${formatPrice(testData.coinPackage.priceUSD)}"`);
console.log(`  formatPrice("4.99") -> "$${formatPrice(testData.microphone.price)}"`);
console.log(`  formatPrice(19.5) -> "$${formatPrice(19.5)}"`);

// Test formatNumber
console.log('\n3. formatNumber formatting:');
console.log(`  formatNumber("1000") -> ${formatNumber(testData.coinPackage.coinAmount)}`);
console.log(`  formatNumber("500") -> ${formatNumber(testData.microphone.coinPrice)}`);
console.log(`  formatNumber(1234567) -> ${formatNumber(1234567)}`);

// Test safeAdd
console.log('\n4. safeAdd calculation:');
const totalCoins = safeAdd(testData.coinPackage.coinAmount, testData.coinPackage.bonusCoins);
console.log(`  safeAdd("1000", "100") -> ${totalCoins}`);
console.log(`  formatted: ${formatNumber(totalCoins)}`);

console.log('\n=== All tests completed ===');
