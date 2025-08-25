"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const favorite_entity_1 = require("../favorite/favorite.entity");
const friend_request_entity_1 = require("../friends/friend-request.entity");
const friendship_entity_1 = require("../friends/friendship.entity");
const song_favorite_entity_1 = require("../music/song-favorite.entity");
const subscription_entity_1 = require("../subscription/subscription.entity");
let User = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('users')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _email_decorators;
    let _email_initializers = [];
    let _email_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _stageName_decorators;
    let _stageName_initializers = [];
    let _stageName_extraInitializers = [];
    let _password_decorators;
    let _password_initializers = [];
    let _password_extraInitializers = [];
    let _avatar_decorators;
    let _avatar_initializers = [];
    let _avatar_extraInitializers = [];
    let _provider_decorators;
    let _provider_initializers = [];
    let _provider_extraInitializers = [];
    let _providerId_decorators;
    let _providerId_initializers = [];
    let _providerId_extraInitializers = [];
    let _isActive_decorators;
    let _isActive_initializers = [];
    let _isActive_extraInitializers = [];
    let _isAdmin_decorators;
    let _isAdmin_initializers = [];
    let _isAdmin_extraInitializers = [];
    let _stripeCustomerId_decorators;
    let _stripeCustomerId_initializers = [];
    let _stripeCustomerId_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _favoriteShows_decorators;
    let _favoriteShows_initializers = [];
    let _favoriteShows_extraInitializers = [];
    let _subscriptions_decorators;
    let _subscriptions_initializers = [];
    let _subscriptions_extraInitializers = [];
    let _songFavorites_decorators;
    let _songFavorites_initializers = [];
    let _songFavorites_extraInitializers = [];
    let _sentFriendRequests_decorators;
    let _sentFriendRequests_initializers = [];
    let _sentFriendRequests_extraInitializers = [];
    let _receivedFriendRequests_decorators;
    let _receivedFriendRequests_initializers = [];
    let _receivedFriendRequests_extraInitializers = [];
    let _friendships_decorators;
    let _friendships_initializers = [];
    let _friendships_extraInitializers = [];
    let _friendsOf_decorators;
    let _friendsOf_initializers = [];
    let _friendsOf_extraInitializers = [];
    var User = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.email = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.name = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.stageName = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _stageName_initializers, void 0));
            this.password = (__runInitializers(this, _stageName_extraInitializers), __runInitializers(this, _password_initializers, void 0));
            this.avatar = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _avatar_initializers, void 0));
            this.provider = (__runInitializers(this, _avatar_extraInitializers), __runInitializers(this, _provider_initializers, void 0));
            this.providerId = (__runInitializers(this, _provider_extraInitializers), __runInitializers(this, _providerId_initializers, void 0));
            this.isActive = (__runInitializers(this, _providerId_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.isAdmin = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _isAdmin_initializers, void 0));
            // Subscription fields
            this.stripeCustomerId = (__runInitializers(this, _isAdmin_extraInitializers), __runInitializers(this, _stripeCustomerId_initializers, void 0));
            this.createdAt = (__runInitializers(this, _stripeCustomerId_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.favoriteShows = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _favoriteShows_initializers, void 0));
            this.subscriptions = (__runInitializers(this, _favoriteShows_extraInitializers), __runInitializers(this, _subscriptions_initializers, void 0));
            this.songFavorites = (__runInitializers(this, _subscriptions_extraInitializers), __runInitializers(this, _songFavorites_initializers, void 0));
            // Friends relationships
            this.sentFriendRequests = (__runInitializers(this, _songFavorites_extraInitializers), __runInitializers(this, _sentFriendRequests_initializers, void 0));
            this.receivedFriendRequests = (__runInitializers(this, _sentFriendRequests_extraInitializers), __runInitializers(this, _receivedFriendRequests_initializers, void 0));
            this.friendships = (__runInitializers(this, _receivedFriendRequests_extraInitializers), __runInitializers(this, _friendships_initializers, void 0));
            this.friendsOf = (__runInitializers(this, _friendships_extraInitializers), __runInitializers(this, _friendsOf_initializers, void 0));
            __runInitializers(this, _friendsOf_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "User");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _email_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _name_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _stageName_decorators = [(0, typeorm_1.Column)({ nullable: true, unique: true })];
        _password_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _avatar_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _provider_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _providerId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ default: true })];
        _isAdmin_decorators = [(0, typeorm_1.Column)({ default: false })];
        _stripeCustomerId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _favoriteShows_decorators = [(0, typeorm_1.OneToMany)(() => favorite_entity_1.FavoriteShow, (favoriteShow) => favoriteShow.user)];
        _subscriptions_decorators = [(0, typeorm_1.OneToMany)(() => subscription_entity_1.Subscription, (subscription) => subscription.user)];
        _songFavorites_decorators = [(0, typeorm_1.OneToMany)(() => song_favorite_entity_1.SongFavorite, (songFavorite) => songFavorite.user)];
        _sentFriendRequests_decorators = [(0, typeorm_1.OneToMany)(() => friend_request_entity_1.FriendRequest, (friendRequest) => friendRequest.requester)];
        _receivedFriendRequests_decorators = [(0, typeorm_1.OneToMany)(() => friend_request_entity_1.FriendRequest, (friendRequest) => friendRequest.recipient)];
        _friendships_decorators = [(0, typeorm_1.OneToMany)(() => friendship_entity_1.Friendship, (friendship) => friendship.user)];
        _friendsOf_decorators = [(0, typeorm_1.OneToMany)(() => friendship_entity_1.Friendship, (friendship) => friendship.friend)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: obj => "email" in obj, get: obj => obj.email, set: (obj, value) => { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _stageName_decorators, { kind: "field", name: "stageName", static: false, private: false, access: { has: obj => "stageName" in obj, get: obj => obj.stageName, set: (obj, value) => { obj.stageName = value; } }, metadata: _metadata }, _stageName_initializers, _stageName_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: obj => "password" in obj, get: obj => obj.password, set: (obj, value) => { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _avatar_decorators, { kind: "field", name: "avatar", static: false, private: false, access: { has: obj => "avatar" in obj, get: obj => obj.avatar, set: (obj, value) => { obj.avatar = value; } }, metadata: _metadata }, _avatar_initializers, _avatar_extraInitializers);
        __esDecorate(null, null, _provider_decorators, { kind: "field", name: "provider", static: false, private: false, access: { has: obj => "provider" in obj, get: obj => obj.provider, set: (obj, value) => { obj.provider = value; } }, metadata: _metadata }, _provider_initializers, _provider_extraInitializers);
        __esDecorate(null, null, _providerId_decorators, { kind: "field", name: "providerId", static: false, private: false, access: { has: obj => "providerId" in obj, get: obj => obj.providerId, set: (obj, value) => { obj.providerId = value; } }, metadata: _metadata }, _providerId_initializers, _providerId_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: obj => "isActive" in obj, get: obj => obj.isActive, set: (obj, value) => { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _isAdmin_decorators, { kind: "field", name: "isAdmin", static: false, private: false, access: { has: obj => "isAdmin" in obj, get: obj => obj.isAdmin, set: (obj, value) => { obj.isAdmin = value; } }, metadata: _metadata }, _isAdmin_initializers, _isAdmin_extraInitializers);
        __esDecorate(null, null, _stripeCustomerId_decorators, { kind: "field", name: "stripeCustomerId", static: false, private: false, access: { has: obj => "stripeCustomerId" in obj, get: obj => obj.stripeCustomerId, set: (obj, value) => { obj.stripeCustomerId = value; } }, metadata: _metadata }, _stripeCustomerId_initializers, _stripeCustomerId_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _favoriteShows_decorators, { kind: "field", name: "favoriteShows", static: false, private: false, access: { has: obj => "favoriteShows" in obj, get: obj => obj.favoriteShows, set: (obj, value) => { obj.favoriteShows = value; } }, metadata: _metadata }, _favoriteShows_initializers, _favoriteShows_extraInitializers);
        __esDecorate(null, null, _subscriptions_decorators, { kind: "field", name: "subscriptions", static: false, private: false, access: { has: obj => "subscriptions" in obj, get: obj => obj.subscriptions, set: (obj, value) => { obj.subscriptions = value; } }, metadata: _metadata }, _subscriptions_initializers, _subscriptions_extraInitializers);
        __esDecorate(null, null, _songFavorites_decorators, { kind: "field", name: "songFavorites", static: false, private: false, access: { has: obj => "songFavorites" in obj, get: obj => obj.songFavorites, set: (obj, value) => { obj.songFavorites = value; } }, metadata: _metadata }, _songFavorites_initializers, _songFavorites_extraInitializers);
        __esDecorate(null, null, _sentFriendRequests_decorators, { kind: "field", name: "sentFriendRequests", static: false, private: false, access: { has: obj => "sentFriendRequests" in obj, get: obj => obj.sentFriendRequests, set: (obj, value) => { obj.sentFriendRequests = value; } }, metadata: _metadata }, _sentFriendRequests_initializers, _sentFriendRequests_extraInitializers);
        __esDecorate(null, null, _receivedFriendRequests_decorators, { kind: "field", name: "receivedFriendRequests", static: false, private: false, access: { has: obj => "receivedFriendRequests" in obj, get: obj => obj.receivedFriendRequests, set: (obj, value) => { obj.receivedFriendRequests = value; } }, metadata: _metadata }, _receivedFriendRequests_initializers, _receivedFriendRequests_extraInitializers);
        __esDecorate(null, null, _friendships_decorators, { kind: "field", name: "friendships", static: false, private: false, access: { has: obj => "friendships" in obj, get: obj => obj.friendships, set: (obj, value) => { obj.friendships = value; } }, metadata: _metadata }, _friendships_initializers, _friendships_extraInitializers);
        __esDecorate(null, null, _friendsOf_decorators, { kind: "field", name: "friendsOf", static: false, private: false, access: { has: obj => "friendsOf" in obj, get: obj => obj.friendsOf, set: (obj, value) => { obj.friendsOf = value; } }, metadata: _metadata }, _friendsOf_initializers, _friendsOf_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        User = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return User = _classThis;
})();
exports.User = User;
