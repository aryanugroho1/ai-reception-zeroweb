/**
 * COMPREHENSIVE AUTOMATED TEST SUITE
 * Verifies Relations, Foreign Keys, btree_gist Anti-Overlap, Idempotency Matrix,
 * Reschedule Atomic Swap, Mayar HMAC Webhook, Doctor Copilot, and REST APIs.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const crypto = require('crypto');
const { DatabaseEngine } = require('./database');
const { TierGatingService, PLAN_LIMITS } = require('./tier_gating');
const { IdempotencyService } = require('./idempotency');
const { RescheduleService } = require('./reschedule');
const { MayarPaymentService } = require('./mayar_service');
const { DoctorCopilotEngine } = require('./doctor_copilot');
const { IngressRouter } = require('./ingress_router');
const { AppServer } = require('./server');

// Color helpers for terminal output
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testLogs = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    failedTests++;
    const err = `  ❌ FAIL: ${message}`;
    console.error(red(err));
    testLogs.push({ status: 'FAIL', message });
    throw new Error(message);
  } else {
    passedTests++;
    const ok = `  ✅ PASS: ${message}`;
    console.log(green(ok));
    testLogs.push({ status: 'PASS', message });
  }
}

async function runTestSuite() {
  console.log(bold('\n======================================================'));
  console.log(bold('🚀 STARTING BACKEND COMPREHENSIVE VERIFICATION SUITE'));
  console.log(bold('   ZeroWeb AI Receptionist Engine v3.0.0-PROD-COMPLETE'));
  console.log(bold('======================================================\n'));

  // -------------------------------------------------------------
  // TEST GROUP 1: Relational Schema, Seed Data & Foreign Keys
  // -------------------------------------------------------------
  console.log(bold('--- TEST SUITE 1: Relational Schema, Seed Data & Foreign Keys ---'));
  {
    const db = new DatabaseEngine();

    // Verify Registered Sample Tenants
    const maya = db.getTenantBySlug('drg_maya');
    const rian = db.getTenantBySlug('dr_rian_dalam');
    const budi = db.getTenantBySlug('dr_budi_umum');

    assert(maya !== undefined && maya.subscription_plan === 'PRO', 'Tenant drg. Maya Dental Care seeded correctly (PRO)');
    assert(rian !== undefined && rian.subscription_plan === 'STARTER', 'Tenant dr. Rian Sp.PD seeded correctly (STARTER)');
    assert(budi !== undefined && budi.subscription_plan === 'LIFETIME_PARTNER', 'Tenant dr. Budi Praktek Umum seeded correctly (LIFETIME_PARTNER)');

    // Verify Services FK
    const mayaServices = db.getServicesByTenant(maya.id);
    assert(mayaServices.length === 3, 'drg. Maya has 3 active services configured');

    // FK Constraint Test: Cannot create service with non-existent tenant
    let fkFailed = false;
    try {
      db.createService({
        tenant_id: 'non-existent-tenant-uuid',
        name: 'Ghost Service',
        duration_minutes: 30,
        price: 100000
      });
    } catch (err) {
      fkFailed = true;
      assert(err.message.includes('Foreign key constraint violation'), 'FK Enforcement: Cannot create service for non-existent tenant');
    }
    assert(fkFailed, 'Foreign key validation threw error as expected');

    // Cascade Delete Test
    const tempTenant = db.createTenant({
      slug: 'temp_doc',
      name: 'dr. Temp Cascade',
      owner_phone: '62899999999',
      subscription_plan: 'STARTER'
    });
    const tempService = db.createService({
      tenant_id: tempTenant.id,
      name: 'Temp Consultation',
      duration_minutes: 20,
      price: 50000
    });
    const tempAppt = db.createAppointment({
      tenant_id: tempTenant.id,
      service_id: tempService.id,
      customer_name: 'Temp Patient',
      customer_phone: '6280000000',
      start_time: '2026-10-10T10:00:00.000Z',
      end_time: '2026-10-10T10:20:00.000Z'
    });

    assert(db.services.has(tempService.id) && db.appointments.has(tempAppt.id), 'Temp tenant and children created');
    db.deleteTenant(tempTenant.id);
    assert(!db.tenants.has(tempTenant.id), 'Temp tenant deleted');
    assert(!db.services.has(tempService.id), 'ON DELETE CASCADE: Services purged on tenant deletion');
    assert(!db.appointments.has(tempAppt.id), 'ON DELETE CASCADE: Appointments purged on tenant deletion');
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: PostgreSQL btree_gist Anti-Overlap Simulation
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 2: Anti-Overlap Constraint (btree_gist) ---'));
  {
    const db = new DatabaseEngine();
    const maya = db.getTenantBySlug('drg_maya');
    const service = db.getServicesByTenant(maya.id)[0];

    // Book first appointment: 2026-10-15 09:00 - 09:40
    const appt1 = db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Patient Alpha',
      customer_phone: '62811111111',
      start_time: '2026-10-15T09:00:00.000Z',
      end_time: '2026-10-15T09:40:00.000Z',
      status: 'CONFIRMED'
    });
    assert(appt1.id !== undefined, 'Initial slot 09:00-09:40 booked successfully');

    // Attempt overlapping appointment: 2026-10-15 09:20 - 10:00 (overlaps by 20 mins)
    let overlapPrevented = false;
    try {
      db.createAppointment({
        tenant_id: maya.id,
        service_id: service.id,
        customer_name: 'Patient Beta',
        customer_phone: '62822222222',
        start_time: '2026-10-15T09:20:00.000Z',
        end_time: '2026-10-15T10:00:00.000Z',
        status: 'CONFIRMED'
      });
    } catch (err) {
      overlapPrevented = true;
      assert(err.code === 'SLOT_OVERLAP', 'Anti-overlap prevented double booking on overlapping slot');
    }
    assert(overlapPrevented, 'Overlapping appointment was blocked');

    // Attempt adjacent appointment: 2026-10-15 09:40 - 10:20 (exact boundary -> should SUCCEED)
    const apptAdjacent = db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Patient Gamma',
      customer_phone: '62833333333',
      start_time: '2026-10-15T09:40:00.000Z',
      end_time: '2026-10-15T10:20:00.000Z',
      status: 'CONFIRMED'
    });
    assert(apptAdjacent.id !== undefined, 'Adjacent slot 09:40-10:20 allowed without conflict');

    // Cross-tenant non-interference: another tenant can book at 09:00
    const rian = db.getTenantBySlug('dr_rian_dalam');
    const rianService = db.getServicesByTenant(rian.id)[0];
    const rianAppt = db.createAppointment({
      tenant_id: rian.id,
      service_id: rianService.id,
      customer_name: 'Patient Delta',
      customer_phone: '62844444444',
      start_time: '2026-10-15T09:00:00.000Z',
      end_time: '2026-10-15T09:30:00.000Z',
      status: 'CONFIRMED'
    });
    assert(rianAppt.id !== undefined, 'Multi-tenant isolation: different tenant can use same timestamp');
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Unique Active Customer Slot Constraint
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 3: Unique Active Customer Slot Constraint ---'));
  {
    const db = new DatabaseEngine();
    const maya = db.getTenantBySlug('drg_maya');
    const service = db.getServicesByTenant(maya.id)[0];

    // Customer books Slot 1 on Day A
    db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Siti Aminah',
      customer_phone: '62855555555',
      start_time: '2026-10-20T10:00:00.000Z',
      end_time: '2026-10-20T10:40:00.000Z',
      status: 'CONFIRMED'
    });

    // Same customer attempts second active booking on Day B
    let duplicateCustomerBlocked = false;
    try {
      db.createAppointment({
        tenant_id: maya.id,
        service_id: service.id,
        customer_name: 'Siti Aminah',
        customer_phone: '62855555555',
        start_time: '2026-10-21T10:00:00.000Z',
        end_time: '2026-10-21T10:40:00.000Z',
        status: 'CONFIRMED'
      });
    } catch (err) {
      duplicateCustomerBlocked = true;
      assert(err.code === 'ACTIVE_APPOINTMENT_EXISTS', 'unique_active_customer_slot blocked customer with existing active booking');
    }
    assert(duplicateCustomerBlocked, 'Duplicate active slot blocked for same customer phone');
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Tier Gating & Quota Monitoring
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 4: Tier Gating & Quotas ---'));
  {
    const db = new DatabaseEngine();
    const tierService = new TierGatingService(db);

    const rian = db.getTenantBySlug('dr_rian_dalam'); // STARTER
    const maya = db.getTenantBySlug('drg_maya'); // PRO
    const budi = db.getTenantBySlug('dr_budi_umum'); // LIFETIME_PARTNER

    // Feature gate check: Google Calendar Sync is disabled on STARTER, enabled on PRO
    let featureBlocked = false;
    try {
      tierService.assertFeatureAccess(rian.id, 'GOOGLE_CALENDAR_SYNC');
    } catch (err) {
      featureBlocked = true;
      assert(err.code === 'FEATURE_LOCKED', 'Feature gate: STARTER tier cannot access GOOGLE_CALENDAR_SYNC');
    }
    assert(featureBlocked, 'Feature locked error thrown properly');
    assert(tierService.assertFeatureAccess(maya.id, 'GOOGLE_CALENDAR_SYNC'), 'PRO tier has GOOGLE_CALENDAR_SYNC');

    // Lifetime quota check
    const budiQuota = tierService.assertBookingQuotaAvailable(budi.id);
    assert(budiQuota.quota === Infinity, 'LIFETIME_PARTNER has unlimited booking quota');
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Exactly-Once Idempotency 7 Concurrency Scenarios
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 5: Exactly-Once Idempotency Matrix (7 Scenarios) ---'));
  {
    const db = new DatabaseEngine();
    const idempotency = new IdempotencyService(db);
    const tenantId = 't-maya-001-uuid';
    const key = 'idem-req-12345';
    const payload = { service_id: 'srv-1', time: '2026-10-25T10:00:00Z' };

    let executionCount = 0;
    const task = async () => {
      executionCount++;
      return { status: 201, body: { booking_id: 'b-999', executionCount } };
    };

    // Scenario 1: First time request -> Process, store 201
    const res1 = await idempotency.execute({ tenantId, idempotencyKey: key, payload, fn: task });
    assert(res1.status === 201 && res1.cached === false && executionCount === 1, 'Scenario 1: First time request executed cleanly');

    // Scenario 2: Same key + same payload within 24h -> cached response (200 OK)
    const res2 = await idempotency.execute({ tenantId, idempotencyKey: key, payload, fn: task });
    assert(res2.status === 201 && res2.cached === true && executionCount === 1, 'Scenario 2: Duplicate key returned cached response without re-executing');

    // Scenario 3: Same key + different payload -> 409 Conflict
    let mismatchThrown = false;
    try {
      const differentPayload = { service_id: 'srv-2', time: '2026-10-25T11:00:00Z' };
      await idempotency.execute({ tenantId, idempotencyKey: key, payload: differentPayload, fn: task });
    } catch (err) {
      mismatchThrown = true;
      assert(err.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'Scenario 3: 409 Conflict on payload mismatch for same key');
    }
    assert(mismatchThrown, 'Payload mismatch conflict caught');

    // Scenario 4: Concurrent request on in-flight key -> 409 Conflict
    const inflightKey = 'inflight-test-key';
    const inflightPayload = { test: true };
    idempotency.inFlightLocks.set(`${tenantId}:${inflightKey}`, Date.now());
    let inflightCaught = false;
    try {
      await idempotency.execute({ tenantId, idempotencyKey: inflightKey, payload: inflightPayload, fn: task });
    } catch (err) {
      inflightCaught = true;
      assert(err.code === 'IDEMPOTENCY_IN_FLIGHT', 'Scenario 4: Concurrent in-flight request caught and rejected with 409');
    }
    assert(inflightCaught, 'In-flight lock enforced');
    idempotency.inFlightLocks.delete(`${tenantId}:${inflightKey}`);

    // Scenario 5: Expired key (>24h) -> re-process fresh
    const expiredKey = 'expired-key-1';
    db.saveIdempotencyRecord({
      tenant_id: tenantId,
      idempotency_key: expiredKey,
      payload_hash: idempotency.calculatePayloadHash(payload),
      response_status: 201,
      response_body: { old: true },
      expires_at: new Date(Date.now() - 1000).toISOString() // expired in past
    });
    let reprocessCount = 0;
    const res5 = await idempotency.execute({
      tenantId,
      idempotencyKey: expiredKey,
      payload,
      fn: async () => {
        reprocessCount++;
        return { status: 201, body: { fresh: true } };
      }
    });
    assert(res5.cached === false && res5.body.fresh === true && reprocessCount === 1, 'Scenario 5: Expired key purged and re-processed fresh');

    // Scenario 6: Prior failed request -> allow retry
    const failKey = 'retry-fail-key';
    db.saveIdempotencyRecord({
      tenant_id: tenantId,
      idempotency_key: failKey,
      payload_hash: idempotency.calculatePayloadHash(payload),
      response_status: 500, // failed status
      response_body: { error: 'Database timeout' },
      expires_at: new Date(Date.now() + 100000).toISOString()
    });
    const res6 = await idempotency.execute({
      tenantId,
      idempotencyKey: failKey,
      payload,
      fn: async () => ({ status: 201, body: { recovered: true } })
    });
    assert(res6.status === 201 && res6.body.recovered === true, 'Scenario 6: Prior error allowed retry and recovered');

    // Scenario 7: Cross-tenant isolation -> same key for Tenant A and Tenant B
    const tenantB = 't-rian-002-uuid';
    let tenantBExec = false;
    const res7 = await idempotency.execute({
      tenantId: tenantB,
      idempotencyKey: key, // same key as Tenant A in Scenario 1
      payload,
      fn: async () => {
        tenantBExec = true;
        return { status: 201, body: { forTenantB: true } };
      }
    });
    assert(tenantBExec && res7.body.forTenantB === true, 'Scenario 7: Cross-tenant key isolation verified');
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: Customer Rescheduling (Atomic Swap & Cutoff)
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 6: Customer Rescheduling (Atomic Swap & Cutoff) ---'));
  {
    const db = new DatabaseEngine();
    const rescheduleService = new RescheduleService(db);
    const maya = db.createTenant({
      name: 'Reschedule Test Practice',
      slug: 'reschedule_test_practice',
      owner_phone: '62899990000',
      category: 'GENERAL'
    });
    const service = db.createService({
      tenant_id: maya.id,
      name: 'Konsultasi Reschedule',
      duration_minutes: 40,
      price: 150000
    });

    // Case A: Cutoff Exceeded (appointment starts in 30 mins, cutoff is 2h)
    const imminentStart = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const imminentEnd = new Date(Date.now() + 70 * 60 * 1000).toISOString();
    const apptImminent = db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Budi Darmawan',
      customer_phone: '62877777777',
      start_time: imminentStart,
      end_time: imminentEnd,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Booked in advance (yesterday)
      status: 'CONFIRMED'
    });

    let cutoffCaught = false;
    try {
      await rescheduleService.rescheduleAppointment({
        tenantId: maya.id,
        appointmentId: apptImminent.id,
        newStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    } catch (err) {
      cutoffCaught = true;
      assert(err.code === 'RESCHEDULE_CUTOFF_EXCEEDED', 'Reschedule cutoff: Blocked rescheduling within H-2 hours window for advance booking');
    }
    assert(cutoffCaught, 'Cutoff constraint verified for advance booking');

    // Case A2: Recent Booking Grace Period (Booked recently < 30 mins, allows reschedule even within cutoff)
    const recentBookingStart = new Date(Date.now() + 75 * 60 * 1000).toISOString();
    const apptRecent = db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Rudi Pratama',
      customer_phone: '62877777776',
      start_time: recentBookingStart,
      end_time: new Date(Date.now() + 115 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(), // Just booked 1 second ago
      status: 'CONFIRMED'
    });

    const recentResched = await rescheduleService.rescheduleAppointment({
      tenantId: maya.id,
      appointmentId: apptRecent.id,
      newStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      customerPhone: '62877777776'
    });
    assert(recentResched.success === true, 'Grace period: Newly booked appointment successfully rescheduled despite short notice');

    // Case B: Valid Atomic Reschedule
    const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 72.66 * 60 * 60 * 1000).toISOString();
    const validAppt = db.createAppointment({
      tenant_id: maya.id,
      service_id: service.id,
      customer_name: 'Dewi Lestari',
      customer_phone: '62888888888',
      start_time: futureStart,
      end_time: futureEnd,
      status: 'CONFIRMED'
    });

    const targetNewStart = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString();
    const reschedResult = await rescheduleService.rescheduleAppointment({
      tenantId: maya.id,
      appointmentId: validAppt.id,
      newStartTime: targetNewStart,
      customerPhone: '62888888888'
    });

    assert(reschedResult.success === true, 'Reschedule atomic swap completed successfully');
    assert(validAppt.status === 'RESCHEDULED', 'Original appointment marked as RESCHEDULED');
    assert(reschedResult.new_appointment.parent_booking_id === validAppt.id, 'New appointment has parent_booking_id');
    assert(reschedResult.new_appointment.reschedule_count === 1, 'reschedule_count incremented to 1');

    // Case C: Exceeding Max Reschedule Count
    reschedResult.new_appointment.reschedule_count = 2; // set to maximum allowed (2x)
    let maxCountCaught = false;
    try {
      await rescheduleService.rescheduleAppointment({
        tenantId: maya.id,
        appointmentId: reschedResult.new_appointment.id,
        newStartTime: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString()
      });
    } catch (err) {
      maxCountCaught = true;
      assert(err.code === 'MAX_RESCHEDULE_EXCEEDED', 'Blocked reschedule exceeding 2x maximum limit');
    }
    assert(maxCountCaught, 'Max reschedule limit verified');
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: Mayar.id Payment Webhook & HMAC Signature
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 7: Mayar Payment & HMAC-SHA256 Webhook ---'));
  {
    const db = new DatabaseEngine();
    const webhookSecret = 'test_mayar_secret_123';
    const mayar = new MayarPaymentService(db, { webhookSecret });
    const rian = db.getTenantBySlug('dr_rian_dalam'); // currently STARTER

    // 1. Create Invoice
    const invoice = await mayar.createSubscriptionInvoice({
      tenantId: rian.id,
      planKey: 'PRO'
    });
    assert((invoice.amount === 199000 || invoice.amount === 299000) && invoice.status === 'PENDING', 'Mayar invoice created for PRO tier upgrade');

    // 2. Test Invalid HMAC Signature
    let invalidSigCaught = false;
    try {
      await mayar.handleWebhook({
        signature: 'invalid_sha256_hex_digest',
        payload: { event: 'payment.received', data: { invoice_id: invoice.invoice_id, status: 'PAID' } },
        rawBody: JSON.stringify({ event: 'payment.received', data: { invoice_id: invoice.invoice_id, status: 'PAID' } })
      });
    } catch (err) {
      invalidSigCaught = true;
      assert(err.code === 'INVALID_SIGNATURE', 'Mayar Webhook: Invalid HMAC-SHA256 signature rejected with 401');
    }
    assert(invalidSigCaught, 'Invalid signature rejected');

    // 3. Test Valid HMAC Signature & Subscription Extension
    const validPayload = {
      event: 'payment.received',
      data: {
        invoice_id: invoice.invoice_id,
        tenant_id: rian.id,
        plan_tier: 'PRO',
        amount: 299000,
        status: 'PAID'
      }
    };
    const validRawBody = JSON.stringify(validPayload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(validRawBody).digest('hex');

    const webhookResult = await mayar.handleWebhook({
      signature: validSignature,
      payload: validPayload,
      rawBody: validRawBody
    });

    assert(webhookResult.handled === true, 'Valid Mayar webhook handled successfully');
    assert(rian.subscription_plan === 'PRO', 'Tenant upgraded to PRO tier automatically');
    assert(webhookResult.receipt_message.includes('LUNAS (PAID)'), 'WhatsApp payment receipt generated');
  }

  // -------------------------------------------------------------
  // TEST GROUP 8: Doctor Copilot Tool Calling & Commands
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 8: Doctor Copilot Tool Calling & Commands ---'));
  {
    const db = new DatabaseEngine();
    const copilot = new DoctorCopilotEngine(db);
    const maya = db.getTenantBySlug('drg_maya');
    const doctorPhone = maya.owner_phone;

    // Command: BUKA & TUTUP
    const closeRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'TUTUP', doctorPhone });
    assert(maya.is_accepting_patients === false, 'Command TUTUP paused practice');

    const openRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'BUKA', doctorPhone });
    assert(maya.is_accepting_patients === true, 'Command BUKA resumed practice');

    // Command: DASHBOARD
    const dashRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'DASHBOARD', doctorPhone });
    assert(dashRes.action === 'DASHBOARD' && dashRes.chart_url.includes('quickchart.io'), 'Command DASHBOARD generated QuickChart URL');
    assert(dashRes.charts && dashRes.charts.today && dashRes.charts.week && dashRes.charts.month, 'Command DASHBOARD generated 3 visual charts (Today, Week Daily, Month Weekly)');

    // Command: TARIF (List)
    const tarifListRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'TARIF', doctorPhone });
    assert(tarifListRes.action === 'SERVICES_LIST' && tarifListRes.services.length >= 1, 'Command TARIF returned active services list');

    // Command: TARIF 1 280000 (Update Price)
    const tarifUpdateRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'TARIF 1 280000', doctorPhone });
    assert(tarifUpdateRes.action === 'SERVICE_PRICE_UPDATED' && tarifUpdateRes.service.price === 280000, 'Command TARIF updated service price successfully');

    // Command: NEXT & DONE
    const nextRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'NEXT', doctorPhone });
    assert(nextRes.action === 'PATIENT_CALLED', 'Command NEXT called first queued patient');
    assert(nextRes.current_patient.status === 'IN_CONSULTATION', 'Patient transitioned to IN_CONSULTATION');
    assert(Array.isArray(nextRes.notifications) && nextRes.notifications.length >= 1, 'Command NEXT created patient WhatsApp notification');
    assert(nextRes.notifications[0].type === 'PATIENT_CALLED' && nextRes.notifications[0].phone === nextRes.current_patient.customer_phone, 'Notification targeted to called patient phone');

    const doneRes = await copilot.handleCommand({ tenantId: maya.id, commandText: 'DONE', doctorPhone });
    assert(doneRes.action === 'PATIENT_COMPLETED', 'Command DONE marked patient COMPLETED');
    assert(Array.isArray(doneRes.notifications) && doneRes.notifications.length >= 1, 'Command DONE created completion message for patient');

    // Smart Nudge Simulation
    const nudge = copilot.checkConsultationNudge(maya.id, 0);
    assert(nudge !== null, 'Smart Nudge check executed cleanly');

    // Anti-loop echo guard test: Simulating bot response echo containing 'jadwal' or 'hari ini'
    const botEchoText = '📅 *JADWAL PRAKTEK HARI INI*\n\nBelum ada pasien terdaftar untuk hari ini.\n\nKetik *NEXT* untuk memanggil antrean berikutnya.';
    const echoRes = await copilot.handleCommand({ tenantId: maya.id, commandText: botEchoText, doctorPhone });
    assert(echoRes.action === 'IGNORE_BOT_ECHO' && echoRes.reply === null, 'Doctor Copilot dropped bot reply echo to prevent self-chat loop');
  }

  // -------------------------------------------------------------
  // TEST GROUP 9: WhatsApp Ingress Router
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 9: WhatsApp Ingress Router ---'));
  {
    const db = new DatabaseEngine();
    const tierGating = new TierGatingService(db);
    const idempotency = new IdempotencyService(db);
    const reschedule = new RescheduleService(db);
    const doctorCopilot = new DoctorCopilotEngine(db);
    const router = new IngressRouter({ db, doctorCopilot, tierGating, rescheduleService: reschedule });

    const maya = db.getTenantBySlug('drg_maya');

    // Ingress from Doctor owner phone
    const docRoute = await router.routeMessage({
      from: `${maya.owner_phone}@s.whatsapp.net`,
      text: 'STATUS'
    });
    assert(docRoute.recipient_type === 'DOCTOR', 'Doctor message routed to Doctor Copilot');

    // Ingress from Doctor multi-device phone with device suffix e.g. :12 sending 'jadwal'
    const docMdRoute = await router.routeMessage({
      from: `${maya.owner_phone}:12@s.whatsapp.net`,
      text: 'jadwal'
    });
    assert(docMdRoute.recipient_type === 'DOCTOR', 'Multi-device Doctor JID with device ID routed to Doctor Copilot');
    assert(docMdRoute.metadata && docMdRoute.metadata.action === 'STATUS', "Command 'jadwal' correctly returns queue status");

    // Ingress from Doctor via WhatsApp Privacy LID (@lid) format
    const docLidRoute = await router.routeMessage({
      from: '28918434295981@lid',
      sender_phone: maya.owner_phone,
      sender_lid: '28918434295981',
      text: 'jadwal'
    });
    assert(docLidRoute.recipient_type === 'DOCTOR', 'Doctor message via WhatsApp LID routed to Doctor Copilot');
    assert(maya.doctor_lid === '28918434295981', 'Doctor LID auto-associated to tenant');

    // Subsequent ingress from same LID without phone hint
    const docLidCachedRoute = await router.routeMessage({
      from: '28918434295981@lid',
      text: 'jadwal'
    });
    assert(docLidCachedRoute.recipient_type === 'DOCTOR', 'Direct LID-only message resolved to Doctor via cached doctor_lid');

    // Ingress Router anti-loop test: Bot template message from doctor JID must yield null
    const botEchoMsg = '📅 *JADWAL PRAKTEK HARI INI*\n\nBelum ada jadwal pasien untuk hari ini.';
    const echoRoute = await router.routeMessage({
      from: `${maya.owner_phone}@s.whatsapp.net`,
      text: botEchoMsg
    });
    assert(echoRoute === null, 'Ingress Router successfully dropped bot echo message (returned null)');

    // Ingress from Patient with deep-link
    const patientRoute = await router.routeMessage({
      from: '628991234567@s.whatsapp.net',
      text: 'BOOK_drg_maya'
    });
    assert(patientRoute.recipient_type === 'PATIENT', 'Patient deep-link resolved to target practice');
    assert(patientRoute.message.includes('Scaling Karang Gigi'), 'Patient menu lists practice services');
  }

  // -------------------------------------------------------------
  // TEST GROUP 10: Full End-to-End HTTP REST Server
  // -------------------------------------------------------------
  console.log(bold('\n--- TEST SUITE 10: End-to-End HTTP REST Server ---'));
  {
    const testPort = 4099;
    const app = new AppServer(testPort);
    await app.listen();

    const makeRequest = (method, path, body = null, headers = {}) => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: testPort,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null, headers: res.headers });
            } catch {
              resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
            }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    // 1. Health API
    const health = await makeRequest('GET', '/api/health');
    assert(health.statusCode === 200 && health.body.status === 'UP', 'HTTP GET /api/health returned 200 UP');

    // 2. Tenant Public API
    const tenantRes = await makeRequest('GET', '/api/tenants/drg_maya');
    assert(tenantRes.statusCode === 200 && tenantRes.body.tenant.slug === 'drg_maya', 'HTTP GET /api/tenants/drg_maya returned catalog');

    // 3. Create Booking with Idempotency Key
    const mayaId = tenantRes.body.tenant.id;
    const serviceId = tenantRes.body.services[0].id;
    const idemKey = 'api-test-idem-999';

    const bookingRes1 = await makeRequest('POST', '/api/bookings', {
      tenant_id: mayaId,
      service_id: serviceId,
      customer_name: 'HTTP Test Patient',
      customer_phone: '62899990001',
      start_time: '2026-11-01T09:00:00.000Z',
      end_time: '2026-11-01T09:40:00.000Z'
    }, { 'x-idempotency-key': idemKey });
    assert(bookingRes1.statusCode === 201 && bookingRes1.headers['x-cache-lookup'] === 'MISS', 'HTTP POST /api/bookings created slot (Cache MISS)');

    // Repeat identical request -> Cache HIT
    const bookingRes2 = await makeRequest('POST', '/api/bookings', {
      tenant_id: mayaId,
      service_id: serviceId,
      customer_name: 'HTTP Test Patient',
      customer_phone: '62899990001',
      start_time: '2026-11-01T09:00:00.000Z',
      end_time: '2026-11-01T09:40:00.000Z'
    }, { 'x-idempotency-key': idemKey });
    assert(bookingRes2.statusCode === 201 && bookingRes2.headers['x-cache-lookup'] === 'HIT', 'HTTP POST /api/bookings returned cached response (Cache HIT)');

    // 4. WhatsApp Inbound Endpoint
    const waRes = await makeRequest('POST', '/api/whatsapp/inbound', {
      from: '6281299887766@s.whatsapp.net', // drg. Maya's owner phone
      text: 'STATUS'
    });
    assert(waRes.statusCode === 200 && waRes.body.recipient_type === 'DOCTOR', 'HTTP POST /api/whatsapp/inbound routed to doctor');

    // 5. Auth Security Tests
    // 5A. Unauthenticated request to protected endpoint must return 401
    const unauthMrr = await makeRequest('GET', '/api/reports/mrr');
    assert(unauthMrr.statusCode === 401 && unauthMrr.body.code === 'AUTH_REQUIRED', 'Security Guard: Unauthenticated access to /api/reports/mrr rejected with 401');

    // 5B. Invalid login credentials must return 401
    const invalidLogin = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'WrongPassword999!' });
    assert(invalidLogin.statusCode === 401 && invalidLogin.body.code === 'INVALID_CREDENTIALS', 'Auth Guard: Invalid login credentials rejected with 401');

    // 5C. Valid Super Admin Login
    const validLogin = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'AdminPraktika2026!' });
    assert(validLogin.statusCode === 200 && validLogin.body.success === true && typeof validLogin.body.token === 'string', 'Super Admin Login successful and token issued');
    const adminToken = validLogin.body.token;

    // 5D. Session validation /api/auth/me
    const meRes = await makeRequest('GET', '/api/auth/me', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(meRes.statusCode === 200 && meRes.body.authenticated === true, 'Session /api/auth/me validated token');

    // 6. SaaS Financial MRR View (With Auth)
    const mrrRes = await makeRequest('GET', '/api/reports/mrr', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(mrrRes.statusCode === 200 && Array.isArray(mrrRes.body.mrr_reports), 'HTTP GET /api/reports/mrr (Authenticated) returned financial summary');

    // 7. SaaS Quota Monitoring View (With Auth)
    const quotaRes = await makeRequest('GET', '/api/reports/quotas', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(quotaRes.statusCode === 200 && Array.isArray(quotaRes.body.quota_monitoring), 'HTTP GET /api/reports/quotas (Authenticated) returned quota summary');

    // 8. Baileys Multi-Session Gateway Endpoint (With Auth)
    const sessionsRes = await makeRequest('GET', '/api/baileys/sessions', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(sessionsRes.statusCode === 200 && Array.isArray(sessionsRes.body.sessions), 'HTTP GET /api/baileys/sessions returned multi-session list');
    const firstSession = sessionsRes.body.sessions[0];
    assert(firstSession && typeof firstSession.connect_token === 'string', 'Baileys session contains valid onboarding connect_token');

    // 9. Doctor Public Onboarding Token Verification: GET /api/connect/verify?token=...
    const verifyRes = await makeRequest('GET', `/api/connect/verify?token=${firstSession.connect_token}`);
    assert(verifyRes.statusCode === 200 && verifyRes.body.valid === true, 'Doctor Onboarding: Token verified successfully');

    // 9B. Tenant Services & Price Management: GET /api/tenants/:id/services & POST /api/services/:id
    const srvsRes = await makeRequest('GET', `/api/tenants/${firstSession.id}/services`, null, { 'Authorization': `Bearer ${adminToken}` });
    assert(srvsRes.statusCode === 200 && Array.isArray(srvsRes.body.services), 'HTTP GET /api/tenants/:id/services returned services list');
    if (srvsRes.body.services.length > 0) {
      const targetSrv = srvsRes.body.services[0];
      const updatePriceRes = await makeRequest('POST', `/api/services/${targetSrv.id}`, {
        name: targetSrv.name,
        duration_minutes: targetSrv.duration_minutes,
        price: 320000
      }, { 'Authorization': `Bearer ${adminToken}` });
      assert(updatePriceRes.statusCode === 200 && updatePriceRes.body.service.price === 320000, 'HTTP POST /api/services/:id updated service tariff successfully');
    }

    // 10. Delete Single Tenant: DELETE /api/tenants/:id
    // Create a temporary tenant first
    const createRes = await makeRequest('POST', '/api/tenants', {
      name: 'dr. Test Delete Sp.THT',
      slug: 'dr_test_delete',
      owner_phone: '6281987654321',
      subscription_plan: 'STARTER',
      timezone: 'Asia/Jakarta'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert(createRes.statusCode === 201, 'Created temporary tenant for deletion test');
    const tempId = createRes.body.tenant.id;

    // Delete it
    const delRes = await makeRequest('DELETE', `/api/tenants/${tempId}`, null, { 'Authorization': `Bearer ${adminToken}` });
    assert(delRes.statusCode === 200 && delRes.body.success === true, 'HTTP DELETE /api/tenants/:id removed tenant successfully');

    // Verify it no longer exists
    const checkDeleted = await makeRequest('GET', '/api/tenants/dr_test_delete');
    assert(checkDeleted.statusCode === 404, 'Deleted tenant returned 404 Not Found as expected');

    // 11. Purge Sample Demo Tenants: POST /api/tenants/purge-samples
    const purgeRes = await makeRequest('POST', '/api/tenants/purge-samples', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(purgeRes.statusCode === 200 && purgeRes.body.success === true && purgeRes.body.deleted_count >= 1, 'HTTP POST /api/tenants/purge-samples purged demo accounts');

    // 12. Super Admin System Audit Logs Stream: GET /api/admin/system-logs
    const logsRes = await makeRequest('GET', '/api/admin/system-logs', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(logsRes.statusCode === 200 && logsRes.body.success === true && Array.isArray(logsRes.body.logs) && logsRes.body.logs.length > 0, 'HTTP GET /api/admin/system-logs streamed system events');

    // 13. Logout
    const logoutRes = await makeRequest('POST', '/api/auth/logout', null, { 'Authorization': `Bearer ${adminToken}` });
    assert(logoutRes.statusCode === 200 && logoutRes.body.success === true, 'Super Admin Logout successful');

    await app.close();
    assert(true, 'HTTP REST server gracefully closed');
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log(bold('\n======================================================'));
  console.log(bold(`🏁 TEST RUN COMPLETE: ${passedTests}/${totalTests} PASSED`));
  if (failedTests > 0) {
    console.log(red(`❌ ${failedTests} TESTS FAILED!`));
    process.exit(1);
  } else {
    console.log(green(`🎉 ALL ${passedTests} TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)`));
    console.log(bold('======================================================\n'));
  }
}

runTestSuite().catch(err => {
  console.error(red('Fatal test error:'), err);
  process.exit(1);
});
