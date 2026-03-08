"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureKey = exports.SubscriptionStatus = exports.TenantStatus = exports.TenantPlan = void 0;
var TenantPlan;
(function (TenantPlan) {
    TenantPlan["FREE"] = "FREE";
    TenantPlan["BASIC"] = "BASIC";
    TenantPlan["PRO"] = "PRO";
    TenantPlan["ENTERPRISE"] = "ENTERPRISE";
})(TenantPlan || (exports.TenantPlan = TenantPlan = {}));
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "ACTIVE";
    TenantStatus["SUSPENDED"] = "SUSPENDED";
    TenantStatus["TRIAL"] = "TRIAL";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["TRIALING"] = "TRIALING";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var FeatureKey;
(function (FeatureKey) {
    FeatureKey["BOOKING_ENABLED"] = "BOOKING_ENABLED";
    FeatureKey["SCANNER_VALIDATION"] = "SCANNER_VALIDATION";
    FeatureKey["EVENT_PUBLISHING"] = "EVENT_PUBLISHING";
    FeatureKey["ADVANCED_ANALYTICS"] = "ADVANCED_ANALYTICS";
})(FeatureKey || (exports.FeatureKey = FeatureKey = {}));
//# sourceMappingURL=platform.dto.js.map