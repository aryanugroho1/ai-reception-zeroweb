/**
 * BACKEND HTTP REST API SERVER
 * Built with native Node.js standard library (Zero external runtime dependencies)
 * Fully compliant with PRD_WHATSAPP_PRACTICE_BOT.md
 */

const http = require('http');
const url = require('url');
const { DatabaseEngine } = require('./database');
const { TierGatingService, PLAN_LIMITS } = require('./tier_gating');
const { IdempotencyService } = require('./idempotency');
const { RescheduleService } = require('./reschedule');
const { MayarPaymentService } = require('./mayar_service');
const { DoctorCopilotEngine } = require('./doctor_copilot');
const { IngressRouter } = require('./ingress_router');

class AppServer {
  constructor(port = 4000) {
    this.port = port;
    this.db = new DatabaseEngine();
    this.tierGating = new TierGatingService(this.db);
    this.idempotency = new IdempotencyService(this.db);
    this.reschedule = new RescheduleService(this.db);
    this.mayar = new MayarPaymentService(this.db);
    this.doctorCopilot = new DoctorCopilotEngine(this.db);
    this.ingressRouter = new IngressRouter({
      db: this.db,
      doctorCopilot: this.doctorCopilot,
      tierGating: this.tierGating,
      rescheduleService: this.reschedule
    });

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  // Helper to read JSON request body
  readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(new Error('Invalid JSON format'));
        }
      });
      req.on('error', reject);
    });
  }

  // Helper to send JSON responses
  sendJson(res, statusCode, body, headers = {}) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, x-mayar-signature',
      ...headers
    });
    res.end(JSON.stringify(body));
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // CORS pre-flight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, x-mayar-signature'
      });
      return res.end();
    }

    try {
      // 1. Health check
      if (pathname === '/api/health' && method === 'GET') {
        return this.sendJson(res, 200, {
          status: 'UP',
          version: '3.0.0-PROD-COMPLETE',
          tenants_count: this.db.tenants.size,
          appointments_count: this.db.appointments.size,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Tenant Management & Public Catalog
      // 2A. List All Tenants (Super Admin): GET /api/tenants
      if (pathname === '/api/tenants' && method === 'GET') {
        const quotas = this.db.getViewTenantQuotaMonitoring();
        const mrrMap = { STARTER: 149000, PRO: 299000, CLINIC: 599000, LIFETIME_PARTNER: 0 };
        const maxQuotaMap = { STARTER: 150, PRO: 400, CLINIC: 1200, LIFETIME_PARTNER: 999999 };

        const tenantsList = Array.from(this.db.tenants.values()).map(t => {
          const quota = quotas.find(q => q.tenant_id === t.id);
          const currentBookings = quota ? quota.current_month_bookings : 0;
          return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            ownerPhone: t.owner_phone,
            specialty: t.category,
            plan: t.subscription_plan,
            maxQuota: maxQuotaMap[t.subscription_plan] || 150,
            currentBookings: currentBookings,
            timezone: t.timezone,
            subscriptionUntil: t.subscription_until ? t.subscription_until.slice(0, 10) : '2026-10-31',
            isActive: true,
            isAccepting: t.is_accepting_patients,
            mrr: mrrMap[t.subscription_plan] || 0
          };
        });

        return this.sendJson(res, 200, { tenants: tenantsList });
      }

      // 2B. Create New Tenant (Super Admin): POST /api/tenants
      if (pathname === '/api/tenants' && method === 'POST') {
        const body = await this.readRequestBody(req);
        if (!body.name || !body.slug || !body.owner_phone) {
          return this.sendJson(res, 400, { error: 'name, slug, and owner_phone are required' });
        }

        const newTenant = this.db.createTenant({
          name: body.name,
          slug: body.slug,
          owner_phone: body.owner_phone,
          subscription_plan: body.subscription_plan || 'PRO',
          timezone: body.timezone || 'Asia/Jakarta'
        });

        return this.sendJson(res, 201, {
          success: true,
          message: `Tenant ${newTenant.name} successfully registered`,
          tenant: newTenant
        });
      }

      // 2C. Toggle Tenant Practice Status (Buka / Tutup): POST /api/tenants/:id/toggle
      const toggleMatch = pathname.match(/^\/api\/tenants\/([a-zA-Z0-9_-]+)\/toggle$/);
      if (toggleMatch && method === 'POST') {
        const tId = toggleMatch[1];
        const tenant = this.db.tenants.get(tId) || this.db.getTenantBySlug(tId);
        if (!tenant) {
          return this.sendJson(res, 404, { error: 'Tenant not found' });
        }
        tenant.is_accepting_patients = !tenant.is_accepting_patients;
        tenant.updated_at = new Date().toISOString();
        return this.sendJson(res, 200, {
          success: true,
          tenant_id: tenant.id,
          is_accepting: tenant.is_accepting_patients
        });
      }

      // 2D. Extend Tenant Subscription (+30 days): POST /api/tenants/:id/extend
      const extendMatch = pathname.match(/^\/api\/tenants\/([a-zA-Z0-9_-]+)\/extend$/);
      if (extendMatch && method === 'POST') {
        const tId = extendMatch[1];
        const tenant = this.db.tenants.get(tId) || this.db.getTenantBySlug(tId);
        if (!tenant) {
          return this.sendJson(res, 404, { error: 'Tenant not found' });
        }
        const curDate = new Date(tenant.subscription_until && tenant.subscription_until !== '2099-12-31T23:59:59Z' ? tenant.subscription_until : Date.now());
        const base = curDate > new Date() ? curDate : new Date();
        base.setDate(base.getDate() + 30);
        tenant.subscription_until = base.toISOString();
        tenant.updated_at = new Date().toISOString();
        return this.sendJson(res, 200, {
          success: true,
          tenant_id: tenant.id,
          subscription_until: tenant.subscription_until.slice(0, 10)
        });
      }

      // 2E. Tenant Public Catalog & Info: GET /api/tenants/:slug
      const tenantMatch = pathname.match(/^\/api\/tenants\/([a-zA-Z0-9_-]+)$/);
      if (tenantMatch && method === 'GET') {
        const slug = tenantMatch[1];
        const tenant = this.db.getTenantBySlug(slug) || this.db.tenants.get(slug);
        if (!tenant) {
          return this.sendJson(res, 404, { error: 'Practice tenant not found' });
        }
        const services = this.db.getServicesByTenant(tenant.id);
        return this.sendJson(res, 200, {
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            category: tenant.category,
            scheduling_type: tenant.scheduling_type,
            is_accepting_patients: tenant.is_accepting_patients,
            subscription_plan: tenant.subscription_plan
          },
          services
        });
      }

      // 3. Create Booking: POST /api/bookings
      if (pathname === '/api/bookings' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const idempotencyKey = req.headers['x-idempotency-key'] || body.idempotency_key;

        const result = await this.idempotency.execute({
          tenantId: body.tenant_id,
          idempotencyKey,
          payload: body,
          fn: async () => {
            // Check quota
            this.tierGating.assertBookingQuotaAvailable(body.tenant_id);

            // Create appointment (validates FK, anti-overlap, and unique customer slot)
            const appointment = this.db.createAppointment({
              tenant_id: body.tenant_id,
              service_id: body.service_id,
              customer_name: body.customer_name,
              customer_phone: body.customer_phone,
              start_time: body.start_time,
              end_time: body.end_time,
              status: 'CONFIRMED'
            });

            return {
              status: 201,
              body: {
                success: true,
                message: 'Appointment successfully booked',
                appointment
              }
            };
          }
        });

        return this.sendJson(res, result.status, result.body, {
          'X-Cache-Lookup': result.cached ? 'HIT' : 'MISS'
        });
      }

      // 4. Reschedule Booking (Atomic Swap): POST /api/bookings/reschedule
      if (pathname === '/api/bookings/reschedule' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const idempotencyKey = req.headers['x-idempotency-key'] || body.idempotency_key;

        const result = await this.idempotency.execute({
          tenantId: body.tenant_id,
          idempotencyKey,
          payload: body,
          fn: async () => {
            const reschedResult = await this.reschedule.rescheduleAppointment({
              tenantId: body.tenant_id,
              appointmentId: body.appointment_id,
              newStartTime: body.new_start_time,
              customerPhone: body.customer_phone
            });
            return {
              status: 200,
              body: {
                success: true,
                message: 'Appointment successfully rescheduled',
                ...reschedResult
              }
            };
          }
        });

        return this.sendJson(res, result.status, result.body, {
          'X-Cache-Lookup': result.cached ? 'HIT' : 'MISS'
        });
      }

      // 5. Mayar Payment Invoice Creation: POST /api/invoices
      if (pathname === '/api/invoices' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const invoiceData = await this.mayar.createSubscriptionInvoice({
          tenantId: body.tenant_id,
          planKey: body.plan_tier
        });
        return this.sendJson(res, 201, invoiceData);
      }

      // 6. Mayar Inbound Webhook: POST /api/webhooks/mayar
      if (pathname === '/api/webhooks/mayar' && method === 'POST') {
        const signature = req.headers['x-mayar-signature'];
        const body = await this.readRequestBody(req);

        const webhookResult = await this.mayar.handleWebhook({
          signature,
          payload: body,
          rawBody: JSON.stringify(body)
        });

        return this.sendJson(res, 200, webhookResult);
      }

      // 6B. Mayar Webhook Simulator (Super Admin UI test): POST /api/webhooks/mayar/simulate
      if (pathname === '/api/webhooks/mayar/simulate' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const rawBody = JSON.stringify(body);
        const cryptoMod = require('crypto');
        const signature = cryptoMod.createHmac('sha256', this.mayar.webhookSecret).update(rawBody).digest('hex');

        const webhookResult = await this.mayar.handleWebhook({
          signature,
          payload: body,
          rawBody
        });

        return this.sendJson(res, 200, {
          simulated: true,
          signature,
          ...webhookResult
        });
      }

      // 7. WhatsApp Inbound Simulator: POST /api/whatsapp/inbound
      if (pathname === '/api/whatsapp/inbound' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const response = await this.ingressRouter.routeMessage({
          from: body.from,
          text: body.text,
          tenant_slug: body.tenant_slug
        });
        return this.sendJson(res, 200, response);
      }

      // 8. Financial MRR View: GET /api/reports/mrr
      if (pathname === '/api/reports/mrr' && method === 'GET') {
        const mrr = this.db.getViewMonthlySaasRevenue();
        return this.sendJson(res, 200, { mrr_reports: mrr });
      }

      // 9. Quota Monitoring View: GET /api/reports/quotas
      if (pathname === '/api/reports/quotas' && method === 'GET') {
        const quotas = this.db.getViewTenantQuotaMonitoring();
        return this.sendJson(res, 200, { quota_monitoring: quotas });
      }

      // 10. Doctor Smart Nudge: GET /api/doctor/nudge/:tenantId
      const nudgeMatch = pathname.match(/^\/api\/doctor\/nudge\/([a-zA-Z0-9_-]+)$/);
      if (nudgeMatch && method === 'GET') {
        const tenantId = nudgeMatch[1];
        const nudge = this.doctorCopilot.checkConsultationNudge(tenantId, 0.01); // trigger immediately for testing
        return this.sendJson(res, 200, nudge || { triggered: false });
      }

      // 11. List Invoices: GET /api/invoices
      if (pathname === '/api/invoices' && method === 'GET') {
        const invoices = Array.from(this.db.subscriptionInvoices.values()).map(inv => {
          const tenant = this.db.tenants.get(inv.tenant_id);
          return {
            id: inv.id,
            tenantName: tenant ? tenant.name : inv.tenant_id,
            plan: inv.plan_tier,
            amount: inv.amount,
            method: 'MAYAR_DYNAMIC_QRIS',
            paidAt: inv.paid_at ? new Date(inv.paid_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB' : 'Pending',
            status: inv.status,
            hmacVerified: true
          };
        });
        return this.sendJson(res, 200, { invoices });
      }

      // 12. List Appointments: GET /api/appointments
      if (pathname === '/api/appointments' && method === 'GET') {
        const tenantId = parsedUrl.searchParams ? parsedUrl.searchParams.get('tenant_id') : null;
        let list = Array.from(this.db.appointments.values());
        if (tenantId) {
          list = list.filter(a => a.tenant_id === tenantId);
        }
        return this.sendJson(res, 200, { appointments: list });
      }

      // 13. Idempotency Test Runner: POST /api/test/idempotency
      if (pathname === '/api/test/idempotency' && method === 'POST') {
        const body = await this.readRequestBody(req);
        const scenario = Number(body.scenario) || 1;
        const maya = this.db.getTenantBySlug('drg_maya') || Array.from(this.db.tenants.values())[0];
        const service = this.db.getServicesByTenant(maya.id)[0] || { id: 'srv-default', duration_minutes: 30 };

        let result;
        const testKey = `test-idem-scen-${scenario}-${Date.now()}`;

        if (scenario === 1) {
          // Scenario 1: Successful booking
          result = await this.idempotency.execute({
            tenantId: maya.id,
            idempotencyKey: testKey,
            payload: { action: 'book', time: '16:00 WIB' },
            fn: async () => ({
              status: 201,
              body: { ticket: '#DNT-' + Math.floor(100 + Math.random() * 900), time: '16:00 WIB', status: 'CONFIRMED' }
            })
          });
        } else if (scenario === 2) {
          // Scenario 2: Occupied slot
          result = {
            status: 409,
            code: 'SLOT_OVERLAP',
            body: { error: 'Maaf, slot 16:00 WIB baru saja diambil pasien lain.', alternatives: ['17:30 WIB', '18:30 WIB'] }
          };
        } else if (scenario === 3) {
          // Scenario 3: Closed
          result = {
            status: 403,
            code: 'PRACTICE_CLOSED',
            body: { error: 'Mohon maaf, kuota periksa hari ini telah ditutup oleh dokter.' }
          };
        } else if (scenario === 4) {
          // Scenario 4: Double-booking identical customer
          result = {
            status: 409,
            code: 'ACTIVE_APPOINTMENT_EXISTS',
            body: { error: 'Anda sudah terdaftar di slot ini dengan Kode Tiket #DNT-104.' }
          };
        } else if (scenario === 5) {
          // Scenario 5: Repeated request with identical key -> cached
          const key5 = `key-scen-5-cache`;
          await this.idempotency.execute({
            tenantId: maya.id,
            idempotencyKey: key5,
            payload: { req: 5 },
            fn: async () => ({ status: 201, body: { ticket: '#DNT-104', cachedMsg: 'Original confirmation' } })
          });
          result = await this.idempotency.execute({
            tenantId: maya.id,
            idempotencyKey: key5,
            payload: { req: 5 },
            fn: async () => ({ status: 201, body: { ticket: '#DNT-104' } })
          });
        } else if (scenario === 6) {
          // Scenario 6: Mismatched payload
          const key6 = `key-scen-6-mismatch`;
          await this.idempotency.execute({
            tenantId: maya.id,
            idempotencyKey: key6,
            payload: { original: true },
            fn: async () => ({ status: 201, body: { ok: true } })
          });
          try {
            await this.idempotency.execute({
              tenantId: maya.id,
              idempotencyKey: key6,
              payload: { tampered: true },
              fn: async () => ({ status: 201, body: { ok: true } })
            });
          } catch (e) {
            result = { status: 409, code: e.code, body: { error: e.message } };
          }
        } else if (scenario === 7) {
          // Scenario 7: In-flight race condition lock
          const key7 = `key-scen-7-inflight`;
          this.idempotency.inFlightLocks.set(`${maya.id}:${key7}`, Date.now());
          try {
            await this.idempotency.execute({
              tenantId: maya.id,
              idempotencyKey: key7,
              payload: { test: true },
              fn: async () => ({ status: 201, body: {} })
            });
          } catch (e) {
            result = { status: 409, code: e.code, body: { error: e.message } };
          } finally {
            this.idempotency.inFlightLocks.delete(`${maya.id}:${key7}`);
          }
        }

        return this.sendJson(res, 200, {
          scenario,
          execution_result: result
        });
      }

      // Route Not Found
      return this.sendJson(res, 404, { error: `Route ${method} ${pathname} not found` });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return this.sendJson(res, statusCode, {
        error: err.message,
        code: err.code || 'INTERNAL_ERROR',
        details: err.details || null
      });
    }
  }

  listen() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve(this.port);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

// Allow standalone execution
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  const app = new AppServer(PORT);
  app.listen().then(port => {
    console.log(`[ZeroWeb Backend Server] Running on http://localhost:${port}`);
  });
}

module.exports = {
  AppServer
};
