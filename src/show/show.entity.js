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
exports.Show = exports.DayOfWeek = void 0;
const typeorm_1 = require("typeorm");
const dj_entity_1 = require("../dj/dj.entity");
const favorite_entity_1 = require("../favorite/favorite.entity");
var DayOfWeek;
(function (DayOfWeek) {
    DayOfWeek["MONDAY"] = "monday";
    DayOfWeek["TUESDAY"] = "tuesday";
    DayOfWeek["WEDNESDAY"] = "wednesday";
    DayOfWeek["THURSDAY"] = "thursday";
    DayOfWeek["FRIDAY"] = "friday";
    DayOfWeek["SATURDAY"] = "saturday";
    DayOfWeek["SUNDAY"] = "sunday";
})(DayOfWeek || (exports.DayOfWeek = DayOfWeek = {}));
let Show = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('shows')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _djId_decorators;
    let _djId_initializers = [];
    let _djId_extraInitializers = [];
    let _address_decorators;
    let _address_initializers = [];
    let _address_extraInitializers = [];
    let _city_decorators;
    let _city_initializers = [];
    let _city_extraInitializers = [];
    let _state_decorators;
    let _state_initializers = [];
    let _state_extraInitializers = [];
    let _zip_decorators;
    let _zip_initializers = [];
    let _zip_extraInitializers = [];
    let _venue_decorators;
    let _venue_initializers = [];
    let _venue_extraInitializers = [];
    let _time_decorators;
    let _time_initializers = [];
    let _time_extraInitializers = [];
    let _day_decorators;
    let _day_initializers = [];
    let _day_extraInitializers = [];
    let _startTime_decorators;
    let _startTime_initializers = [];
    let _startTime_extraInitializers = [];
    let _endTime_decorators;
    let _endTime_initializers = [];
    let _endTime_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _venuePhone_decorators;
    let _venuePhone_initializers = [];
    let _venuePhone_extraInitializers = [];
    let _venueWebsite_decorators;
    let _venueWebsite_initializers = [];
    let _venueWebsite_extraInitializers = [];
    let _source_decorators;
    let _source_initializers = [];
    let _source_extraInitializers = [];
    let _lat_decorators;
    let _lat_initializers = [];
    let _lat_extraInitializers = [];
    let _lng_decorators;
    let _lng_initializers = [];
    let _lng_extraInitializers = [];
    let _isActive_decorators;
    let _isActive_initializers = [];
    let _isActive_extraInitializers = [];
    let _isValid_decorators;
    let _isValid_initializers = [];
    let _isValid_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _dj_decorators;
    let _dj_initializers = [];
    let _dj_extraInitializers = [];
    let _favoriteShows_decorators;
    let _favoriteShows_initializers = [];
    let _favoriteShows_extraInitializers = [];
    var Show = _classThis = class {
        // Computed properties
        get readableSource() {
            if (!this.source)
                return 'Unknown';
            const url = this.source.toLowerCase();
            if (url.includes('facebook.com') || url.includes('fbcdn.net') || url.includes('scontent')) {
                return 'Facebook CDN';
            }
            else if (url.includes('instagram.com') || url.includes('cdninstagram.com')) {
                return 'Instagram';
            }
            else if (url.includes('twitter.com') || url.includes('t.co')) {
                return 'Twitter/X';
            }
            else if (url.includes('googleapis.com')) {
                return 'Google APIs';
            }
            else if (url.includes('cloudinary.com')) {
                return 'Cloudinary';
            }
            else if (url.includes('amazonaws.com') || url.includes('s3.')) {
                return 'Amazon S3';
            }
            else if (url.includes('dropbox.com')) {
                return 'Dropbox';
            }
            else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                return 'YouTube';
            }
            else if (url.includes('vimeo.com')) {
                return 'Vimeo';
            }
            else if (url.includes('eventbrite.com')) {
                return 'Eventbrite';
            }
            else if (url.includes('meetup.com')) {
                return 'Meetup';
            }
            else if (url.includes('bandsintown.com')) {
                return 'Bandsintown';
            }
            else if (url.includes('songkick.com')) {
                return 'Songkick';
            }
            else if (url.startsWith('http://') || url.startsWith('https://')) {
                // Extract domain name for unknown URLs
                try {
                    const domain = new URL(this.source).hostname.replace('www.', '');
                    return domain.charAt(0).toUpperCase() + domain.slice(1);
                }
                catch {
                    return 'Web Source';
                }
            }
            else {
                return 'Manual Entry';
            }
        }
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.djId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _djId_initializers, void 0));
            this.address = (__runInitializers(this, _djId_extraInitializers), __runInitializers(this, _address_initializers, void 0));
            this.city = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _city_initializers, void 0));
            this.state = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _state_initializers, void 0));
            this.zip = (__runInitializers(this, _state_extraInitializers), __runInitializers(this, _zip_initializers, void 0));
            this.venue = (__runInitializers(this, _zip_extraInitializers), __runInitializers(this, _venue_initializers, void 0));
            this.time = (__runInitializers(this, _venue_extraInitializers), __runInitializers(this, _time_initializers, void 0));
            this.day = (__runInitializers(this, _time_extraInitializers), __runInitializers(this, _day_initializers, void 0));
            this.startTime = (__runInitializers(this, _day_extraInitializers), __runInitializers(this, _startTime_initializers, void 0));
            this.endTime = (__runInitializers(this, _startTime_extraInitializers), __runInitializers(this, _endTime_initializers, void 0));
            this.description = (__runInitializers(this, _endTime_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.venuePhone = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _venuePhone_initializers, void 0));
            this.venueWebsite = (__runInitializers(this, _venuePhone_extraInitializers), __runInitializers(this, _venueWebsite_initializers, void 0));
            this.source = (__runInitializers(this, _venueWebsite_extraInitializers), __runInitializers(this, _source_initializers, void 0));
            this.lat = (__runInitializers(this, _source_extraInitializers), __runInitializers(this, _lat_initializers, void 0));
            this.lng = (__runInitializers(this, _lat_extraInitializers), __runInitializers(this, _lng_initializers, void 0));
            this.isActive = (__runInitializers(this, _lng_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.isValid = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _isValid_initializers, void 0));
            this.createdAt = (__runInitializers(this, _isValid_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.dj = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _dj_initializers, void 0));
            this.favoriteShows = (__runInitializers(this, _dj_extraInitializers), __runInitializers(this, _favoriteShows_initializers, void 0));
            __runInitializers(this, _favoriteShows_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Show");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _djId_decorators = [(0, typeorm_1.Column)('uuid', { nullable: true })];
        _address_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _city_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _state_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _zip_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _venue_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _time_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _day_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: DayOfWeek,
                nullable: true,
            })];
        _startTime_decorators = [(0, typeorm_1.Column)({ type: 'time', nullable: true })];
        _endTime_decorators = [(0, typeorm_1.Column)({ type: 'time', nullable: true })];
        _description_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _venuePhone_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _venueWebsite_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _source_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _lat_decorators = [(0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8, nullable: true })];
        _lng_decorators = [(0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8, nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ default: true })];
        _isValid_decorators = [(0, typeorm_1.Column)({ default: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _dj_decorators = [(0, typeorm_1.ManyToOne)(() => dj_entity_1.DJ, (dj) => dj.shows), (0, typeorm_1.JoinColumn)({ name: 'djId' })];
        _favoriteShows_decorators = [(0, typeorm_1.OneToMany)(() => favorite_entity_1.FavoriteShow, (favoriteShow) => favoriteShow.show)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _djId_decorators, { kind: "field", name: "djId", static: false, private: false, access: { has: obj => "djId" in obj, get: obj => obj.djId, set: (obj, value) => { obj.djId = value; } }, metadata: _metadata }, _djId_initializers, _djId_extraInitializers);
        __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: obj => "address" in obj, get: obj => obj.address, set: (obj, value) => { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
        __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: obj => "city" in obj, get: obj => obj.city, set: (obj, value) => { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
        __esDecorate(null, null, _state_decorators, { kind: "field", name: "state", static: false, private: false, access: { has: obj => "state" in obj, get: obj => obj.state, set: (obj, value) => { obj.state = value; } }, metadata: _metadata }, _state_initializers, _state_extraInitializers);
        __esDecorate(null, null, _zip_decorators, { kind: "field", name: "zip", static: false, private: false, access: { has: obj => "zip" in obj, get: obj => obj.zip, set: (obj, value) => { obj.zip = value; } }, metadata: _metadata }, _zip_initializers, _zip_extraInitializers);
        __esDecorate(null, null, _venue_decorators, { kind: "field", name: "venue", static: false, private: false, access: { has: obj => "venue" in obj, get: obj => obj.venue, set: (obj, value) => { obj.venue = value; } }, metadata: _metadata }, _venue_initializers, _venue_extraInitializers);
        __esDecorate(null, null, _time_decorators, { kind: "field", name: "time", static: false, private: false, access: { has: obj => "time" in obj, get: obj => obj.time, set: (obj, value) => { obj.time = value; } }, metadata: _metadata }, _time_initializers, _time_extraInitializers);
        __esDecorate(null, null, _day_decorators, { kind: "field", name: "day", static: false, private: false, access: { has: obj => "day" in obj, get: obj => obj.day, set: (obj, value) => { obj.day = value; } }, metadata: _metadata }, _day_initializers, _day_extraInitializers);
        __esDecorate(null, null, _startTime_decorators, { kind: "field", name: "startTime", static: false, private: false, access: { has: obj => "startTime" in obj, get: obj => obj.startTime, set: (obj, value) => { obj.startTime = value; } }, metadata: _metadata }, _startTime_initializers, _startTime_extraInitializers);
        __esDecorate(null, null, _endTime_decorators, { kind: "field", name: "endTime", static: false, private: false, access: { has: obj => "endTime" in obj, get: obj => obj.endTime, set: (obj, value) => { obj.endTime = value; } }, metadata: _metadata }, _endTime_initializers, _endTime_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _venuePhone_decorators, { kind: "field", name: "venuePhone", static: false, private: false, access: { has: obj => "venuePhone" in obj, get: obj => obj.venuePhone, set: (obj, value) => { obj.venuePhone = value; } }, metadata: _metadata }, _venuePhone_initializers, _venuePhone_extraInitializers);
        __esDecorate(null, null, _venueWebsite_decorators, { kind: "field", name: "venueWebsite", static: false, private: false, access: { has: obj => "venueWebsite" in obj, get: obj => obj.venueWebsite, set: (obj, value) => { obj.venueWebsite = value; } }, metadata: _metadata }, _venueWebsite_initializers, _venueWebsite_extraInitializers);
        __esDecorate(null, null, _source_decorators, { kind: "field", name: "source", static: false, private: false, access: { has: obj => "source" in obj, get: obj => obj.source, set: (obj, value) => { obj.source = value; } }, metadata: _metadata }, _source_initializers, _source_extraInitializers);
        __esDecorate(null, null, _lat_decorators, { kind: "field", name: "lat", static: false, private: false, access: { has: obj => "lat" in obj, get: obj => obj.lat, set: (obj, value) => { obj.lat = value; } }, metadata: _metadata }, _lat_initializers, _lat_extraInitializers);
        __esDecorate(null, null, _lng_decorators, { kind: "field", name: "lng", static: false, private: false, access: { has: obj => "lng" in obj, get: obj => obj.lng, set: (obj, value) => { obj.lng = value; } }, metadata: _metadata }, _lng_initializers, _lng_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: obj => "isActive" in obj, get: obj => obj.isActive, set: (obj, value) => { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _isValid_decorators, { kind: "field", name: "isValid", static: false, private: false, access: { has: obj => "isValid" in obj, get: obj => obj.isValid, set: (obj, value) => { obj.isValid = value; } }, metadata: _metadata }, _isValid_initializers, _isValid_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _dj_decorators, { kind: "field", name: "dj", static: false, private: false, access: { has: obj => "dj" in obj, get: obj => obj.dj, set: (obj, value) => { obj.dj = value; } }, metadata: _metadata }, _dj_initializers, _dj_extraInitializers);
        __esDecorate(null, null, _favoriteShows_decorators, { kind: "field", name: "favoriteShows", static: false, private: false, access: { has: obj => "favoriteShows" in obj, get: obj => obj.favoriteShows, set: (obj, value) => { obj.favoriteShows = value; } }, metadata: _metadata }, _favoriteShows_initializers, _favoriteShows_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Show = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Show = _classThis;
})();
exports.Show = Show;
