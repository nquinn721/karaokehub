"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dj_entity_1 = require("./src/dj/dj.entity");
const user_entity_1 = require("./src/entities/user.entity");
const favorite_entity_1 = require("./src/favorite/favorite.entity");
const feedback_entity_1 = require("./src/feedback/feedback.entity");
const friend_request_entity_1 = require("./src/friends/friend-request.entity");
const friendship_entity_1 = require("./src/friends/friendship.entity");
const song_favorite_entity_1 = require("./src/music/song-favorite.entity");
const song_entity_1 = require("./src/music/song.entity");
const parsed_schedule_entity_1 = require("./src/parser/parsed-schedule.entity");
const url_to_parse_entity_1 = require("./src/parser/url-to-parse.entity");
const show_entity_1 = require("./src/show/show.entity");
const subscription_entity_1 = require("./src/subscription/subscription.entity");
const user_feature_override_entity_1 = require("./src/user-feature-override/user-feature-override.entity");
const vendor_entity_1 = require("./src/vendor/vendor.entity");
exports.default = new typeorm_1.DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'admin',
    password: 'password',
    database: 'karaoke-hub',
    entities: [
        user_entity_1.User,
        vendor_entity_1.Vendor,
        dj_entity_1.DJ,
        show_entity_1.Show,
        favorite_entity_1.FavoriteShow,
        feedback_entity_1.Feedback,
        parsed_schedule_entity_1.ParsedSchedule,
        url_to_parse_entity_1.UrlToParse,
        song_entity_1.Song,
        song_favorite_entity_1.SongFavorite,
        friend_request_entity_1.FriendRequest,
        friendship_entity_1.Friendship,
        subscription_entity_1.Subscription,
        user_feature_override_entity_1.UserFeatureOverride,
    ],
    migrations: ['./src/migrations/*.ts'],
    synchronize: false,
    logging: true,
});
