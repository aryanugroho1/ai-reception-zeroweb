/**
 * TIER GATING & QUOTA MONITORING
 * PRD Section 4: Subscription Tiers & Feature Gates
 */

const PLAN_LIMITS = {
  STARTER: {
    name: 'Starter Solo Practice',
    price_idr: 149000,
    monthly_booking_quota: 150,
    max_doctors: 1,
    features: {
      SLOT_BOOKING: true,
      QUEUE_SYSTEM: true,
      BASIC_WHATSAPP_BOT: true,
      GOOGLE_CALENDAR_SYNC: false,
      ANALYTICS_PRO: false,
      MULTI_DOCTOR: false,
      CUSTOM_BRANDING: false,
      PRIORITY_SLA: false
    }
  },
  PRO: {
    name: 'Professional Clinic Suite',
    price_idr: 299000,
    monthly_booking_quota: 400,
    max_doctors: 1,
    features: {
      SLOT_BOOKING: true,
      QUEUE_SYSTEM: true,
      BASIC_WHATSAPP_BOT: true,
      GOOGLE_CALENDAR_SYNC: true,
      ANALYTICS_PRO: true,
      MULTI_DOCTOR: false,
      CUSTOM_BRANDING: true,
      PRIORITY_SLA: false,
      RESCHEDULE_SELF_SERVICE: true
    }
  },
  CLINIC: {
    name: 'Multi-Doctor Group Practice',
    price_idr: 599000,
    monthly_booking_quota: 1200,
    max_doctors: 3,
    features: {
      SLOT_BOOKING: true,
      QUEUE_SYSTEM: true,
      BASIC_WHATSAPP_BOT: true,
      GOOGLE_CALENDAR_SYNC: true,
      ANALYTICS_PRO: true,
      MULTI_DOCTOR: true,
      CUSTOM_BRANDING: true,
      PRIORITY_SLA: true,
      RESCHEDULE_SELF_SERVICE: true
    }
  },
  LIFETIME_PARTNER: {
    name: 'Lifetime Founder Partner',
    price_idr: 1490000, // One-time
    monthly_booking_quota: Infinity,
    max_doctors: 5,
    features: {
      SLOT_BOOKING: true,
      QUEUE_SYSTEM: true,
      BASIC_WHATSAPP_BOT: true,
      GOOGLE_CALENDAR_SYNC: true,
      ANALYTICS_PRO: true,
      MULTI_DOCTOR: true,
      CUSTOM_BRANDING: true,
      PRIORITY_SLA: true,
      RESCHEDULE_SELF_SERVICE: true,
      FOUNDER_BADGE: true
    }
  }
};

class TierGatingService {
  constructor(db) {
    this.db = db;
  }

  getPlanConfig(planName) {
    const plan = PLAN_LIMITS[planName];
    if (!plan) {
      throw new Error(`Invalid subscription plan: ${planName}`);
    }
    return plan;
  }

  assertFeatureAccess(tenantId, featureKey) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const plan = this.getPlanConfig(tenant.subscription_plan);
    if (!plan.features[featureKey]) {
      const error = new Error(`Feature [${featureKey}] is not available on ${tenant.subscription_plan} tier. Upgrade required.`);
      error.code = 'FEATURE_LOCKED';
      error.requiredPlan = featureKey === 'MULTI_DOCTOR' ? 'CLINIC' : 'PRO';
      throw error;
    }

    return true;
  }

  assertBookingQuotaAvailable(tenantId) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const plan = this.getPlanConfig(tenant.subscription_plan);
    if (plan.monthly_booking_quota === Infinity) {
      return { allowed: true, quota: Infinity, used: 0, remaining: Infinity };
    }

    // Calculate usage in current calendar month
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    let usedCount = 0;
    for (const appt of this.db.appointments.values()) {
      if (appt.tenant_id === tenantId && appt.status !== 'CANCELLED') {
        const apptDate = new Date(appt.created_at);
        if (apptDate.getUTCFullYear() === currentYear && apptDate.getUTCMonth() === currentMonth) {
          usedCount++;
        }
      }
    }

    if (usedCount >= plan.monthly_booking_quota) {
      const error = new Error(`Monthly booking quota exceeded for tenant ${tenant.name}. Limit is ${plan.monthly_booking_quota}, currently used ${usedCount}.`);
      error.code = 'QUOTA_EXCEEDED';
      error.used = usedCount;
      error.limit = plan.monthly_booking_quota;
      throw error;
    }

    return {
      allowed: true,
      quota: plan.monthly_booking_quota,
      used: usedCount,
      remaining: plan.monthly_booking_quota - usedCount
    };
  }
}

module.exports = {
  PLAN_LIMITS,
  TierGatingService
};
