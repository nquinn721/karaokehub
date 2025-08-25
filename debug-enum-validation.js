/**
 * Debug what the SubscriptionPlan enum actually contains
 */

// Simulate the backend enum
const SubscriptionPlan = {
  FREE: 'free',
  AD_FREE: 'ad_free',
  PREMIUM: 'premium',
};

console.log('🔍 SubscriptionPlan enum analysis:');
console.log('================================');
console.log('');

console.log('Enum object:', SubscriptionPlan);
console.log('');

console.log('Object.keys(SubscriptionPlan):', Object.keys(SubscriptionPlan));
console.log('Object.values(SubscriptionPlan):', Object.values(SubscriptionPlan));
console.log('');

console.log('✅ Valid plan values (what backend accepts):');
Object.values(SubscriptionPlan).forEach((plan) => {
  console.log(`   - "${plan}"`);
});

console.log('');
console.log('❌ Invalid plan values (what would cause 400 error):');
console.log('   - "AD_FREE" (enum key, not value)');
console.log('   - "PREMIUM" (enum key, not value)');
console.log('   - "FREE" (enum key, not value)');
console.log('');

console.log('🧪 Testing plan validation:');
const testPlans = ['ad_free', 'premium', 'free', 'AD_FREE', 'PREMIUM', 'invalid'];

testPlans.forEach((plan) => {
  const isValid = Object.values(SubscriptionPlan).includes(plan);
  const status = isValid ? '✅' : '❌';
  console.log(`   ${status} "${plan}": ${isValid ? 'VALID' : 'INVALID'}`);
});

console.log('');
console.log('💡 Conclusion:');
console.log('   Frontend should send: "ad_free" or "premium"');
console.log('   Frontend should NOT send: "AD_FREE" or "PREMIUM"');
