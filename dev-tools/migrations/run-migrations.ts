import AppDataSource from './data-source';

async function runMigrations() {
  try {
    console.log('Initializing data source...');
    await AppDataSource.initialize();
    
    console.log('Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('No pending migrations found.');
    } else {
      console.log(`Successfully ran ${migrations.length} migrations:`);
      migrations.forEach(migration => {
        console.log(`✅ ${migration.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

runMigrations();