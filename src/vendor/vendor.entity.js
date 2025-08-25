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
exports.Vendor = void 0;
const typeorm_1 = require("typeorm");
const dj_entity_1 = require("../dj/dj.entity");
const parsed_schedule_entity_1 = require("../parser/parsed-schedule.entity");
let Vendor = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('vendors')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _owner_decorators;
    let _owner_initializers = [];
    let _owner_extraInitializers = [];
    let _website_decorators;
    let _website_initializers = [];
    let _website_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _instagram_decorators;
    let _instagram_initializers = [];
    let _instagram_extraInitializers = [];
    let _facebook_decorators;
    let _facebook_initializers = [];
    let _facebook_extraInitializers = [];
    let _isActive_decorators;
    let _isActive_initializers = [];
    let _isActive_extraInitializers = [];
    let _requiresReview_decorators;
    let _requiresReview_initializers = [];
    let _requiresReview_extraInitializers = [];
    let _lastParsed_decorators;
    let _lastParsed_initializers = [];
    let _lastParsed_extraInitializers = [];
    let _parseNotes_decorators;
    let _parseNotes_initializers = [];
    let _parseNotes_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _djs_decorators;
    let _djs_initializers = [];
    let _djs_extraInitializers = [];
    let _parsedSchedules_decorators;
    let _parsedSchedules_initializers = [];
    let _parsedSchedules_extraInitializers = [];
    var Vendor = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.owner = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _owner_initializers, void 0));
            this.website = (__runInitializers(this, _owner_extraInitializers), __runInitializers(this, _website_initializers, void 0));
            this.description = (__runInitializers(this, _website_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.instagram = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _instagram_initializers, void 0));
            this.facebook = (__runInitializers(this, _instagram_extraInitializers), __runInitializers(this, _facebook_initializers, void 0));
            this.isActive = (__runInitializers(this, _facebook_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            // New fields for parser system
            this.requiresReview = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _requiresReview_initializers, void 0));
            this.lastParsed = (__runInitializers(this, _requiresReview_extraInitializers), __runInitializers(this, _lastParsed_initializers, void 0));
            this.parseNotes = (__runInitializers(this, _lastParsed_extraInitializers), __runInitializers(this, _parseNotes_initializers, void 0));
            this.createdAt = (__runInitializers(this, _parseNotes_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.djs = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _djs_initializers, void 0));
            this.parsedSchedules = (__runInitializers(this, _djs_extraInitializers), __runInitializers(this, _parsedSchedules_initializers, void 0));
            __runInitializers(this, _parsedSchedules_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Vendor");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _name_decorators = [(0, typeorm_1.Column)()];
        _owner_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _website_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _description_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _instagram_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _facebook_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ default: true })];
        _requiresReview_decorators = [(0, typeorm_1.Column)({ default: false })];
        _lastParsed_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _parseNotes_decorators = [(0, typeorm_1.Column)({ nullable: true, type: 'text' })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _djs_decorators = [(0, typeorm_1.OneToMany)(() => dj_entity_1.DJ, (dj) => dj.vendor)];
        _parsedSchedules_decorators = [(0, typeorm_1.OneToMany)(() => parsed_schedule_entity_1.ParsedSchedule, (parsedSchedule) => parsedSchedule.vendor)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _owner_decorators, { kind: "field", name: "owner", static: false, private: false, access: { has: obj => "owner" in obj, get: obj => obj.owner, set: (obj, value) => { obj.owner = value; } }, metadata: _metadata }, _owner_initializers, _owner_extraInitializers);
        __esDecorate(null, null, _website_decorators, { kind: "field", name: "website", static: false, private: false, access: { has: obj => "website" in obj, get: obj => obj.website, set: (obj, value) => { obj.website = value; } }, metadata: _metadata }, _website_initializers, _website_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _instagram_decorators, { kind: "field", name: "instagram", static: false, private: false, access: { has: obj => "instagram" in obj, get: obj => obj.instagram, set: (obj, value) => { obj.instagram = value; } }, metadata: _metadata }, _instagram_initializers, _instagram_extraInitializers);
        __esDecorate(null, null, _facebook_decorators, { kind: "field", name: "facebook", static: false, private: false, access: { has: obj => "facebook" in obj, get: obj => obj.facebook, set: (obj, value) => { obj.facebook = value; } }, metadata: _metadata }, _facebook_initializers, _facebook_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: obj => "isActive" in obj, get: obj => obj.isActive, set: (obj, value) => { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _requiresReview_decorators, { kind: "field", name: "requiresReview", static: false, private: false, access: { has: obj => "requiresReview" in obj, get: obj => obj.requiresReview, set: (obj, value) => { obj.requiresReview = value; } }, metadata: _metadata }, _requiresReview_initializers, _requiresReview_extraInitializers);
        __esDecorate(null, null, _lastParsed_decorators, { kind: "field", name: "lastParsed", static: false, private: false, access: { has: obj => "lastParsed" in obj, get: obj => obj.lastParsed, set: (obj, value) => { obj.lastParsed = value; } }, metadata: _metadata }, _lastParsed_initializers, _lastParsed_extraInitializers);
        __esDecorate(null, null, _parseNotes_decorators, { kind: "field", name: "parseNotes", static: false, private: false, access: { has: obj => "parseNotes" in obj, get: obj => obj.parseNotes, set: (obj, value) => { obj.parseNotes = value; } }, metadata: _metadata }, _parseNotes_initializers, _parseNotes_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _djs_decorators, { kind: "field", name: "djs", static: false, private: false, access: { has: obj => "djs" in obj, get: obj => obj.djs, set: (obj, value) => { obj.djs = value; } }, metadata: _metadata }, _djs_initializers, _djs_extraInitializers);
        __esDecorate(null, null, _parsedSchedules_decorators, { kind: "field", name: "parsedSchedules", static: false, private: false, access: { has: obj => "parsedSchedules" in obj, get: obj => obj.parsedSchedules, set: (obj, value) => { obj.parsedSchedules = value; } }, metadata: _metadata }, _parsedSchedules_initializers, _parsedSchedules_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Vendor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Vendor = _classThis;
})();
exports.Vendor = Vendor;
