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
exports.Subscription = exports.SubscriptionPlan = exports.SubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["UNPAID"] = "unpaid";
    SubscriptionStatus["INCOMPLETE"] = "incomplete";
    SubscriptionStatus["INCOMPLETE_EXPIRED"] = "incomplete_expired";
    SubscriptionStatus["TRIALING"] = "trialing";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "free";
    SubscriptionPlan["AD_FREE"] = "ad_free";
    SubscriptionPlan["PREMIUM"] = "premium";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
let Subscription = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('subscriptions')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _stripeSubscriptionId_decorators;
    let _stripeSubscriptionId_initializers = [];
    let _stripeSubscriptionId_extraInitializers = [];
    let _stripeCustomerId_decorators;
    let _stripeCustomerId_initializers = [];
    let _stripeCustomerId_extraInitializers = [];
    let _plan_decorators;
    let _plan_initializers = [];
    let _plan_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _pricePerMonth_decorators;
    let _pricePerMonth_initializers = [];
    let _pricePerMonth_extraInitializers = [];
    let _currentPeriodStart_decorators;
    let _currentPeriodStart_initializers = [];
    let _currentPeriodStart_extraInitializers = [];
    let _currentPeriodEnd_decorators;
    let _currentPeriodEnd_initializers = [];
    let _currentPeriodEnd_extraInitializers = [];
    let _cancelAtPeriodEnd_decorators;
    let _cancelAtPeriodEnd_initializers = [];
    let _cancelAtPeriodEnd_extraInitializers = [];
    let _canceledAt_decorators;
    let _canceledAt_initializers = [];
    let _canceledAt_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    var Subscription = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.userId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.stripeSubscriptionId = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _stripeSubscriptionId_initializers, void 0));
            this.stripeCustomerId = (__runInitializers(this, _stripeSubscriptionId_extraInitializers), __runInitializers(this, _stripeCustomerId_initializers, void 0));
            this.plan = (__runInitializers(this, _stripeCustomerId_extraInitializers), __runInitializers(this, _plan_initializers, void 0));
            this.status = (__runInitializers(this, _plan_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.pricePerMonth = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _pricePerMonth_initializers, void 0));
            this.currentPeriodStart = (__runInitializers(this, _pricePerMonth_extraInitializers), __runInitializers(this, _currentPeriodStart_initializers, void 0));
            this.currentPeriodEnd = (__runInitializers(this, _currentPeriodStart_extraInitializers), __runInitializers(this, _currentPeriodEnd_initializers, void 0));
            this.cancelAtPeriodEnd = (__runInitializers(this, _currentPeriodEnd_extraInitializers), __runInitializers(this, _cancelAtPeriodEnd_initializers, void 0));
            this.canceledAt = (__runInitializers(this, _cancelAtPeriodEnd_extraInitializers), __runInitializers(this, _canceledAt_initializers, void 0));
            this.createdAt = (__runInitializers(this, _canceledAt_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.user = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            __runInitializers(this, _user_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Subscription");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _userId_decorators = [(0, typeorm_1.Column)({ type: 'uuid' })];
        _stripeSubscriptionId_decorators = [(0, typeorm_1.Column)()];
        _stripeCustomerId_decorators = [(0, typeorm_1.Column)()];
        _plan_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: SubscriptionPlan,
                default: SubscriptionPlan.FREE,
            })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: SubscriptionStatus,
                default: SubscriptionStatus.INCOMPLETE,
            })];
        _pricePerMonth_decorators = [(0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 })];
        _currentPeriodStart_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _currentPeriodEnd_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _cancelAtPeriodEnd_decorators = [(0, typeorm_1.Column)({ default: false })];
        _canceledAt_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _user_decorators = [(0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.subscriptions, {
                onDelete: 'CASCADE',
            }), (0, typeorm_1.JoinColumn)({ name: 'userId' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _stripeSubscriptionId_decorators, { kind: "field", name: "stripeSubscriptionId", static: false, private: false, access: { has: obj => "stripeSubscriptionId" in obj, get: obj => obj.stripeSubscriptionId, set: (obj, value) => { obj.stripeSubscriptionId = value; } }, metadata: _metadata }, _stripeSubscriptionId_initializers, _stripeSubscriptionId_extraInitializers);
        __esDecorate(null, null, _stripeCustomerId_decorators, { kind: "field", name: "stripeCustomerId", static: false, private: false, access: { has: obj => "stripeCustomerId" in obj, get: obj => obj.stripeCustomerId, set: (obj, value) => { obj.stripeCustomerId = value; } }, metadata: _metadata }, _stripeCustomerId_initializers, _stripeCustomerId_extraInitializers);
        __esDecorate(null, null, _plan_decorators, { kind: "field", name: "plan", static: false, private: false, access: { has: obj => "plan" in obj, get: obj => obj.plan, set: (obj, value) => { obj.plan = value; } }, metadata: _metadata }, _plan_initializers, _plan_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _pricePerMonth_decorators, { kind: "field", name: "pricePerMonth", static: false, private: false, access: { has: obj => "pricePerMonth" in obj, get: obj => obj.pricePerMonth, set: (obj, value) => { obj.pricePerMonth = value; } }, metadata: _metadata }, _pricePerMonth_initializers, _pricePerMonth_extraInitializers);
        __esDecorate(null, null, _currentPeriodStart_decorators, { kind: "field", name: "currentPeriodStart", static: false, private: false, access: { has: obj => "currentPeriodStart" in obj, get: obj => obj.currentPeriodStart, set: (obj, value) => { obj.currentPeriodStart = value; } }, metadata: _metadata }, _currentPeriodStart_initializers, _currentPeriodStart_extraInitializers);
        __esDecorate(null, null, _currentPeriodEnd_decorators, { kind: "field", name: "currentPeriodEnd", static: false, private: false, access: { has: obj => "currentPeriodEnd" in obj, get: obj => obj.currentPeriodEnd, set: (obj, value) => { obj.currentPeriodEnd = value; } }, metadata: _metadata }, _currentPeriodEnd_initializers, _currentPeriodEnd_extraInitializers);
        __esDecorate(null, null, _cancelAtPeriodEnd_decorators, { kind: "field", name: "cancelAtPeriodEnd", static: false, private: false, access: { has: obj => "cancelAtPeriodEnd" in obj, get: obj => obj.cancelAtPeriodEnd, set: (obj, value) => { obj.cancelAtPeriodEnd = value; } }, metadata: _metadata }, _cancelAtPeriodEnd_initializers, _cancelAtPeriodEnd_extraInitializers);
        __esDecorate(null, null, _canceledAt_decorators, { kind: "field", name: "canceledAt", static: false, private: false, access: { has: obj => "canceledAt" in obj, get: obj => obj.canceledAt, set: (obj, value) => { obj.canceledAt = value; } }, metadata: _metadata }, _canceledAt_initializers, _canceledAt_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Subscription = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Subscription = _classThis;
})();
exports.Subscription = Subscription;
