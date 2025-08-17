#!/usr/bin/env node

/**
 * Debug script to check subscription status for a user
 * Usage: node debug-subscription.js <user_email>
 */

const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'karaokehub',
  entities: ['dist/**/*.entity.js'],
  synchronize: false,
});

async function debugUserSubscription(userEmail) {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Get user
    const userRepository = AppDataSource.getRepository('User');
    const user = await userRepository.findOne({ where: { email: userEmail } });
    
    if (!user) {
      console.log('❌ User not found with email:', userEmail);
      return;
    }

    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
    });

    // Get subscription
    const subscriptionRepository = AppDataSource.getRepository('Subscription');
    const subscription = await subscriptionRepository.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      console.log('❌ No subscription found for user');
      return;
    }

    console.log('💳 Subscription details:', {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      pricePerMonth: subscription.pricePerMonth,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });

    // Check access levels
    const hasAdFree = (subscription.status === 'active' || subscription.status === 'trialing') &&
                     (subscription.plan === 'ad_free' || subscription.plan === 'premium');
    
    const hasPremium = (subscription.status === 'active' || subscription.status === 'trialing') &&
                      subscription.plan === 'premium';

    console.log('🔍 Access Analysis:');
    console.log('  - Has Ad-Free Access:', hasAdFree ? '✅ YES' : '❌ NO');
    console.log('  - Has Premium Access:', hasPremium ? '✅ YES' : '❌ NO');
    console.log('  - Subscription Status:', subscription.status);
    console.log('  - Plan Type:', subscription.plan);

    if (!hasAdFree && (subscription.plan === 'ad_free' || subscription.plan === 'premium')) {
      console.log('⚠️  ISSUE: User has ad-free plan but status prevents access');
      console.log('   - Expected Status: "active" or "trialing"');
      console.log('   - Actual Status:', subscription.status);
      
      if (subscription.status === 'past_due') {
        console.log('   - Suggestion: Payment may have failed, check Stripe dashboard');
      } else if (subscription.status === 'canceled') {
        console.log('   - Suggestion: Subscription was canceled, user needs to resubscribe');
      } else if (subscription.status === 'incomplete') {
        console.log('   - Suggestion: Payment setup incomplete, user needs to complete setup');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

// Get user email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node debug-subscription.js <user_email>');
  console.log('Example: node debug-subscription.js user@example.com');
  process.exit(1);
}

debugUserSubscription(userEmail);
