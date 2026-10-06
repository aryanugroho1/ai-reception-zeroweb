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
  normalizePhone(phone) {
    if (!phone) return '';
    const str = phone.toString().split('@')[0].split(':')[0];
    let clean = str.replace(/\D/g, '');
    if (!clean) return '';

    // Auto-repair accidentally double-prefixed Japanese numbers (62 + 8170/8180/8190 xxxxxxxx)
    if (/^62(81[789]0\d{7,8})$/.test(clean)) {
      return clean.slice(2);
    }

    // If starts with 081 followed by 70/80/90, it is Japanese international entered with leading 0 (0 + 8170...)
    if (/^0(81[789]0\d{7,8})$/.test(clean)) {
      return clean.slice(1);
    }

    // Japanese mobile numbers (+81 70/80/90 xxxx xxxx, 12 digits)
    if (/^81[789]0\d{7,8}$/.test(clean)) {
      return clean;
    }

    // Other Japanese phone numbers (+81 xxxxxxxxx)
    if (/^81\d{9,10}$/.test(clean)) {
      return clean;
    }

    // Other international country codes starting with 8 (Korea 82, Vietnam 84, China 86, HK 852, etc.)
    if (/^(?:82|84|86|852|853|855|856|880|886)\d{7,}/.test(clean)) {
      return clean;
    }

    // If starts with 0 (national Indonesian format e.g. 0812...), convert national 0 to 62
    if (clean.startsWith('0')) {
      return '62' + clean.slice(1);
    }

    // Already Indonesian international format (+62...)
    if (clean.startsWith('62')) {
      return clean;
    }

    // If Indonesian mobile shorthand without leading 0 (e.g. 811..., 812..., 857...)
    // and NOT an international number
    if (clean.startsWith('8') && !clean.startsWith('8170') && !clean.startsWith('8180') && !clean.startsWith('8190')) {
      if (/^8(?:1[1-9]|2[1-3]|3[1-8]|5[1-9]|7[7-9]|8[1-9]|9[5-9])\d{6,9}$/.test(clean)) {
        return '62' + clean;
      }
    }

    return clean;
  }

  constructor({ db, ingressRouter, sessionsDir, logger }) {
    this.db = db;
    this.ingressRouter = ingressRouter;
    this.logger = logger || null;
    this.sessionsDir = sessionsDir || path.join(__dirname, '../sessions');
    this.sessions = new Map(); // tenantId -> sessionData
    this.tokenSecret = process.env.CONNECT_TOKEN_SECRET || 'praktika-doctor-onboard-secret-2026';
    this.connectTokens = new Map(); // token -> { tenantId, expiresAt }
    this.pendingRegistrations = new Map(); // pendingId -> pendingData
    this.lidMap = new Map(); // LID -> Phone and Phone -> LID bidirectional cache
    this.sentMessageIds = new Set(); // Sent message IDs to prevent echo looping in self-chat
    this.tokensFilePath = path.join(__dirname, '../data/connect_tokens.json');
    this.loadTokens();

    // Ensure sessions root directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      try {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      } catch (err) {
        console.error('[BaileysManager] Failed to create sessions dir:', err.message);
      }
    }
  }

  loadTokens() {
    if (this.db && typeof this.db.kvGet === 'function') {
      const storedTokens = this.db.kvGet('baileys_connect_tokens');
      if (Array.isArray(storedTokens)) {
        this.connectTokens = new Map(storedTokens);
      }
      const storedPending = this.db.kvGet('baileys_pending_registrations');
      if (Array.isArray(storedPending)) {
        this.pendingRegistrations = new Map(storedPending);
      }
    }
    if (this.connectTokens.size === 0) {
      const candidatePaths = [
        this.tokensFilePath,
        `${this.tokensFilePath}.bak`,
        path.join(process.cwd(), 'data/connect_tokens.json')
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (Array.isArray(raw)) {
              this.connectTokens = new Map(raw);
              break;
            }
          } catch (e) {
            console.warn(`[BaileysManager] Failed loading connect tokens from ${p}:`, e.message);
          }
        }
      }
    }
  }

  saveTokens() {
    if (this.db && typeof this.db.kvSet === 'function') {
      this.db.kvSet('baileys_connect_tokens', Array.from(this.connectTokens.entries()));
      this.db.kvSet('baileys_pending_registrations', Array.from(this.pendingRegistrations.entries()));
    }
    try {
      const dir = path.dirname(this.tokensFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const jsonStr = JSON.stringify(Array.from(this.connectTokens.entries()), null, 2);
      fs.writeFileSync(this.tokensFilePath, jsonStr, 'utf8');
      try {
        fs.writeFileSync(`${this.tokensFilePath}.bak`, jsonStr, 'utf8');
      } catch (e) {}
    } catch (e) {
      console.warn('[BaileysManager] Failed saving connect tokens to disk:', e.message);
    }
  }

  /**
   * Auto-restore all active WhatsApp sessions across all tenants on server startup
   * Ensures sessions persist and reconnect automatically across server restarts / redeploys!
   */
  async autoRestoreSessions() {
    const tenants = Array.from(this.db.tenants.values());
    const restoredTenantIds = new Set();
    let restoredCount = 0;

    // 1. Auto-restore active sessions for all recognized tenants
    for (const tenant of tenants) {
      if (this.hasExistingCredentials(tenant.id)) {
        try {
          console.log(`[BaileysManager] Memulihkan koneksi WhatsApp otomatis untuk ${tenant.name} (${tenant.slug})...`);
          if (this.logger && typeof this.logger.addAuditLog === 'function') {
            this.logger.addAuditLog('info', 'BAILEYS', `Memulihkan sesi WhatsApp ${tenant.name} secara otomatis...`);
          }
          this.startSession(tenant.id).catch(err => {
            console.warn(`[BaileysManager] Background auto-restore warning for ${tenant.slug}:`, err.message);
          });
          restoredTenantIds.add(tenant.id);
          restoredCount++;
        } catch (err) {
          console.warn(`[BaileysManager] Gagal memulai auto-restore untuk ${tenant.slug}:`, err.message);
        }
      }
    }

    // 2. Scan sessions directory on disk: log orphans, NEVER resurrect ghost tenants into DB!
    if (fs.existsSync(this.sessionsDir)) {
      try {
        const subDirs = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
        for (const dirent of subDirs) {
          if (dirent.isDirectory()) {
            const folderName = dirent.name;
            const isAliased = tenants.some(t => t.session_dir_key === folderName);
            if (!restoredTenantIds.has(folderName) && !this.db.tenants.has(folderName) && !isAliased) {
              console.log(`[BaileysManager] Folder sesi disk tak bertuan diabaikan: ${folderName}`);
            }
          }
        }
      } catch (dirErr) {
        console.warn('[BaileysManager] Error scanning sessions directory:', dirErr.message);
      }
    }

    if (restoredCount > 0) {
      console.log(`[BaileysManager] Berhasil memicu pemulihan otomatis untuk ${restoredCount} sesi WhatsApp.`);
    }
  }

  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Resolve Phone Number and LID from incoming Baileys message
   * Supports WhatsApp Multi-Device privacy accounts where remoteJid is @lid
   */
  async resolveSenderIdentity(msg, sock) {
    const rawJid = msg.key?.remoteJid || '';
    const altJid = msg.key?.remoteJidAlt || msg.key?.participantAlt || '';

    let cleanPhone = '';
    let cleanLid = '';

    // If rawJid is LID e.g. 28918434295981@lid
    if (rawJid.includes('@lid')) {
      cleanLid = rawJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    } else {
      cleanPhone = this.normalizePhone(rawJid);
    }

    // Check if altJid has phone number
    if (altJid && (altJid.includes('@s.whatsapp.net') || !altJid.includes('@lid'))) {
      cleanPhone = this.normalizePhone(altJid);
    } else if (altJid && altJid.includes('@lid') && !cleanLid) {
      cleanLid = altJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    }

    // Query Baileys signalRepository reverse LID mapping if cleanPhone is still missing
    if (!cleanPhone && cleanLid && sock?.signalRepository?.lidMapping?.getPNForLID) {
      try {
        const pnJid = await sock.signalRepository.lidMapping.getPNForLID(rawJid);
        if (pnJid) {
          cleanPhone = this.normalizePhone(pnJid);
        }
      } catch (e) {}
    }

    // Check our local memory cache
    if (!cleanPhone && cleanLid && this.lidMap && this.lidMap.has(cleanLid)) {
      cleanPhone = this.lidMap.get(cleanLid);
    }

    // Store mapping bidirectional
    if (cleanLid && cleanPhone) {
      this.lidMap.set(cleanLid, cleanPhone);
      this.lidMap.set(cleanPhone, cleanLid);
    }

    return {
      senderJid: rawJid,
      phone: cleanPhone || cleanLid,
      lid: cleanLid || null,
      resolvedPhone: cleanPhone || null
    };
  }

  // --- PENDING REGISTRATION STAGING ---
  registerPendingTenant(pendingData) {
    // Generate permanent-style tenant ID so session directory won't need to be moved upon commit
    const pendingId = pendingData.id || `t-${crypto.randomUUID().slice(0, 8)}`;
    const data = {
      ...pendingData,
      id: pendingId,
      created_at: Date.now()
    };
    this.pendingRegistrations.set(pendingId, data);
    this.saveTokens();
    const token = this.generateConnectToken(pendingId);
    return { pendingId, token };
  }

  getPendingTenant(pendingId) {
    return this.pendingRegistrations.get(pendingId);
  }

  cancelPendingTenant(pendingId) {
    this.pendingRegistrations.delete(pendingId);
    this.sessions.delete(pendingId);
    this.saveTokens();
    return true;
  }

  commitPendingTenant(pendingId, actualConnectedPhone) {
    if (!this.pendingRegistrations.has(pendingId)) return null;
    const p = this.pendingRegistrations.get(pendingId);
    const phone = actualConnectedPhone || p.rawPhone || p.phone;

    // Check if tenant with this ID or phone already exists in DB
    let tenant = this.db.tenants.get(p.id) || this.db.tenants.get(pendingId) || (phone ? this.db.getTenantByPhone(phone) : null);
    if (tenant) {
      tenant.name = p.business_name || tenant.name;
      tenant.category = p.category || tenant.category;
      tenant.subscription_plan = p.plan || tenant.subscription_plan;
      tenant.subscription_until = p.subUntil || tenant.subscription_until;
      tenant.whatsapp_connected_phone = phone;
      if (p.owner_phone) tenant.owner_phone = p.owner_phone;
      if (p.email) tenant.owner_email = p.email;
      if (p.coupon_code) {
        tenant.coupon_code = p.coupon_code;
        tenant.coupon_key = p.coupon_key;
      }
      tenant.is_accepting_patients = true;
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});
    } else {
      const rawSlug = (p.slug || p.business_name || 'bisnis').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24);
      const uniqueSlug = p.slug || `${rawSlug}_${Math.floor(100 + Math.random() * 900)}`;
      tenant = this.db.createTenant({
        id: p.id || pendingId,
        name: p.business_name,
        slug: uniqueSlug,
        owner_phone: p.owner_phone || phone,
        owner_email: p.email,
        whatsapp_connected_phone: phone,
        coupon_code: p.coupon_code || null,
        coupon_key: p.coupon_key || null,
        category: p.category || 'GENERAL',
        subscription_plan: p.plan || 'STARTER',
        subscription_until: p.subUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Jakarta'
      });
      tenant.whatsapp_connected_phone = phone;
      if (p.coupon_code) {
        tenant.coupon_code = p.coupon_code;
        tenant.coupon_key = p.coupon_key;
      }
      tenant.is_accepting_patients = true;
      if (this.db && typeof this.db.pgUpsertTenant === 'function') {
        this.db.pgUpsertTenant(tenant).catch(() => {});
      }

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

    // Record invoice if attached to registration
    if (p.invoice) {
      try {
        const invId = p.invoice.id || `inv-${crypto.randomUUID().slice(0, 8)}`;
        this.db.subscriptionInvoices.set(invId, {
          id: invId,
          tenant_id: tenant.id,
          invoice_number: p.invoice.invoice_number || invId,
          plan_tier: p.invoice.plan_tier || tenant.subscription_plan,
          amount: Number(p.invoice.amount || 0),
          payment_provider: p.invoice.payment_provider || (p.coupon_code ? `COUPON_${p.coupon_code}` : 'MAYAR'),
          status: 'PAID',
          paid_at: p.invoice.paid_at || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (invErr) {}
    }

    // Move session to committed tenant ID & keep alias so immediate frontend poll doesn't fail
    const pendingSession = this.sessions.get(pendingId);
    if (pendingSession) {
      pendingSession.tenantId = tenant.id;
      this.sessions.set(tenant.id, pendingSession);
      this.sessions.set(pendingId, pendingSession);
    }

    // Keep the live socket's auth folder in place. Previously the folder was copied
    // and the original deleted while the socket was still writing signal keys into
    // it, which broke the first minutes after linking and any later reconnect.
    const pendingDir = path.join(this.sessionsDir, pendingId);
    if (fs.existsSync(pendingDir) && pendingId !== tenant.id) {
      tenant.session_dir_key = pendingId;
    }

    // Update connect tokens referencing pendingId
    for (const [t, data] of this.connectTokens.entries()) {
      if (data.tenantId === pendingId) {
        data.tenantId = tenant.id;
      }
    }

    this.pendingRegistrations.delete(pendingId);
    this.saveTokens();
    if (this.db && typeof this.db.saveToFile === 'function') {
      this.db.saveToFile();
    }
    console.log(`[BaileysManager] ✅ Tenant RESMI MASUK DATABASE setelah scan QR berhasil: ${tenant.name} (${tenant.id}) - Bot: +${tenant.whatsapp_connected_phone}`);
    return tenant;
  }

  // --- TOKEN GENERATOR FOR DOCTOR ONBOARDING PORTAL ---
  generateConnectToken(tenantId) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days valid
    this.connectTokens.set(rawToken, { tenantId, expiresAt });
    this.saveTokens();
    return rawToken;
  }

  verifyConnectToken(token) {
    if (!token) return null;
    const item = this.connectTokens.get(token);
    if (item) {
      if (Date.now() > item.expiresAt) {
        this.connectTokens.delete(token);
        this.saveTokens();
        return null;
      }
      return item.tenantId;
    }
    // Fallback: If token itself matches a registered tenant ID or slug
    const tenant = this.db.tenants.get(token) || this.db.getTenantBySlug(token);
    if (tenant) {
      return tenant.id;
    }
    return null;
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
    // Tenants committed from a pending registration keep using the auth folder
    // they originally paired in (session_dir_key), so the live socket's key
    // writes never land in a deleted directory.
    const t = this.db && this.db.tenants ? this.db.tenants.get(tenantId) : null;
    const key = (t && t.session_dir_key) || tenantId;
    return path.join(this.sessionsDir, key);
  }

  hasExistingCredentials(tenantId) {
    const dir = this.getSessionDir(tenantId);
    const credsPath = path.join(dir, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      return !!(
        (data && data.me && (data.me.id || data.me.jid)) ||
        (data && data.registered === true)
      );
    } catch (e) {
      return false;
    }
  }

  async ensureSessionStarted(tenantId) {
    if (!tenantId) return null;
    let session = this.sessions.get(tenantId);
    if (session && (session.status === 'CONNECTED' || (session.sock && session.status !== 'DISCONNECTED'))) {
      return session;
    }
    this.startingPromises = this.startingPromises || new Map();
    if (this.startingPromises.has(tenantId)) {
      return this.startingPromises.get(tenantId);
    }
    const p = this.startSession(tenantId).catch(err => {
      console.warn(`[BaileysManager] ensureSessionStarted notice for ${tenantId}:`, err.message);
      return null;
    }).finally(() => {
      this.startingPromises.delete(tenantId);
    });
    this.startingPromises.set(tenantId, p);
    return p;
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

    // Do NOT tear down a socket that is showing a QR or finishing the handshake.
    // Killing it here (page reload, "Refresh QR", second tab, polling) is what made
    // the phone show "no connection / couldn't link device" right after scanning.
    if (session && session.sock && (session.status === 'SCAN_QR' || session.status === 'CONNECTING')) {
      const ageMs = Date.now() - new Date(session.updatedAt || 0).getTime();
      if (ageMs < 120000) {
        return this.formatSessionResponse(tenant, session);
      }
    }

    if (session && session.sock && session.status !== 'CONNECTED') {
      try {
        session.sock.ev.removeAllListeners();
        session.sock.end(undefined);
      } catch (e) {}
      session.sock = null;
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

      // Standard Desktop WhatsApp Web browser tuple (Windows Desktop)
      const browserTuple = (baileys.Browsers && typeof baileys.Browsers.appropriate === 'function')
        ? baileys.Browsers.appropriate('Desktop')
        : (baileys.Browsers && typeof baileys.Browsers.windows === 'function')
          ? baileys.Browsers.windows('Desktop')
          : ['Windows', 'Desktop', '10.0.22631'];

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
        markOnlineOnConnect: true,
        getMessage: async () => ({ conversation: '' })
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
          if (this.logger && typeof this.logger.addAuditLog === 'function') {
            this.logger.addAuditLog('info', 'BAILEYS', `QR Code baru dibuat untuk [${tenant.slug}]. Siap di-scan.`);
          }
        }

        if (connection === 'open') {
          session.status = 'CONNECTED';
          session.reconnectAttempts = 0;
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
          if (this.logger && typeof this.logger.addAuditLog === 'function') {
            this.logger.addAuditLog('success', 'BAILEYS', `WhatsApp ${tenant.name} (${tenant.slug}) BERHASIL TERHUBUNG: +${session.phone}`);
          }

          // Pre-resolve doctor's LID if owner_phone is known
          if (tenant.owner_phone && sock?.signalRepository?.lidMapping?.getLIDForPN) {
            try {
              const cleanOwner = this.normalizePhone(tenant.owner_phone);
              const lid = await sock.signalRepository.lidMapping.getLIDForPN(`${cleanOwner}@s.whatsapp.net`);
              if (lid) {
                const cleanLid = lid.split('@')[0].split(':')[0].replace(/\D/g, '');
                this.lidMap.set(cleanLid, cleanOwner);
                this.lidMap.set(cleanOwner, cleanLid);
                tenant.doctor_lid = cleanLid;
                if (this.db && typeof this.db.saveToFile === 'function') {
                  this.db.saveToFile();
                }
                console.log(`[BaileysManager] Pre-mapped doctor LID: ${cleanOwner} -> LID:${cleanLid}`);
              }
            } catch (e) {}
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[BaileysManager] Koneksi ${tenant.slug} ditutup (Code: ${statusCode}, Reconnect: ${shouldReconnect})`);
          if (this.logger && typeof this.logger.addAuditLog === 'function') {
            this.logger.addAuditLog('warning', 'BAILEYS', `Koneksi WhatsApp ${tenant.slug} ditutup (Code: ${statusCode || 'unknown'})`);
          }

          if (statusCode === DisconnectReason.loggedOut) {
            session.status = 'DISCONNECTED';
            session.qr = null;
            session.qrImage = null;
            session.sock = null;
            console.warn(`[BaileysManager] Sesi ${tenant.slug} ditutup (loggedOut). Berkas autentikasi disk tetap diamankan.`);
          } else {
            // After a QR scan WhatsApp always closes with 515 (restartRequired) and
            // expects the client to reconnect right away. Waiting 5s here made the
            // phone time out with "no connection" during "Link a device".
            const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;
            session.status = isRestartRequired ? 'CONNECTING' : 'OFFLINE';
            if (session.sock === sock) session.sock = null;
            try { sock.ev.removeAllListeners(); } catch (e) {}
            session.reconnectAttempts = isRestartRequired ? 0 : (session.reconnectAttempts || 0) + 1;
            const delay = isRestartRequired ? 0 : Math.min(30000, 2000 * session.reconnectAttempts);
            // Use the session's current tenantId: after commit it is the real tenant id,
            // the captured pendingId no longer resolves.
            const reconnectId = session.tenantId || tenantId;
            setTimeout(() => {
              const s = this.sessions.get(reconnectId);
              if (s && s.status !== 'DISCONNECTED' && !s.sock) {
                this.startSession(reconnectId).catch(err => console.error('[BaileysManager] Reconnect error:', err.message));
              }
            }, delay);
          }
          session.updatedAt = new Date().toISOString();
        }
      });

      // Handle Incoming Patient & Doctor Messages
      sock.ev.on('messages.upsert', async (m) => {
        try {
          if (m.type !== 'notify' && m.type !== 'append') return;
          for (const msg of m.messages) {
            const senderJid = msg.key?.remoteJid;
            if (!senderJid) continue;

            // 0. ANTI-LOOP GUARD: Drop any messages sent by our own bot instance
            if (msg.key?.id && this.sentMessageIds.has(msg.key.id)) {
              continue;
            }

            // 1. STRICTLY IGNORE GROUP CHATS, BROADCASTS, CHANNELS/NEWSLETTERS
            // The AI Receptionist must NEVER reply to WhatsApp groups or broadcast lists!
            if (senderJid.endsWith('@g.us') || senderJid.includes('@g.us') || msg.key.participant) continue;
            if (senderJid.endsWith('@newsletter') || senderJid.includes('@newsletter')) continue;
            if (senderJid === 'status@broadcast' || senderJid.endsWith('@broadcast')) continue;

            const text = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              '';

            if (!text.trim()) continue;

            // Resolve Sender Identity (Handles modern WhatsApp @lid privacy accounts)
            const identity = await this.resolveSenderIdentity(msg, sock);
            const cleanSenderPhone = identity.resolvedPhone || (senderJid.includes('@lid') ? '' : identity.phone);
            const cleanSenderLid = identity.lid;

            // Support "Message to Self" (You) if doctor uses same phone for bot & practice management
            const cleanOwnerPhone = this.normalizePhone(tenant.owner_phone);
            const cleanBotPhone = this.normalizePhone(tenant.whatsapp_connected_phone || (sock.user && sock.user.id));
            const cleanDoctorLid = tenant.doctor_lid ? tenant.doctor_lid.toString().replace(/\D/g, '') : null;

            const extraPhones = Array.isArray(tenant.whitelist_phones)
              ? tenant.whitelist_phones.map(p => this.normalizePhone(p))
              : (tenant.whitelist_phones ? tenant.whitelist_phones.split(',').map(p => this.normalizePhone(p)) : []);

            const isDoctorOrOwner =
              (cleanSenderPhone && (cleanSenderPhone === cleanOwnerPhone || cleanSenderPhone === cleanBotPhone || extraPhones.includes(cleanSenderPhone))) ||
              (cleanSenderLid && (cleanSenderLid === cleanDoctorLid || cleanSenderLid === cleanOwnerPhone || extraPhones.includes(cleanSenderLid)));

            const isSelfDoctorChat = msg.key.fromMe && isDoctorOrOwner;

            // If message sent by bot itself to other users, ignore to prevent looping.
            // If message to self from doctor, only process recognized Copilot commands.
            if (msg.key.fromMe) {
              if (!isSelfDoctorChat) continue;
              const cleanMsg = text.trim();
              // Anti-loop defense: Doctor commands are short single-line inputs (e.g. "jadwal", "next").
              // Ignore bot response templates, status emojis, long formatted text, and multi-line summaries.
              if (cleanMsg.length > 100 || cleanMsg.includes('\n') || /^[📅✅🛑🟢🩺ℹ️👋🔢⚠️📋]/.test(cleanMsg)) {
                continue;
              }
              const isCopilotCmd = /^\s*(?:NEXT|BERIKUTNYA|PANGGIL|DONE|SELESAI|STATUS|ANTREAN|DAFTAR|JADWAL|REKAP|HARI\s+INI|LIST|DASHBOARD|RINGKASAN|INSIGHT|CHART|GRAFIK|TARIF|LAYANAN|HARGA|TAMBAH|UBAH|TUTUP|ISTIRAHAT|PAUSE|BUKA|AKTIF|MENU|HELP|BANTUAN|BESOK|LIBUR|JAM|OPERASIONAL|TANGGAL)(?:\s+.*)?$/i.test(cleanMsg);
              if (!isCopilotCmd) continue;
            }

            const senderLabel = identity.resolvedPhone
              ? `+${identity.resolvedPhone} (LID: ${identity.lid})`
              : (identity.lid ? `+${identity.lid} [LID]` : `+${identity.phone}`);

            // ONLY log Whitelist Number (Doctor / Owner) messages to superadmin log stream!
            // Do NOT log patient messages to avoid noise and clutter
            if (isDoctorOrOwner && this.logger && typeof this.logger.addAuditLog === 'function') {
              this.logger.addAuditLog('info', 'KOPILOT', `Pesan masuk Dokter (${senderLabel}) [${tenant.slug}]: "${text.trim().slice(0, 40)}"`);
            }

            // Route through Ingress Router bound to this specific tenant!
            const reply = await this.ingressRouter.routeMessage({
              from: senderJid,
              sender_phone: cleanSenderPhone,
              sender_lid: cleanSenderLid,
              text: text.trim(),
              tenant_slug: tenant.slug
            });

            if (reply && reply.message) {
              const sent = await sock.sendMessage(senderJid, { text: reply.message });
              if (sent?.key?.id) {
                this.sentMessageIds.add(sent.key.id);
                // Evict after 3 minutes to keep memory footprint bounded
                setTimeout(() => this.sentMessageIds.delete(sent.key.id), 180000);
              }
              if (isDoctorOrOwner && this.logger && typeof this.logger.addAuditLog === 'function') {
                this.logger.addAuditLog('success', 'KOPILOT', `Balasan Kopilot terkirim ke Dokter ${senderLabel}`);
              }
            }

            // Dispatch any outbound patient notifications (e.g. Patient called on NEXT, queue nudge, or completed)
            if (Array.isArray(reply?.notifications) && reply.notifications.length > 0) {
              for (const notif of reply.notifications) {
                if (!notif.phone || !notif.message) continue;
                const normPhone = this.normalizePhone(notif.phone);
                if (!normPhone) continue;
                const notifJid = `${normPhone}@s.whatsapp.net`;
                console.log(`[BaileysManager] Mengirim notifikasi [${notif.type}] ke target: ${notifJid} (raw: ${notif.phone})`);
                try {
                  const notifSent = await sock.sendMessage(notifJid, { text: notif.message });
                  if (notifSent?.key?.id) {
                    this.sentMessageIds.add(notifSent.key.id);
                    setTimeout(() => this.sentMessageIds.delete(notifSent.key.id), 180000);
                  }
                  console.log(`[BaileysManager] Berhasil mengirim notifikasi [${notif.type}] ke ${notifJid}`);
                  if (this.logger && typeof this.logger.addAuditLog === 'function') {
                    this.logger.addAuditLog('success', 'NOTIFIKASI', `Pengingat [${notif.type}] terkirim ke pasien +${normPhone}`);
                  }
                } catch (notifErr) {
                  console.warn(`[BaileysManager] Gagal kirim ke ${notifJid} (${notifErr.message}), mencoba fallback LID...`);
                  const mappedLid = this.lidMap && (this.lidMap.get(normPhone) || this.lidMap.get(notif.phone));
                  if (mappedLid) {
                    try {
                      const lidJid = `${mappedLid}@lid`;
                      const notifSentLid = await sock.sendMessage(lidJid, { text: notif.message });
                      if (notifSentLid?.key?.id) {
                        this.sentMessageIds.add(notifSentLid.key.id);
                        setTimeout(() => this.sentMessageIds.delete(notifSentLid.key.id), 180000);
                      }
                      console.log(`[BaileysManager] Berhasil mengirim notifikasi via LID fallback: ${lidJid}`);
                      if (this.logger && typeof this.logger.addAuditLog === 'function') {
                        this.logger.addAuditLog('success', 'NOTIFIKASI', `Pengingat [${notif.type}] terkirim ke pasien via LID: ${mappedLid}`);
                      }
                    } catch (lidErr) {
                      console.error(`[BaileysManager] Gagal mengirim pengingat via LID fallback:`, lidErr.message);
                    }
                  } else {
                    console.error(`[BaileysManager] Gagal mengirim pengingat ke +${normPhone}:`, notifErr.message);
                  }
                }
              }
            }
          }
        } catch (msgErr) {
          console.error(`[BaileysManager] Error processing incoming chat for ${tenant.slug}:`, msgErr.message);
          if (this.logger && typeof this.logger.addAuditLog === 'function') {
            this.logger.addAuditLog('danger', 'WHATSAPP', `Gagal memproses pesan [${tenant.slug}]: ${msgErr.message}`);
          }
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
    let session = this.sessions.get(tenant.id);
    if (!session || session.status === 'DISCONNECTED') {
      this.ensureSessionStarted(tenant.id);
      session = this.sessions.get(tenant.id) || {
        tenantId: tenant.id,
        status: this.hasExistingCredentials(tenant.id) ? 'OFFLINE' : 'STARTING',
        qrImage: null,
        phone: tenant.whatsapp_connected_phone || tenant.owner_phone || null,
        updatedAt: tenant.updated_at
      };
    }

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
    const targetId = tenant ? tenant.id : tenantIdentifier;

    const session = this.sessions.get(targetId);
    if (session && session.sock) {
      try {
        await Promise.race([
          session.sock.logout().catch(() => {}),
          new Promise(r => setTimeout(r, 2000))
        ]);
      } catch (e) {}
      try {
        session.sock.end();
      } catch (e) {}
    }

    if (purgeAuth) {
      this.purgeAuthFiles(targetId);
      this.sessions.delete(targetId);
      if (tenant && tenant.slug) {
        this.sessions.delete(tenant.slug);
      }
    } else {
      this.sessions.set(targetId, {
        tenantId: targetId,
        status: 'DISCONNECTED',
        qrImage: null,
        qr: null,
        phone: null,
        updatedAt: new Date().toISOString()
      });
    }

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
