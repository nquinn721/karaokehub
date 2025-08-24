const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'karaokehub',
    user: 'postgres',
    password: 'password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test users with "bil" in their names
    const testUsers = [
      {
        email: 'bill.smith@example.com',
        name: 'Bill Smith',
        stageName: 'DJ Bill',
        password: hashedPassword,
      },
      {
        email: 'billy.jones@example.com',
        name: 'Billy Jones',
        stageName: 'Billy DJ',
        password: hashedPassword,
      },
      {
        email: 'billie.wilson@example.com',
        name: 'Billie Wilson',
        stageName: 'DJ Billie',
        password: hashedPassword,
      },
      {
        email: 'mobile.bill@example.com',
        name: 'Mobile Bill',
        stageName: 'Mobile DJ Bill',
        password: hashedPassword,
      },
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        stageName: 'DJ John',
        password: hashedPassword,
      },
    ];

    for (const user of testUsers) {
      const query = `
        INSERT INTO "user" (id, email, name, "stageName", password, "isActive", "isAdmin", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, false, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `;

      const values = [user.email, user.name, user.stageName, user.password];
      await client.query(query, values);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    // Query to verify users were created
    const result = await client.query(`
      SELECT id, email, name, "stageName" 
      FROM "user" 
      WHERE email LIKE '%example.com' 
      ORDER BY name
    `);

    console.log('\nTest users in database:');
    result.rows.forEach((user) => {
      console.log(`- ${user.name} (${user.stageName}) - ${user.email} - ID: ${user.id}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createTestUsers();
