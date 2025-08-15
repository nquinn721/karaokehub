const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPrices() {
  try {
    console.log('Creating Stripe prices...');

    // Create Ad-Free price
    const adFreePrice = await stripe.prices.create({
      product: 'prod_SrqIqJKRC7Aqem', // Your existing Ad-Free product ID
      unit_amount: 99, // $0.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Ad-Free Monthly',
    });

    // Create Premium price
    const premiumPrice = await stripe.prices.create({
      product: 'prod_SrqJ9the3Edp14', // Your existing Premium product ID
      unit_amount: 299, // $2.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Premium Monthly',
    });

    console.log('\n✅ Prices created successfully!');
    console.log('\nUpdate your .env file with these Price IDs:');
    console.log(`STRIPE_AD_FREE_PRICE_ID=${adFreePrice.id}`);
    console.log(`STRIPE_PREMIUM_PRICE_ID=${premiumPrice.id}`);

    console.log('\nPrice Details:');
    console.log('Ad-Free Price:', {
      id: adFreePrice.id,
      amount: adFreePrice.unit_amount / 100,
      currency: adFreePrice.currency,
      interval: adFreePrice.recurring.interval,
    });

    console.log('Premium Price:', {
      id: premiumPrice.id,
      amount: premiumPrice.unit_amount / 100,
      currency: premiumPrice.currency,
      interval: premiumPrice.recurring.interval,
    });
  } catch (error) {
    console.error('Error creating prices:', error.message);

    if (error.code === 'resource_missing') {
      console.log('\n❌ Product not found. Please verify your Product IDs in Stripe Dashboard.');
    }
  }
}

createPrices();
