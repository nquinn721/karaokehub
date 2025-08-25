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
exports.Song = void 0;
const typeorm_1 = require("typeorm");
const song_favorite_entity_1 = require("./song-favorite.entity");
let Song = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('songs')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _artist_decorators;
    let _artist_initializers = [];
    let _artist_extraInitializers = [];
    let _album_decorators;
    let _album_initializers = [];
    let _album_extraInitializers = [];
    let _genre_decorators;
    let _genre_initializers = [];
    let _genre_extraInitializers = [];
    let _duration_decorators;
    let _duration_initializers = [];
    let _duration_extraInitializers = [];
    let _itunesId_decorators;
    let _itunesId_initializers = [];
    let _itunesId_extraInitializers = [];
    let _youtubeId_decorators;
    let _youtubeId_initializers = [];
    let _youtubeId_extraInitializers = [];
    let _previewUrl_decorators;
    let _previewUrl_initializers = [];
    let _previewUrl_extraInitializers = [];
    let _albumArtSmall_decorators;
    let _albumArtSmall_initializers = [];
    let _albumArtSmall_extraInitializers = [];
    let _albumArtMedium_decorators;
    let _albumArtMedium_initializers = [];
    let _albumArtMedium_extraInitializers = [];
    let _albumArtLarge_decorators;
    let _albumArtLarge_initializers = [];
    let _albumArtLarge_extraInitializers = [];
    let _isActive_decorators;
    let _isActive_initializers = [];
    let _isActive_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _favorites_decorators;
    let _favorites_initializers = [];
    let _favorites_extraInitializers = [];
    var Song = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.title = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _title_initializers, void 0));
            this.artist = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _artist_initializers, void 0));
            this.album = (__runInitializers(this, _artist_extraInitializers), __runInitializers(this, _album_initializers, void 0));
            this.genre = (__runInitializers(this, _album_extraInitializers), __runInitializers(this, _genre_initializers, void 0));
            this.duration = (__runInitializers(this, _genre_extraInitializers), __runInitializers(this, _duration_initializers, void 0)); // in seconds
            this.itunesId = (__runInitializers(this, _duration_extraInitializers), __runInitializers(this, _itunesId_initializers, void 0));
            this.youtubeId = (__runInitializers(this, _itunesId_extraInitializers), __runInitializers(this, _youtubeId_initializers, void 0));
            this.previewUrl = (__runInitializers(this, _youtubeId_extraInitializers), __runInitializers(this, _previewUrl_initializers, void 0));
            this.albumArtSmall = (__runInitializers(this, _previewUrl_extraInitializers), __runInitializers(this, _albumArtSmall_initializers, void 0));
            this.albumArtMedium = (__runInitializers(this, _albumArtSmall_extraInitializers), __runInitializers(this, _albumArtMedium_initializers, void 0));
            this.albumArtLarge = (__runInitializers(this, _albumArtMedium_extraInitializers), __runInitializers(this, _albumArtLarge_initializers, void 0));
            this.isActive = (__runInitializers(this, _albumArtLarge_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.createdAt = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.favorites = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _favorites_initializers, void 0));
            __runInitializers(this, _favorites_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Song");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _title_decorators = [(0, typeorm_1.Column)()];
        _artist_decorators = [(0, typeorm_1.Column)()];
        _album_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _genre_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _duration_decorators = [(0, typeorm_1.Column)({ type: 'int', nullable: true })];
        _itunesId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _youtubeId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _previewUrl_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _albumArtSmall_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _albumArtMedium_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _albumArtLarge_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ default: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _favorites_decorators = [(0, typeorm_1.OneToMany)(() => song_favorite_entity_1.SongFavorite, (favorite) => favorite.song)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
        __esDecorate(null, null, _artist_decorators, { kind: "field", name: "artist", static: false, private: false, access: { has: obj => "artist" in obj, get: obj => obj.artist, set: (obj, value) => { obj.artist = value; } }, metadata: _metadata }, _artist_initializers, _artist_extraInitializers);
        __esDecorate(null, null, _album_decorators, { kind: "field", name: "album", static: false, private: false, access: { has: obj => "album" in obj, get: obj => obj.album, set: (obj, value) => { obj.album = value; } }, metadata: _metadata }, _album_initializers, _album_extraInitializers);
        __esDecorate(null, null, _genre_decorators, { kind: "field", name: "genre", static: false, private: false, access: { has: obj => "genre" in obj, get: obj => obj.genre, set: (obj, value) => { obj.genre = value; } }, metadata: _metadata }, _genre_initializers, _genre_extraInitializers);
        __esDecorate(null, null, _duration_decorators, { kind: "field", name: "duration", static: false, private: false, access: { has: obj => "duration" in obj, get: obj => obj.duration, set: (obj, value) => { obj.duration = value; } }, metadata: _metadata }, _duration_initializers, _duration_extraInitializers);
        __esDecorate(null, null, _itunesId_decorators, { kind: "field", name: "itunesId", static: false, private: false, access: { has: obj => "itunesId" in obj, get: obj => obj.itunesId, set: (obj, value) => { obj.itunesId = value; } }, metadata: _metadata }, _itunesId_initializers, _itunesId_extraInitializers);
        __esDecorate(null, null, _youtubeId_decorators, { kind: "field", name: "youtubeId", static: false, private: false, access: { has: obj => "youtubeId" in obj, get: obj => obj.youtubeId, set: (obj, value) => { obj.youtubeId = value; } }, metadata: _metadata }, _youtubeId_initializers, _youtubeId_extraInitializers);
        __esDecorate(null, null, _previewUrl_decorators, { kind: "field", name: "previewUrl", static: false, private: false, access: { has: obj => "previewUrl" in obj, get: obj => obj.previewUrl, set: (obj, value) => { obj.previewUrl = value; } }, metadata: _metadata }, _previewUrl_initializers, _previewUrl_extraInitializers);
        __esDecorate(null, null, _albumArtSmall_decorators, { kind: "field", name: "albumArtSmall", static: false, private: false, access: { has: obj => "albumArtSmall" in obj, get: obj => obj.albumArtSmall, set: (obj, value) => { obj.albumArtSmall = value; } }, metadata: _metadata }, _albumArtSmall_initializers, _albumArtSmall_extraInitializers);
        __esDecorate(null, null, _albumArtMedium_decorators, { kind: "field", name: "albumArtMedium", static: false, private: false, access: { has: obj => "albumArtMedium" in obj, get: obj => obj.albumArtMedium, set: (obj, value) => { obj.albumArtMedium = value; } }, metadata: _metadata }, _albumArtMedium_initializers, _albumArtMedium_extraInitializers);
        __esDecorate(null, null, _albumArtLarge_decorators, { kind: "field", name: "albumArtLarge", static: false, private: false, access: { has: obj => "albumArtLarge" in obj, get: obj => obj.albumArtLarge, set: (obj, value) => { obj.albumArtLarge = value; } }, metadata: _metadata }, _albumArtLarge_initializers, _albumArtLarge_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: obj => "isActive" in obj, get: obj => obj.isActive, set: (obj, value) => { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _favorites_decorators, { kind: "field", name: "favorites", static: false, private: false, access: { has: obj => "favorites" in obj, get: obj => obj.favorites, set: (obj, value) => { obj.favorites = value; } }, metadata: _metadata }, _favorites_initializers, _favorites_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Song = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Song = _classThis;
})();
exports.Song = Song;
