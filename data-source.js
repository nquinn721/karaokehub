const { DataSource } = require('typeorm');

module.exports = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'admin',
  password: 'password',
  database: 'karaoke-hub',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/[0-9]*-*.js'],
  synchronize: false,
  logging: true,
});
