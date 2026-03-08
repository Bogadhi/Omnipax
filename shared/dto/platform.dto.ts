export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIALING = 'TRIALING',
}

export enum FeatureKey {
  BOOKING_ENABLED = 'BOOKING_ENABLED',
  SCANNER_VALIDATION = 'SCANNER_VALIDATION',
  EVENT_PUBLISHING = 'EVENT_PUBLISHING',
  ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalTheaters: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers7d: number;
}
