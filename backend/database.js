/**
 * BACKEND DATABASE ENGINE (Relational PostgreSQL Engine Simulation)
 * Compliant with PRD.md (Sections 4, 6, 7, 8, 9, 10)
 * 
 * Tables implemented:
 * 1. tenants
 * 2. services (FK -> tenants.id ON DELETE CASCADE)
 * 3. appointments (FK -> tenants.id, services.id, parent_booking_id. btree_gist anti-overlap constraint, unique active customer slot)
 * 4. subscription_invoices (FK -> tenants.id)
 * 5. idempotency_records (FK -> tenants.id)
 * 6. user_sessions (FK -> tenants.id)
 * 
 * Views implemented:
 * 1. view_monthly_saas_revenue
 * 2. view_tenant_quota_monitoring
 */

const crypto = require('crypto');

class DatabaseEngine {
  constructor() {
    this.tenants = new Map();
    this.services = new Map();
    this.appointments = new Map();
    this.subscriptionInvoices = new Map();
    this.idempotencyRecords = new Map();
    this.userSessions = new Map();

    this.seedSampleData();
  }

  // --- Seed Registered Sample Tenants (PRD v3.0.0) ---
  seedSampleData() {
    // Tenant 1: drg. Maya Dental Care (PRO Tier, Appointment-based)
    const t1Id = 't-maya-001-uuid';
    this.tenants.set(t1Id, {
      id: t1Id,
      slug: 'drg_maya',
      name: 'drg. Maya Dental Care',
      owner_phone: '6281299887766',
      category: 'DENTAL',
      timezone: 'Asia/Jakarta',
      country_code: 'ID',
      scheduling_type: 'SLOT_BASED',
      is_accepting_patients: true,
      reschedule_cutoff_hours: 2,
      max_reschedule_count: 2,
      subscription_plan: 'PRO', // 400 monthly quota
      subscription_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date('2026-01-15T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString()
    });

    // Services for drg. Maya
    const s1Id = 'srv-maya-scaling';
    this.services.set(s1Id, {
      id: s1Id,
      tenant_id: t1Id,
      name: 'Scaling Karang Gigi',
      duration_minutes: 40,
      price: 250000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const s2Id = 'srv-maya-tambal';
    this.services.set(s2Id, {
      id: s2Id,
      tenant_id: t1Id,
      name: 'Tambal Estetik Gigi',
      duration_minutes: 45,
      price: 350000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const s3Id = 'srv-maya-cabut';
    this.services.set(s3Id, {
      id: s3Id,
      tenant_id: t1Id,
      name: 'Ekstraksi / Cabut Gigi',
      duration_minutes: 60,
      price: 500000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Tenant 2: dr. Rian Sp.PD (STARTER Tier, Queue-based)
    const t2Id = 't-rian-002-uuid';
    this.tenants.set(t2Id, {
      id: t2Id,
      slug: 'dr_rian_dalam',
      name: 'dr. Rian Sp.PD Praktek Mandiri',
      owner_phone: '6281311223344',
      category: 'GENERAL_SPECIALIST',
      timezone: 'Asia/Jakarta',
      country_code: 'ID',
      scheduling_type: 'QUEUE',
      is_accepting_patients: true,
      reschedule_cutoff_hours: 2,
      max_reschedule_count: 2,
      subscription_plan: 'STARTER', // 150 monthly quota
      subscription_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date('2026-02-01T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString()
    });

    const s4Id = 'srv-rian-konsul';
    this.services.set(s4Id, {
      id: s4Id,
      tenant_id: t2Id,
      name: 'Konsultasi Penyakit Dalam',
      duration_minutes: 15,
      price: 200000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Tenant 3: dr. Budi (LIFETIME_PARTNER Tier - Fase 1 Founder Pilot)
    const t3Id = 't-budi-003-uuid';
    this.tenants.set(t3Id, {
      id: t3Id,
      slug: 'dr_budi_umum',
      name: 'dr. Budi Praktek Umum Rumahan',
      owner_phone: '6281277665544',
      category: 'GENERAL_PRACTICE',
      timezone: 'Asia/Jakarta',
      country_code: 'ID',
      scheduling_type: 'QUEUE',
      is_accepting_patients: true,
      reschedule_cutoff_hours: 2,
      max_reschedule_count: 2,
      subscription_plan: 'LIFETIME_PARTNER', // Unlimited quota
      subscription_until: '2099-12-31T23:59:59Z',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString()
    });

    // Tenants 4 - 16 (PRD Milestone Active Tenants)
    const extraTenants = [
      { id: 't-siti-004-uuid', slug: 'drg_siti_ortho', name: 'drg. Siti Fadilah Orthodontics', phone: '6281122334455', plan: 'PRO', cat: 'DENTAL', subUntil: '2026-10-22' },
      { id: 't-hendra-005-uuid', slug: 'dr_hendra_anak', name: 'dr. Hendra Sp.A Anak Ceria', phone: '6281566778899', plan: 'STARTER', cat: 'PEDIATRICS', subUntil: '2026-10-30' },
      { id: 't-sarah-006-uuid', slug: 'dr_sarah_skin', name: 'dr. Sarah Estetika & Skincare', phone: '6281933445566', plan: 'CLINIC', cat: 'AESTHETICS', subUntil: '2026-11-04' },
      { id: 't-kevin-007-uuid', slug: 'drg_kevin_bali', name: 'drg. Kevin Dental Estetik Bali', phone: '6281377889900', plan: 'PRO', cat: 'DENTAL', subUntil: '2026-10-25' },
      { id: 't-anton-008-uuid', slug: 'dr_anton_jantung', name: 'dr. Anton Spesialis Jantung', phone: '6281244556677', plan: 'STARTER', cat: 'CARDIOLOGY', subUntil: '2026-10-19' },
      { id: 't-wahyu-009-uuid', slug: 'dr_wahyu_paru', name: 'dr. Wahyu Paru Mandiri', phone: '6281788990011', plan: 'STARTER', cat: 'PULMONOLOGY', subUntil: '2026-10-26' },
      { id: 't-linda-010-uuid', slug: 'drg_linda_jogja', name: 'drg. Linda Dental Care Jogja', phone: '6281233445588', plan: 'STARTER', cat: 'DENTAL', subUntil: '2026-10-27' },
      { id: 't-fajar-011-uuid', slug: 'dr_fajar_ortho', name: 'dr. Fajar Orthopedi Mandiri', phone: '6281511223377', plan: 'PRO', cat: 'ORTHOPEDICS', subUntil: '2026-10-20' },
      { id: 't-nadia-012-uuid', slug: 'dr_nadia_dermatology', name: 'dr. Nadia Kulit & Kelamin', phone: '6281900112244', plan: 'CLINIC', cat: 'DERMATOLOGY', subUntil: '2026-11-01' },
      { id: 't-gunawan-013-uuid', slug: 'dr_gunawan_mata', name: 'dr. Gunawan Spesialis Mata', phone: '6281288776655', plan: 'STARTER', cat: 'OPHTHALMOLOGY', subUntil: '2026-10-17' },
      { id: 't-lukman-014-uuid', slug: 'dr_lukman_obgyn', name: 'dr. Lukman Sp.OG Kebidanan Mandiri', phone: '6281344332211', plan: 'PRO', cat: 'OBGYN', subUntil: '2026-10-24' },
      { id: 't-melani-015-uuid', slug: 'dr_melani_keluarga', name: 'dr. Melani Praktek Keluarga', phone: '6281599881122', plan: 'STARTER', cat: 'FAMILY_PRACTICE', subUntil: '2026-10-28' },
      { id: 't-wawan-016-uuid', slug: 'drg_wawan_sby', name: 'drg. Wawan Gigi Keluarga Surabaya', phone: '6281800112233', plan: 'STARTER', cat: 'DENTAL', subUntil: '2026-10-21' }
    ];

    extraTenants.forEach(t => {
      this.tenants.set(t.id, {
        id: t.id,
        slug: t.slug,
        name: t.name,
        owner_phone: t.phone,
        category: t.cat,
        timezone: 'Asia/Jakarta',
        country_code: 'ID',
        scheduling_type: 'SLOT_BASED',
        is_accepting_patients: true,
        reschedule_cutoff_hours: 2,
        max_reschedule_count: 2,
        subscription_plan: t.plan,
        subscription_until: `${t.subUntil}T23:59:59.000Z`,
        created_at: new Date('2026-02-01T00:00:00Z').toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    // Sample Active Invoices
    const sampleInvoices = [
      { id: 'INV-MYR-849201', tenant_id: t1Id, plan: 'PRO', amount: 299000, paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'INV-MYR-849202', tenant_id: 't-sarah-006-uuid', plan: 'CLINIC', amount: 599000, paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'INV-MYR-849203', tenant_id: 't-lukman-014-uuid', plan: 'PRO', amount: 299000, paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'INV-MYR-849204', tenant_id: t2Id, plan: 'STARTER', amount: 149000, paid_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'INV-MYR-849205', tenant_id: 't-siti-004-uuid', plan: 'PRO', amount: 299000, paid_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    sampleInvoices.forEach(inv => {
      this.subscriptionInvoices.set(inv.id, {
        id: inv.id,
        tenant_id: inv.tenant_id,
        invoice_number: inv.id,
        plan_tier: inv.plan,
        amount: inv.amount,
        payment_provider: 'MAYAR',
        payment_ref_id: `PAY-REF-${inv.id}`,
        status: 'PAID',
        paid_at: inv.paid_at,
        created_at: inv.paid_at,
        updated_at: new Date().toISOString()
      });
    });

    // Sample Past & Active Appointments for drg. Maya
    const today = new Date().toISOString().slice(0, 10);

    const apt1Id = 'apt-101-uuid';
    this.appointments.set(apt1Id, {
      id: apt1Id,
      tenant_id: t1Id,
      service_id: s1Id,
      customer_phone: '62812340001',
      customer_name: 'Budi Santoso',
      queue_number: 1,
      duration_minutes: 40,
      start_time: `${today}T08:00:00.000Z`,
      end_time: `${today}T08:40:00.000Z`,
      scheduled_time: `${today}T08:00:00.000Z`,
      actual_start_time: `${today}T08:00:00.000Z`,
      actual_end_time: `${today}T08:35:00.000Z`,
      status: 'COMPLETED',
      parent_booking_id: null,
      reschedule_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const apt2Id = 'apt-102-uuid';
    this.appointments.set(apt2Id, {
      id: apt2Id,
      tenant_id: t1Id,
      service_id: s2Id,
      customer_phone: '62812340002',
      customer_name: 'Ratna Dewi',
      queue_number: 2,
      duration_minutes: 45,
      start_time: `${today}T09:00:00.000Z`,
      end_time: `${today}T09:45:00.000Z`,
      scheduled_time: `${today}T09:00:00.000Z`,
      status: 'CONFIRMED',
      parent_booking_id: null,
      reschedule_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const apt3Id = 'apt-103-uuid';
    this.appointments.set(apt3Id, {
      id: apt3Id,
      tenant_id: t1Id,
      service_id: s3Id,
      customer_phone: '62812340003',
      customer_name: 'Ahmad Fauzi',
      queue_number: 3,
      duration_minutes: 60,
      start_time: `${today}T10:00:00.000Z`,
      end_time: `${today}T11:00:00.000Z`,
      scheduled_time: `${today}T10:00:00.000Z`,
      status: 'CONFIRMED',
      parent_booking_id: null,
      reschedule_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // --- Tenants Operations ---
  getTenantById(tenantId) {
    return this.tenants.get(tenantId) || null;
  }

  getTenantBySlug(slug) {
    if (!slug) return null;
    for (const tenant of this.tenants.values()) {
      if (tenant.slug.toLowerCase() === slug.toLowerCase()) return tenant;
    }
    return null;
  }

  getTenantByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    for (const tenant of this.tenants.values()) {
      if (tenant.owner_phone === cleanPhone) return tenant;
    }
    return null;
  }

  getAllTenants() {
    return Array.from(this.tenants.values());
  }

  createTenant(data) {
    const id = data.id || `t-${crypto.randomUUID()}`;
    const tenant = {
      id,
      slug: data.slug,
      name: data.name,
      owner_phone: (data.owner_phone || '').replace(/[^0-9]/g, ''),
      category: data.category || 'GENERAL_PRACTICE',
      timezone: data.timezone || 'Asia/Jakarta',
      country_code: data.country_code || 'ID',
      scheduling_type: data.scheduling_type || 'SLOT_BASED',
      is_accepting_patients: data.is_accepting_patients !== undefined ? data.is_accepting_patients : true,
      reschedule_cutoff_hours: data.reschedule_cutoff_hours !== undefined ? data.reschedule_cutoff_hours : 2,
      max_reschedule_count: data.max_reschedule_count !== undefined ? data.max_reschedule_count : 2,
      subscription_plan: data.subscription_plan || 'STARTER',
      subscription_until: data.subscription_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  deleteTenant(tenantId) {
    if (!this.tenants.has(tenantId)) return false;

    // ON DELETE CASCADE: Delete related services
    for (const [sId, service] of this.services.entries()) {
      if (service.tenant_id === tenantId) {
        this.services.delete(sId);
      }
    }

    // ON DELETE CASCADE: Delete related appointments
    for (const [aId, appt] of this.appointments.entries()) {
      if (appt.tenant_id === tenantId) {
        this.appointments.delete(aId);
      }
    }

    // ON DELETE CASCADE: Delete related invoices
    for (const [iId, inv] of this.subscriptionInvoices.entries()) {
      if (inv.tenant_id === tenantId) {
        this.subscriptionInvoices.delete(iId);
      }
    }

    this.tenants.delete(tenantId);
    return true;
  }

  // --- Services Operations ---
  getServicesByTenant(tenantId) {
    return Array.from(this.services.values()).filter(s => s.tenant_id === tenantId && s.is_active);
  }

  getServiceById(serviceId) {
    return this.services.get(serviceId) || null;
  }

  createService(data) {
    // Foreign key validation: tenant_id must exist
    if (!this.tenants.has(data.tenant_id)) {
      const err = new Error(`Foreign key constraint violation: tenant_id '${data.tenant_id}' does not exist.`);
      err.code = '23503';
      throw err;
    }

    const id = data.id || `srv-${crypto.randomUUID()}`;
    const service = {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
      duration_minutes: data.duration_minutes || 30,
      price: data.price !== undefined ? data.price : 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.services.set(id, service);
    return service;
  }

  // --- Appointments & Anti-Overlap (GIST Range-Lock Simulation) ---
  /**
   * Evaluates PostgreSQL btree_gist anti-overlap constraint:
   * EXCLUDE USING gist (
   *   tenant_id WITH =,
   *   tstzrange(start_time, end_time) WITH &&
   * ) WHERE status NOT IN ('CANCELLED', 'NO_SHOW', 'RESCHEDULED')
   */
  checkSlotOverlap(tenantId, newStartTime, endTimeOrDuration, excludeAppointmentId = null) {
    const newStart = new Date(newStartTime).getTime();
    let newEnd;
    if (typeof endTimeOrDuration === 'number') {
      newEnd = newStart + endTimeOrDuration * 60 * 1000;
    } else {
      newEnd = new Date(endTimeOrDuration).getTime();
    }

    for (const apt of this.appointments.values()) {
      if (apt.tenant_id !== tenantId) continue;
      if (apt.id === excludeAppointmentId) continue;
      if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW' || apt.status === 'RESCHEDULED') continue;

      const existingStart = new Date(apt.start_time || apt.scheduled_time).getTime();
      let existingEnd;
      if (apt.end_time) {
        existingEnd = new Date(apt.end_time).getTime();
      } else {
        existingEnd = existingStart + (apt.duration_minutes || 30) * 60 * 1000;
      }

      // Range overlap formula: (newStart < existingEnd) && (newEnd > existingStart)
      if (newStart < existingEnd && newEnd > existingStart) {
        return {
          collision: true,
          collidingAppointment: apt
        };
      }
    }
    return null;
  }

  /**
   * Unique active customer slot constraint:
   * Check if customer already has a CONFIRMED or IN_CONSULTATION appointment
   */
  checkCustomerActiveSlot(tenantId, customerPhone, excludeAppointmentId = null) {
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    for (const apt of this.appointments.values()) {
      if (apt.tenant_id === tenantId &&
          apt.id !== excludeAppointmentId &&
          (apt.status === 'CONFIRMED' || apt.status === 'IN_CONSULTATION')) {
        const aptPhone = (apt.customer_phone || '').replace(/[^0-9]/g, '');
        if (aptPhone === cleanPhone) {
          return { exists: true, appointment: apt };
        }
      }
    }
    return null;
  }

  createAppointment(data) {
    // 1. FK Tenant Validation
    if (!this.tenants.has(data.tenant_id)) {
      const err = new Error(`Foreign key constraint violation: tenant_id '${data.tenant_id}' does not exist.`);
      err.code = '23503';
      throw err;
    }

    // 2. FK Service Validation (if provided)
    if (data.service_id && !this.services.has(data.service_id)) {
      const err = new Error(`Foreign key constraint violation: service_id '${data.service_id}' does not exist.`);
      err.code = '23503';
      throw err;
    }

    // 3. FK Parent Booking Validation (for Reschedule)
    if (data.parent_booking_id && !this.appointments.has(data.parent_booking_id)) {
      const err = new Error(`Foreign key constraint violation: parent_booking_id '${data.parent_booking_id}' does not exist.`);
      err.code = '23503';
      throw err;
    }

    const startTime = data.start_time || data.scheduled_time;
    let endTime = data.end_time;
    const duration = data.duration_minutes || (data.service_id ? this.services.get(data.service_id).duration_minutes : 30);
    if (!endTime && startTime) {
      endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();
    }

    // 4. Unique Active Customer Slot Constraint
    const activeCheck = this.checkCustomerActiveSlot(data.tenant_id, data.customer_phone, data.parent_booking_id);
    if (activeCheck) {
      const err = new Error(`Customer already has an active appointment (ID: ${activeCheck.appointment.id}). Only one active slot allowed.`);
      err.code = 'ACTIVE_APPOINTMENT_EXISTS';
      err.statusCode = 409;
      err.existingAppointment = activeCheck.appointment;
      throw err;
    }

    // 5. Anti-Overlap GIST Constraint Check
    const overlapCheck = this.checkSlotOverlap(data.tenant_id, startTime, endTime, data.parent_booking_id);
    if (overlapCheck) {
      const err = new Error(`Slot collision: The requested slot ${startTime} to ${endTime} overlaps with existing appointment.`);
      err.code = 'SLOT_OVERLAP';
      err.statusCode = 409;
      err.collidingAppointment = overlapCheck.collidingAppointment;
      throw err;
    }

    const id = data.id || `apt-${crypto.randomUUID()}`;
    const apt = {
      id,
      tenant_id: data.tenant_id,
      service_id: data.service_id || null,
      customer_phone: data.customer_phone,
      customer_name: data.customer_name,
      queue_number: data.queue_number || null,
      duration_minutes: duration,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      scheduled_time: new Date(startTime).toISOString(),
      actual_start_time: data.actual_start_time || null,
      actual_end_time: data.actual_end_time || null,
      status: data.status || 'CONFIRMED',
      parent_booking_id: data.parent_booking_id || null,
      reschedule_count: data.reschedule_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.appointments.set(id, apt);
    return apt;
  }

  // --- Subscription Invoices Operations ---
  createSubscriptionInvoice(data) {
    if (!this.tenants.has(data.tenant_id)) {
      const err = new Error(`Foreign key constraint violation: tenant_id '${data.tenant_id}' does not exist.`);
      err.code = '23503';
      throw err;
    }

    const id = data.id || `inv-${crypto.randomUUID()}`;
    const invoice = {
      id,
      tenant_id: data.tenant_id,
      invoice_number: data.invoice_number || `INV-${Date.now()}`,
      plan_tier: data.plan_tier || 'PRO',
      amount: data.amount,
      payment_provider: data.payment_provider || 'MAYAR',
      status: data.status || 'PENDING',
      paid_at: data.paid_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.subscriptionInvoices.set(id, invoice);
    return invoice;
  }

  // --- Idempotency Records Operations ---
  getIdempotencyRecord(tenantIdOrKey, optionalKey = null) {
    if (optionalKey) {
      // composite lookup
      for (const rec of this.idempotencyRecords.values()) {
        if (rec.tenant_id === tenantIdOrKey && rec.idempotency_key === optionalKey) {
          return rec;
        }
      }
      return null;
    }
    return this.idempotencyRecords.get(tenantIdOrKey) || null;
  }

  saveIdempotencyRecord(data) {
    const id = data.id || `idem-${crypto.randomUUID()}`;
    const record = {
      id,
      tenant_id: data.tenant_id,
      idempotency_key: data.idempotency_key,
      payload_hash: data.payload_hash,
      response_status: data.response_status,
      response_body: data.response_body,
      expires_at: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    this.idempotencyRecords.set(id, record);
    return record;
  }

  // --- User Sessions Operations ---
  getSession(phoneNumber) {
    return this.userSessions.get(phoneNumber) || null;
  }

  saveSession(phoneNumber, data) {
    const session = {
      phone_number: phoneNumber,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.userSessions.set(phoneNumber, session);
    return session;
  }

  // --- SQL Views Aggregations (PRD Section 10) ---
  getViewMonthlySaasRevenue() {
    const monthlyMap = new Map();

    for (const inv of this.subscriptionInvoices.values()) {
      if (inv.status === 'PAID') {
        const date = new Date(inv.paid_at || inv.created_at);
        const billingMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

        if (!monthlyMap.has(billingMonth)) {
          monthlyMap.set(billingMonth, {
            billing_month: billingMonth,
            successful_transactions: 0,
            gross_revenue_idr: 0,
            tenant_ids: new Set()
          });
        }

        const m = monthlyMap.get(billingMonth);
        m.successful_transactions++;
        m.gross_revenue_idr += Number(inv.amount);
        m.tenant_ids.add(inv.tenant_id);
      }
    }

    return Array.from(monthlyMap.values()).map(item => ({
      billing_month: item.billing_month,
      successful_transactions: item.successful_transactions,
      gross_revenue_idr: item.gross_revenue_idr,
      total_paying_tenants: item.tenant_ids.size
    }));
  }

  getViewTenantQuotaMonitoring() {
    const PLAN_QUOTA_MAP = {
      STARTER: 150,
      PRO: 400,
      CLINIC: 1200,
      LIFETIME_PARTNER: 'UNLIMITED'
    };

    const results = [];
    const now = new Date();
    const curYear = now.getUTCFullYear();
    const curMonth = now.getUTCMonth();

    for (const tenant of this.tenants.values()) {
      let currentBookings = 0;
      for (const a of this.appointments.values()) {
        if (a.tenant_id === tenant.id && a.status !== 'CANCELLED') {
          const aDate = new Date(a.created_at);
          if (aDate.getUTCFullYear() === curYear && aDate.getUTCMonth() === curMonth) {
            currentBookings++;
          }
        }
      }

      results.push({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        slug: tenant.slug,
        subscription_plan: tenant.subscription_plan,
        subscription_until: tenant.subscription_until,
        current_month_bookings: currentBookings,
        max_allowed_quota: PLAN_QUOTA_MAP[tenant.subscription_plan] || 150
      });
    }
    return results;
  }
}

// Singleton export
const db = new DatabaseEngine();
module.exports = { db, DatabaseEngine };
