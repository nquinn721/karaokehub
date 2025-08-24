// Debug script to check song favorites and preview URLs
const { DataSource } = require('typeorm');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'karaokehub',
  synchronize: false,
  logging: false,
});

async function checkSongPreviews() {
  try {
    await AppDataSource.initialize();
    console.log('🎵 Connected to database');

    // Check song favorites
    const songFavoritesQuery = `
      SELECT 
        sf.id,
        sf."songId",
        s.title,
        s.artist,
        s."previewUrl",
        s."spotifyId",
        s."albumArtSmall",
        s."createdAt"
      FROM song_favorites sf
      LEFT JOIN songs s ON sf."songId" = s.id
      ORDER BY sf."createdAt" DESC
      LIMIT 10;
    `;

    const favorites = await AppDataSource.query(songFavoritesQuery);
    console.log('🎵 Recent song favorites:');
    favorites.forEach((fav, index) => {
      console.log(`${index + 1}. "${fav.title}" by ${fav.artist}`);
      console.log(`   - Song ID: ${fav.songId}`);
      console.log(`   - Spotify ID: ${fav.spotifyId || 'None'}`);
      console.log(`   - Preview URL: ${fav.previewUrl ? 'Yes' : 'No'}`);
      console.log(`   - Album Art: ${fav.albumArtSmall ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check total counts
    const totalFavorites = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM song_favorites',
    );
    const totalSongs = await AppDataSource.query('SELECT COUNT(*) as count FROM songs');
    const songsWithPreview = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM songs WHERE "previewUrl" IS NOT NULL',
    );
    const songsWithSpotifyId = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM songs WHERE "spotifyId" IS NOT NULL',
    );

    console.log('📊 Summary:');
    console.log(`- Total song favorites: ${totalFavorites[0].count}`);
    console.log(`- Total songs in database: ${totalSongs[0].count}`);
    console.log(`- Songs with preview URLs: ${songsWithPreview[0].count}`);
    console.log(`- Songs with Spotify IDs: ${songsWithSpotifyId[0].count}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkSongPreviews();
