const mysql = require('mysql2/promise');

async function simulateSuccessfulDjSubscription() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    console.log('🎯 Simulating successful DJ subscription...');

    // Get the first active user (you can change this to your specific user)
    const [users] = await conn.execute(`
      SELECT id, name, email FROM users 
      WHERE stripeCustomerId IS NOT NULL 
      ORDER BY updatedAt DESC 
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ No users with Stripe customer ID found');
      return;
    }

    const user = users[0];
    console.log(`👤 Found user: ${user.name} (${user.email})`);

    // Get the first available DJ
    const [djs] = await conn.execute(`
      SELECT id, name FROM djs 
      WHERE isActive = true 
      ORDER BY name ASC 
      LIMIT 1
    `);

    if (djs.length === 0) {
      console.log('❌ No active DJs found');
      return;
    }

    const dj = djs[0];
    console.log(`🎵 Selected DJ: ${dj.name}`);

    // Update user with DJ subscription
    await conn.execute(
      `
      UPDATE users 
      SET djId = ?, 
          isDjSubscriptionActive = 1, 
          djStripeSubscriptionId = ? 
      WHERE id = ?
    `,
      [dj.id, 'sub_test_' + Date.now(), user.id],
    );

    console.log('✅ DJ subscription activated successfully!');
    console.log(`📝 User ${user.name} is now subscribed to DJ ${dj.name}`);

    // Verify the update
    const [updated] = await conn.execute(
      `
      SELECT u.name, u.email, u.djId, u.isDjSubscriptionActive, d.name as djName
      FROM users u
      LEFT JOIN djs d ON u.djId = d.id
      WHERE u.id = ?
    `,
      [user.id],
    );

    if (updated.length > 0) {
      const result = updated[0];
      console.log('🔍 Verification:');
      console.log(`  - User: ${result.name}`);
      console.log(`  - DJ Subscription Active: ${result.isDjSubscriptionActive}`);
      console.log(`  - DJ Name: ${result.djName}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

simulateSuccessfulDjSubscription();
