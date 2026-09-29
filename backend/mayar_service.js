/**
 * MAYAR.ID PAYMENT GATEWAY SERVICE
 * PRD Section 6: Automated Subscription & WhatsApp Receipt
 * - HMAC-SHA256 signature verification
 * - Dynamic invoice creation
 * - Automatic +30 days or Lifetime subscription extension
 * - WhatsApp receipt dispatch
 */

const crypto = require('crypto');
const { PLAN_LIMITS } = require('./tier_gating');

class MayarPaymentService {
  constructor(db, options = {}) {
    this.db = db;
    this.webhookSecret = options.webhookSecret || process.env.MAYAR_WEBHOOK_SECRET || 'test_mayar_secret_key_zeroweb_2026';
    this.apiKey = options.apiKey || process.env.MAYAR_API_KEY || 'test_mayar_api_key';
  }

  /**
   * Create subscription payment invoice
   */
  async createSubscriptionInvoice({ tenantId, planKey }) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      const err = new Error(`Tenant ${tenantId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const plan = PLAN_LIMITS[planKey];
    if (!plan) {
      const err = new Error(`Invalid plan key: ${planKey}`);
      err.statusCode = 400;
      throw err;
    }

    const invoiceId = 'inv-' + crypto.randomUUID();
    const invoice = this.db.createSubscriptionInvoice({
      id: invoiceId,
      tenant_id: tenantId,
      amount: plan.price_idr,
      plan_tier: planKey,
      status: 'PENDING'
    });

    const paymentUrl = `https://pay.mayar.id/checkout/${invoiceId}?amount=${plan.price_idr}&tenant=${tenant.slug}`;

    return {
      invoice_id: invoiceId,
      tenant_id: tenantId,
      plan: planKey,
      amount: plan.price_idr,
      payment_url: paymentUrl,
      status: 'PENDING',
      created_at: invoice.created_at
    };
  }

  /**
   * Verify HMAC-SHA256 signature from Mayar
   * @param {string|Buffer} rawBody
   * @param {string} signature Header 'x-mayar-signature'
   * @returns {boolean}
   */
  verifySignature(rawBody, signature) {
    if (!signature) return false;
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  /**
   * Handle Inbound Webhook event from Mayar.id
   */
  async handleWebhook({ signature, payload, rawBody }) {
    const isValid = this.verifySignature(rawBody || payload, signature);
    if (!isValid) {
      const err = new Error('Invalid Mayar webhook signature');
      err.statusCode = 401;
      err.code = 'INVALID_SIGNATURE';
      throw err;
    }

    const event = payload.event || payload.status;
    const data = payload.data || payload;

    // Process only payment success / received events
    if (event !== 'payment.received' && event !== 'payment.success' && data.status !== 'PAID') {
      return { handled: false, reason: `Ignored event: ${event}` };
    }

    const invoiceId = data.invoice_id || data.id;
    let invoice = this.db.subscriptionInvoices.get(invoiceId);

    // If invoice not found by ID, attempt lookup by tenant_id or create new record
    const tenantId = data.tenant_id || (invoice ? invoice.tenant_id : null);
    if (!tenantId) {
      const err = new Error('Cannot resolve tenant_id for webhook invoice');
      err.statusCode = 400;
      throw err;
    }

    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      const err = new Error(`Tenant ${tenantId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const planKey = data.plan_tier || (invoice ? invoice.plan_tier : 'PRO');
    const amount = Number(data.amount || (invoice ? invoice.amount : 299000));

    // Update invoice status
    if (invoice) {
      invoice.status = 'PAID';
      invoice.mayar_payment_id = data.payment_id || `mayar-${Date.now()}`;
      invoice.updated_at = new Date().toISOString();
    } else {
      invoice = this.db.createSubscriptionInvoice({
        id: invoiceId,
        tenant_id: tenantId,
        amount: amount,
        plan_tier: planKey,
        status: 'PAID'
      });
    }

    // Extend Subscription
    const currentSubEnd = new Date(tenant.subscription_until || Date.now());
    const baseDate = currentSubEnd > new Date() ? currentSubEnd : new Date();

    if (planKey === 'LIFETIME_PARTNER') {
      // 100 years lifetime extension
      baseDate.setFullYear(baseDate.getFullYear() + 100);
    } else {
      // +30 days monthly extension
      baseDate.setDate(baseDate.getDate() + 30);
    }

    tenant.subscription_plan = planKey;
    tenant.subscription_until = baseDate.toISOString();
    tenant.updated_at = new Date().toISOString();

    // Generate WhatsApp Receipt
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    const receiptMessage = [
      `🎉 *PEMBAYARAN DITERIMA - RESI RESMI SAAS*`,
      `---------------------------------------`,
      `Praktek : *${tenant.name}*`,
      `Paket   : *${planKey}*`,
      `Nominal : *${formattedAmount}*`,
      `Status  : *LUNAS (PAID)*`,
      `Aktif s/d : *${baseDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*`,
      `Ref ID  : \`${invoiceId}\``,
      `---------------------------------------`,
      `Terima kasih telah mempercayai ZeroWeb AI Receptionist untuk memajukan praktek dokter Anda! 🚀`
    ].join('\n');

    return {
      handled: true,
      tenant_id: tenantId,
      plan: planKey,
      subscription_until: tenant.subscription_until,
      invoice_id: invoiceId,
      receipt_message: receiptMessage,
      doctor_phone: tenant.owner_phone
    };
  }
}

module.exports = {
  MayarPaymentService
};
