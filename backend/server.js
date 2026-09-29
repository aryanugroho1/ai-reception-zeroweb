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

      // 2. Tenant Public Catalog & Info: GET /api/tenants/:slug
      const tenantMatch = pathname.match(/^\/api\/tenants\/([a-zA-Z0-9_-]+)$/);
      if (tenantMatch && method === 'GET') {
        const slug = tenantMatch[1];
        const tenant = this.db.getTenantBySlug(slug);
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
