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

    // Ensure sessions root directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      try {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      } catch (err) {
        console.error('[BaileysManager] Failed to create sessions dir:', err.message);
      }
    }
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

  // Helper to resolve tenant
  resolveTenant(identifier) {
    return this.db.tenants.get(identifier) || this.db.getTenantBySlug(identifier);
  }

  getSessionDir(tenantId) {
    return path.join(this.sessionsDir, tenantId);
  }

  hasExistingCredentials(tenantId) {
    const dir = this.getSessionDir(tenantId);
    return fs.existsSync(path.join(dir, 'creds.json'));
  }

  // --- START OR GET SESSION FOR A TENANT ---
  async startSession(tenantIdentifier) {
    const tenant = this.resolveTenant(tenantIdentifier);
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
        version = [2, 3000, 1015901307];
      }

      session.status = this.hasExistingCredentials(tenantId) ? 'CONNECTING' : 'SCAN_QR';
      session.updatedAt = new Date().toISOString();

      const sock = (makeWASocket.default || makeWASocket)({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Praktika AI Receptionist', 'Chrome', '124.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: true
      });

      session.sock = sock;

      // Handle Credentials Update
      sock.ev.on('creds.update', saveCreds);

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
    const tenant = this.resolveTenant(tenantIdentifier);
    if (!tenant) return null;
    const session = this.sessions.get(tenant.id) || {
      tenantId: tenant.id,
      status: this.hasExistingCredentials(tenant.id) ? 'OFFLINE' : 'DISCONNECTED',
      qrImage: null,
      phone: tenant.whatsapp_connected_phone || tenant.owner_phone || null,
      updatedAt: tenant.updated_at
    };
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
