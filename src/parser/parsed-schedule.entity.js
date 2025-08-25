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
exports.ParsedSchedule = exports.ParseStatus = void 0;
const typeorm_1 = require("typeorm");
const vendor_entity_1 = require("../vendor/vendor.entity");
var ParseStatus;
(function (ParseStatus) {
    ParseStatus["PENDING"] = "pending";
    ParseStatus["PENDING_REVIEW"] = "pending_review";
    ParseStatus["APPROVED"] = "approved";
    ParseStatus["REJECTED"] = "rejected";
    ParseStatus["NEEDS_REVIEW"] = "needs_review";
})(ParseStatus || (exports.ParseStatus = ParseStatus = {}));
let ParsedSchedule = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('parsed_schedules')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _url_decorators;
    let _url_initializers = [];
    let _url_extraInitializers = [];
    let _aiAnalysis_decorators;
    let _aiAnalysis_initializers = [];
    let _aiAnalysis_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _rejectionReason_decorators;
    let _rejectionReason_initializers = [];
    let _rejectionReason_extraInitializers = [];
    let _reviewComments_decorators;
    let _reviewComments_initializers = [];
    let _reviewComments_extraInitializers = [];
    let _parsingLogs_decorators;
    let _parsingLogs_initializers = [];
    let _parsingLogs_extraInitializers = [];
    let _rawData_decorators;
    let _rawData_initializers = [];
    let _rawData_extraInitializers = [];
    let _vendorId_decorators;
    let _vendorId_initializers = [];
    let _vendorId_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _vendor_decorators;
    let _vendor_initializers = [];
    let _vendor_extraInitializers = [];
    var ParsedSchedule = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.url = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _url_initializers, void 0));
            this.aiAnalysis = (__runInitializers(this, _url_extraInitializers), __runInitializers(this, _aiAnalysis_initializers, void 0));
            this.status = (__runInitializers(this, _aiAnalysis_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.rejectionReason = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _rejectionReason_initializers, void 0));
            this.reviewComments = (__runInitializers(this, _rejectionReason_extraInitializers), __runInitializers(this, _reviewComments_initializers, void 0));
            this.parsingLogs = (__runInitializers(this, _reviewComments_extraInitializers), __runInitializers(this, _parsingLogs_initializers, void 0));
            this.rawData = (__runInitializers(this, _parsingLogs_extraInitializers), __runInitializers(this, _rawData_initializers, void 0)); // TODO: Deprecated - remove after migrating to aiAnalysis
            this.vendorId = (__runInitializers(this, _rawData_extraInitializers), __runInitializers(this, _vendorId_initializers, void 0));
            this.createdAt = (__runInitializers(this, _vendorId_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            // Relationships
            this.vendor = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _vendor_initializers, void 0));
            __runInitializers(this, _vendor_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "ParsedSchedule");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _url_decorators = [(0, typeorm_1.Column)()];
        _aiAnalysis_decorators = [(0, typeorm_1.Column)('json', { nullable: true })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: ParseStatus,
                default: ParseStatus.PENDING,
            })];
        _rejectionReason_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _reviewComments_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _parsingLogs_decorators = [(0, typeorm_1.Column)('json', { nullable: true })];
        _rawData_decorators = [(0, typeorm_1.Column)('json', { nullable: true })];
        _vendorId_decorators = [(0, typeorm_1.Column)('uuid', { nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _vendor_decorators = [(0, typeorm_1.ManyToOne)(() => vendor_entity_1.Vendor, (vendor) => vendor.parsedSchedules, { nullable: true }), (0, typeorm_1.JoinColumn)({ name: 'vendorId' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _url_decorators, { kind: "field", name: "url", static: false, private: false, access: { has: obj => "url" in obj, get: obj => obj.url, set: (obj, value) => { obj.url = value; } }, metadata: _metadata }, _url_initializers, _url_extraInitializers);
        __esDecorate(null, null, _aiAnalysis_decorators, { kind: "field", name: "aiAnalysis", static: false, private: false, access: { has: obj => "aiAnalysis" in obj, get: obj => obj.aiAnalysis, set: (obj, value) => { obj.aiAnalysis = value; } }, metadata: _metadata }, _aiAnalysis_initializers, _aiAnalysis_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _rejectionReason_decorators, { kind: "field", name: "rejectionReason", static: false, private: false, access: { has: obj => "rejectionReason" in obj, get: obj => obj.rejectionReason, set: (obj, value) => { obj.rejectionReason = value; } }, metadata: _metadata }, _rejectionReason_initializers, _rejectionReason_extraInitializers);
        __esDecorate(null, null, _reviewComments_decorators, { kind: "field", name: "reviewComments", static: false, private: false, access: { has: obj => "reviewComments" in obj, get: obj => obj.reviewComments, set: (obj, value) => { obj.reviewComments = value; } }, metadata: _metadata }, _reviewComments_initializers, _reviewComments_extraInitializers);
        __esDecorate(null, null, _parsingLogs_decorators, { kind: "field", name: "parsingLogs", static: false, private: false, access: { has: obj => "parsingLogs" in obj, get: obj => obj.parsingLogs, set: (obj, value) => { obj.parsingLogs = value; } }, metadata: _metadata }, _parsingLogs_initializers, _parsingLogs_extraInitializers);
        __esDecorate(null, null, _rawData_decorators, { kind: "field", name: "rawData", static: false, private: false, access: { has: obj => "rawData" in obj, get: obj => obj.rawData, set: (obj, value) => { obj.rawData = value; } }, metadata: _metadata }, _rawData_initializers, _rawData_extraInitializers);
        __esDecorate(null, null, _vendorId_decorators, { kind: "field", name: "vendorId", static: false, private: false, access: { has: obj => "vendorId" in obj, get: obj => obj.vendorId, set: (obj, value) => { obj.vendorId = value; } }, metadata: _metadata }, _vendorId_initializers, _vendorId_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _vendor_decorators, { kind: "field", name: "vendor", static: false, private: false, access: { has: obj => "vendor" in obj, get: obj => obj.vendor, set: (obj, value) => { obj.vendor = value; } }, metadata: _metadata }, _vendor_initializers, _vendor_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ParsedSchedule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ParsedSchedule = _classThis;
})();
exports.ParsedSchedule = ParsedSchedule;
