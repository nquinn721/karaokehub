const { DataSource } = require('typeorm');
const { DJ } = require('./dist/dj/dj.entity');
const { User } = require('./dist/entities/user.entity');
const { FavoriteShow } = require('./dist/favorite/favorite.entity');
const { Feedback } = require('./dist/feedback/feedback.entity');
const { FriendRequest } = require('./dist/friends/friend-request.entity');
const { Friendship } = require('./dist/friends/friendship.entity');
const { SongFavorite } = require('./dist/music/song-favorite.entity');
const { Song } = require('./dist/music/song.entity');
const { ParsedSchedule } = require('./dist/parser/parsed-schedule.entity');
const { UrlToParse } = require('./dist/parser/url-to-parse.entity');
const { Show } = require('./dist/show/show.entity');
const { Subscription } = require('./dist/subscription/subscription.entity');
const {
  UserFeatureOverride,
} = require('./dist/user-feature-override/user-feature-override.entity');
const { Vendor } = require('./dist/vendor/vendor.entity');
const { Venue } = require('./dist/venue/venue.entity');

module.exports = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'admin',
  password: 'password',
  database: 'karaoke-hub',
  entities: [
    User,
    Vendor,
    Venue,
    DJ,
    Show,
    FavoriteShow,
    Feedback,
    ParsedSchedule,
    UrlToParse,
    Song,
    SongFavorite,
    FriendRequest,
    Friendship,
    Subscription,
    UserFeatureOverride,
  ],
  migrations: ['./dist/migrations/*.js'],
  synchronize: false,
  logging: true,
});
