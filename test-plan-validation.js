/**
 * Quick test to verify the subscription API payload
 */

const axios = require('axios');

console.log('🧪 Testing Subscription API with Correct Plan Values');
console.log('===================================================');

// Test the plan values that should work
const testPlans = ['ad_free', 'premium'];

async function testPlan(plan) {
  try {
    console.log(`\n📡 Testing plan: "${plan}"`);

    // This will fail with 401 (auth required) but we can see if the plan validation passes
    const response = await axios.post(
      'http://localhost:8000/api/subscription/create-checkout-session',
      {
        plan: plan,
      },
    );

    console.log(`✅ Plan "${plan}" - Success!`);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`✅ Plan "${plan}" - Plan validation passed (401 = auth required, as expected)`);
    } else if (error.response?.status === 400) {
      console.log(`❌ Plan "${plan}" - Plan validation failed (400 = bad request)`);
      console.log(`   Error: ${error.response?.data?.message || 'Unknown error'}`);
    } else {
      console.log(`❓ Plan "${plan}" - Unexpected status: ${error.response?.status}`);
    }
  }
}

async function main() {
  for (const plan of testPlans) {
    await testPlan(plan);
  }

  console.log('\n💡 Summary:');
  console.log('- If you see "Plan validation passed (401)" = Good! Plan is valid, just needs auth');
  console.log('- If you see "Plan validation failed (400)" = Bad! Plan format is wrong');
  console.log('\n🎯 Next: Test with authentication in the frontend!');
}

main().catch(console.error);
