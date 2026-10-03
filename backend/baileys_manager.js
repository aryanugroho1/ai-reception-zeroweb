/**
 * MULTI-SESSION BAILEYS WHATSAPP ENGINE
 * PRD Section 3 & Multi-tenant Linked Devices
 * 
 * Supports independent WhatsApp sessions for each clinic/doctor.
 * - Each doctor links their own WhatsApp number via QR Code
 * - Patients chat directly with the doctor's WhatsApp
 * - Automatic AI Receptionist & Doctor Copilot responses
 * - Super Admin retains global visibility and session control
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BaileysManager {
  constructor({ db, ingressRouter, sessionsDir }) {
    this.db = db;
    this.ingressRouter = ingressRouter;
    this.sessionsDir = sessionsDir || path.join(__dirname, '../sessions');
    this.sessions = new Map(); // tenantId -> sessionData
    this.tokenSecret = process.env.CONNECT_TOKEN_SECRET || 'praktika-doctor-onboard-secret-2026';
    this.connectTokens = new Map(); // token -> { tenantId, expiresAt }
    this.pendingRegistrations = new Map(); // pendingId -> pendingData

    // Ensure sessions root directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      try {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      } catch (err) {
        console.error('[BaileysManager] Failed to create sessions dir:', err.message);
      }
    }
  }

  // --- PENDING REGISTRATION STAGING ---
  registerPendingTenant(pendingData) {
    const pendingId = `pending_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.pendingRegistrations.set(pendingId, pendingData);
    const token = this.generateConnectToken(pendingId);
    return { pendingId, token };
  }

  getPendingTenant(pendingId) {
    return this.pendingRegistrations.get(pendingId);
  }

  cancelPendingTenant(pendingId) {
    this.pendingRegistrations.delete(pendingId);
    this.sessions.delete(pendingId);
    return true;
  }

  commitPendingTenant(pendingId, actualConnectedPhone) {
    if (!this.pendingRegistrations.has(pendingId)) return null;
    const p = this.pendingRegistrations.get(pendingId);
    const phone = actualConnectedPhone || p.rawPhone || p.phone;

    // Check if tenant with this phone already exists in DB
    let tenant = this.db.getTenantByPhone(phone);
    if (tenant) {
      tenant.name = p.business_name || tenant.name;
      tenant.subscription_plan = p.plan || tenant.subscription_plan;
      tenant.subscription_until = p.subUntil || tenant.subscription_until;
      tenant.whatsapp_connected_phone = phone;
      if (p.owner_phone) tenant.owner_phone = p.owner_phone;
      tenant.updated_at = new Date().toISOString();
    } else {
      const rawSlug = (p.business_name || 'bisnis').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24);
      const uniqueSlug = `${rawSlug}_${Math.floor(100 + Math.random() * 900)}`;
      tenant = this.db.createTenant({
        name: p.business_name,
        slug: uniqueSlug,
        owner_phone: p.owner_phone || phone,
        category: p.category || 'GENERAL',
        subscription_plan: p.plan || 'STARTER',
        subscription_until: p.subUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Jakarta'
      });
      tenant.whatsapp_connected_phone = phone;

      // Seed default starter services by category
      const starterServicesByCategory = {
        'BARBER': [
          { name: 'Gentleman Haircut & Styling', duration_minutes: 45, price: 75000 },
          { name: 'Beard Trim & Hot Towel', duration_minutes: 30, price: 50000 },
          { name: 'Hair Wash & Scalp Massage', duration_minutes: 20, price: 35000 }
        ],
        'SALON': [
          { name: 'Hair Treatment & Styling', duration_minutes: 60, price: 150000 },
          { name: 'Manicure & Nail Art', duration_minutes: 45, price: 120000 },
          { name: 'Wash & Blow Signature', duration_minutes: 30, price: 60000 }
        ],
        'SPA': [
          { name: 'Full Body Relaxation Massage (60m)', duration_minutes: 60, price: 180000 },
          { name: 'Refleksi Kaki & Relaksasi (45m)', duration_minutes: 45, price: 100000 },
          { name: 'Aromatherapy Herbal Spa (90m)', duration_minutes: 90, price: 220000 }
        ],
        'DENTAL': [
          { name: 'Pembersihan Karang Gigi (Scaling)', duration_minutes: 40, price: 250000 },
          { name: 'Tambal Gigi Estetik', duration_minutes: 45, price: 200000 },
          { name: 'Konsultasi & Pemeriksaan Gigi', duration_minutes: 30, price: 100000 }
        ],
        'GENERAL': [
          { name: 'Konsultasi Dokter Umum', duration_minutes: 20, price: 100000 },
          { name: 'Pemeriksaan Kesehatan Rutin', duration_minutes: 30, price: 150000 }
        ]
      };

      const servicesToCreate = starterServicesByCategory[p.category] || [
        { name: 'Layanan Utama / Reservasi Slot', duration_minutes: 45, price: 150000 },
        { name: 'Konsultasi / Treatment Tambahan', duration_minutes: 30, price: 100000 }
      ];

      try {
        for (const s of servicesToCreate) {
          this.db.createService({
            tenant_id: tenant.id,
            name: s.name,
            duration_minutes: s.duration_minutes,
            price: s.price,
            is_active: true
          });
        }
      } catch (e) {}
    }

    // Move session to committed tenant ID & keep alias so immediate frontend poll doesn't fail
    const pendingSession = this.sessions.get(pendingId);
    if (pendingSession) {
      pendingSession.tenantId = tenant.id;
      this.sessions.set(tenant.id, pendingSession);
      this.sessions.set(pendingId, pendingSession);
    }

    // Mirror session auth files to committed tenant ID folder for future restarts
    const pendingDir = this.getSessionDir(pendingId);
    const tenantDir = this.getSessionDir(tenant.id);
    if (fs.existsSync(pendingDir) && pendingDir !== tenantDir) {
      try {
        if (!fs.existsSync(tenantDir)) {
          fs.mkdirSync(tenantDir, { recursive: true });
        }
        fs.cpSync(pendingDir, tenantDir, { recursive: true });
      } catch (e) {
        console.warn('[BaileysManager] Failed copying session files to tenant dir:', e.message);
      }
    }

    // Update connect tokens referencing pendingId
    for (const [t, data] of this.connectTokens.entries()) {
      if (data.tenantId === pendingId) {
        data.tenantId = tenant.id;
      }
    }

    this.pendingRegistrations.delete(pendingId);
    if (this.db && typeof this.db.save === 'function') {
      this.db.save();
    }
    console.log(`[BaileysManager] Tenant officially COMMITTED to database after QR connection: ${tenant.name} (${tenant.id}) - Phone: ${tenant.owner_phone}`);
    return tenant;
  }

  // --- TOKEN GENERATOR FOR DOCTOR ONBOARDING PORTAL ---
  generateConnectToken(tenantId) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days valid
    this.connectTokens.set(rawToken, { tenantId, expiresAt });
    return rawToken;
  }

  verifyConnectToken(token) {
    if (!token) return null;
    const item = this.connectTokens.get(token);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.connectTokens.delete(token);
      return null;
    }
    return item.tenantId;
  }

  // Helper to resolve tenant (supports both registered tenants and pending staging)
  resolveTenant(identifier) {
    const registered = this.db.tenants.get(identifier) || this.db.getTenantBySlug(identifier);
    if (registered) return registered;
    if (this.pendingRegistrations && this.pendingRegistrations.has(identifier)) {
      const p = this.pendingRegistrations.get(identifier);
      return {
        id: identifier,
        name: p.business_name || 'Bisnis Anda',
        slug: identifier,
        owner_phone: p.rawPhone || p.phone,
        category: p.category || 'GENERAL',
        subscription_plan: p.plan || 'STARTER',
        is_pending: true
      };
    }
    return null;
  }

  getSessionDir(tenantId) {
    return path.join(this.sessionsDir, tenantId);
  }

  hasExistingCredentials(tenantId) {
    const dir = this.getSessionDir(tenantId);
    const credsPath = path.join(dir, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      return !!(data && data.me && (data.me.id || data.me.jid));
    } catch (e) {
      return false;
    }
  }

  // --- START OR GET SESSION FOR A TENANT ---
  async startSession(tenantIdentifier) {
    let tenant = this.resolveTenant(tenantIdentifier);
    if (!tenant) {
      throw new Error(`Tenant '${tenantIdentifier}' not found`);
    }

    const tenantId = tenant.id;

    // Check existing active session
    let session = this.sessions.get(tenantId);
    if (session && session.status === 'CONNECTED' && session.sock) {
      return this.formatSessionResponse(tenant, session);
    }

    if (!session) {
      session = {
        tenantId,
        sock: null,
        status: 'INITIALIZING',
        qr: null,
        qrImage: null,
        phone: tenant.owner_phone || null,
        lastError: null,
        updatedAt: new Date().toISOString()
      };
      this.sessions.set(tenantId, session);
    }

    // Lazy load Baileys & QRCode
    let baileys, pino, QRCode;
    try {
      baileys = require('@whiskeysockets/baileys');
      pino = require('pino');
      QRCode = require('qrcode');
    } catch (err) {
      console.warn('[BaileysManager] Baileys libraries not available:', err.message);
      session.status = 'OFFLINE';
      session.lastError = 'Baileys libraries missing';
      return this.formatSessionResponse(tenant, session);
    }

    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion
    } = baileys;

    const tenantSessionDir = this.getSessionDir(tenantId);
    const hasAuth = this.hasExistingCredentials(tenantId);

    // If session has no completed credentials, ensure directory is clean to prevent stale keypair handshake rejections
    if (!hasAuth && fs.existsSync(tenantSessionDir)) {
      try {
        fs.rmSync(tenantSessionDir, { recursive: true, force: true });
      } catch (e) {}
    }
    if (!fs.existsSync(tenantSessionDir)) {
      fs.mkdirSync(tenantSessionDir, { recursive: true });
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(tenantSessionDir);
      let version;
      try {
        const vInfo = await fetchLatestBaileysVersion();
        version = vInfo.version;
      } catch (e) {
        version = [2, 3000, 1043857760];
      }

      session.status = hasAuth ? 'CONNECTING' : 'SCAN_QR';
      session.updatedAt = new Date().toISOString();

      // Official WhatsApp Web browser tuple
      const browserTuple = (baileys.Browsers && typeof baileys.Browsers.ubuntu === 'function')
        ? baileys.Browsers.ubuntu('Chrome')
        : ['Ubuntu', 'Chrome', '22.04.4'];

      const sock = (makeWASocket.default || makeWASocket)({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: browserTuple,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        markOnlineOnConnect: true
      });

      session.sock = sock;

      // Handle Credentials Update
      sock.ev.on('creds.update', async () => {
        try {
          await saveCreds();
          if (tenant && tenant.id && tenant.id !== tenantId) {
            const targetDir = this.getSessionDir(tenant.id);
            const currentDir = this.getSessionDir(tenantId);
            if (fs.existsSync(currentDir) && currentDir !== targetDir) {
              fs.cpSync(currentDir, targetDir, { recursive: true });
            }
          }
        } catch (e) {}
      });

      // Handle Connection Lifecycle
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          session.qr = qr;
          try {
            session.qrImage = await QRCode.toDataURL(qr);
          } catch (qrErr) {
            console.error('[BaileysManager] QR Generation Error:', qrErr.message);
          }
          session.status = 'SCAN_QR';
          session.updatedAt = new Date().toISOString();
        }

        if (connection === 'open') {
          session.status = 'CONNECTED';
          session.qr = null;
          session.qrImage = null;
          const phone = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : null;
          if (phone) {
            session.phone = phone;
            tenant.whatsapp_connected_phone = phone;
          }
          session.updatedAt = new Date().toISOString();

          // CRITICAL: Commit pending registration to Database ONLY after QR is scanned & connected!
          if (this.pendingRegistrations && this.pendingRegistrations.has(tenantId)) {
            const committed = this.commitPendingTenant(tenantId, session.phone);
            if (committed) {
              tenant = committed;
            }
          }

          console.log(`[BaileysManager] Sesi WhatsApp ${tenant.name} (${tenant.slug}) BERHASIL TERHUBUNG: +${session.phone}`);
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[BaileysManager] Koneksi ${tenant.slug} ditutup (Code: ${statusCode}, Reconnect: ${shouldReconnect})`);

          if (statusCode === DisconnectReason.loggedOut) {
            session.status = 'DISCONNECTED';
            session.qr = null;
            session.qrImage = null;
            session.sock = null;
            this.purgeAuthFiles(tenantId);
          } else {
            session.status = 'OFFLINE';
            // Auto reconnect after 5s if disconnected unexpectedly
            setTimeout(() => {
              if (this.sessions.has(tenantId) && this.sessions.get(tenantId).status !== 'DISCONNECTED') {
                this.startSession(tenantId).catch(err => console.error('[BaileysManager] Reconnect error:', err.message));
              }
            }, 5000);
          }
          session.updatedAt = new Date().toISOString();
        }
      });

      // Handle Incoming Patient & Doctor Messages
      sock.ev.on('messages.upsert', async (m) => {
        try {
          if (m.type !== 'notify') return;
          for (const msg of m.messages) {
            // Ignore messages sent by bot itself
            if (msg.key.fromMe) continue;
            // Ignore status broadcasts
            if (msg.key.remoteJid === 'status@broadcast') continue;
            // Handle only individual chats (or clinic groups if desired)
            const senderJid = msg.key.remoteJid;
            if (!senderJid) continue;

            const text = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              '';

            if (!text.trim()) continue;

            // Route through Ingress Router bound to this specific tenant!
            const reply = await this.ingressRouter.routeMessage({
              from: senderJid,
              text: text.trim(),
              tenant_slug: tenant.slug
            });

            if (reply && reply.message) {
              await sock.sendMessage(senderJid, { text: reply.message });
            }
          }
        } catch (msgErr) {
          console.error(`[BaileysManager] Error processing incoming chat for ${tenant.slug}:`, msgErr.message);
        }
      });

      return this.formatSessionResponse(tenant, session);
    } catch (err) {
      console.error(`[BaileysManager] Error launching session for ${tenant.slug}:`, err.message);
      session.status = 'OFFLINE';
      session.lastError = err.message;
      return this.formatSessionResponse(tenant, session);
    }
  }

  // --- GET SESSION STATUS ---
  getSessionStatus(tenantIdentifier) {
    let tenant = this.resolveTenant(tenantIdentifier);
    if (!tenant) return null;
    const session = this.sessions.get(tenant.id) || {
      tenantId: tenant.id,
      status: this.hasExistingCredentials(tenant.id) ? 'OFFLINE' : 'DISCONNECTED',
      qrImage: null,
      phone: tenant.whatsapp_connected_phone || tenant.owner_phone || null,
      updatedAt: tenant.updated_at
    };

    // If connected and still pending, commit to DB
    if (session.status === 'CONNECTED' && this.pendingRegistrations && this.pendingRegistrations.has(tenant.id)) {
      const committed = this.commitPendingTenant(tenant.id, session.phone);
      if (committed) {
        tenant = committed;
      }
    }

    return this.formatSessionResponse(tenant, session);
  }

  // --- DISCONNECT & PURGE SESSION ---
  async disconnectSession(tenantIdentifier, purgeAuth = true) {
    const tenant = this.resolveTenant(tenantIdentifier);
    if (!tenant) return false;

    const session = this.sessions.get(tenant.id);
    if (session && session.sock) {
      try {
        await session.sock.logout().catch(() => {});
        session.sock.end();
      } catch (e) {}
    }

    if (purgeAuth) {
      this.purgeAuthFiles(tenant.id);
    }

    this.sessions.set(tenant.id, {
      tenantId: tenant.id,
      status: 'DISCONNECTED',
      qrImage: null,
      qr: null,
      phone: null,
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  purgeAuthFiles(tenantId) {
    const dir = this.getSessionDir(tenantId);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (err) {
        console.error('[BaileysManager] Error deleting session files:', err.message);
      }
    }
  }

  // --- SEND TEST MESSAGE VIA TENANT'S CONNECTED WHATSAPP ---
  async sendTestMessage(tenantIdentifier, recipientPhone, text) {
    const tenant = this.resolveTenant(tenantIdentifier);
    if (!tenant) throw new Error('Tenant not found');

    const session = this.sessions.get(tenant.id);
    if (!session || session.status !== 'CONNECTED' || !session.sock) {
      throw new Error(`Sesi WhatsApp untuk ${tenant.name} belum terhubung.`);
    }

    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, { text });
    return { success: true, recipient: jid, sent_at: new Date().toISOString() };
  }

  // --- GET ALL SESSIONS FOR SUPER ADMIN DASHBOARD ---
  getAllSessions() {
    const result = [];
    for (const tenant of this.db.tenants.values()) {
      const session = this.sessions.get(tenant.id);
      const hasAuth = this.hasExistingCredentials(tenant.id);
      let status = 'DISCONNECTED';
      let phone = tenant.whatsapp_connected_phone || tenant.owner_phone;
      let qrImage = null;

      if (session) {
        status = session.status;
        phone = session.phone || phone;
        qrImage = session.qrImage;
      } else if (hasAuth) {
        status = 'OFFLINE';
      }

      // Generate or retrieve connection link for doctor
      let token = null;
      for (const [t, data] of this.connectTokens.entries()) {
        if (data.tenantId === tenant.id && Date.now() < data.expiresAt) {
          token = t;
          break;
        }
      }
      if (!token) {
        token = this.generateConnectToken(tenant.id);
      }

      result.push({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        category: tenant.category,
        status,
        phone,
        qr_image: qrImage,
        has_auth_saved: hasAuth,
        connect_token: token,
        connect_url: `/connect?token=${token}`
      });
    }
    return result;
  }

  formatSessionResponse(tenant, session) {
    let token = null;
    for (const [t, data] of this.connectTokens.entries()) {
      if (data.tenantId === tenant.id && Date.now() < data.expiresAt) {
        token = t;
        break;
      }
    }
    if (!token) {
      token = this.generateConnectToken(tenant.id);
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        category: tenant.category,
        owner_phone: tenant.owner_phone
      },
      status: session.status,
      phone: session.phone || tenant.whatsapp_connected_phone || tenant.owner_phone,
      qr_image: session.qrImage,
      has_auth_saved: this.hasExistingCredentials(tenant.id),
      connect_token: token,
      connect_url: `/connect?token=${token}`,
      updated_at: session.updatedAt
    };
  }
}

module.exports = { BaileysManager };
