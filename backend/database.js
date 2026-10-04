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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DatabaseEngine {
  constructor(storagePath = null) {
    this.tenants = new Map();
    this.services = new Map();
    this.appointments = new Map();
    this.subscriptionInvoices = new Map();
    this.idempotencyRecords = new Map();
    this.userSessions = new Map();

    this.databaseUrl = process.env.DATABASE_URL || null;
    this.pgPool = null;

    if (storagePath === false || process.env.NODE_ENV === 'test') {
      this.storagePath = null;
      this.seedSampleData();
    } else {
      this.storagePath = storagePath || process.env.DB_STORAGE_PATH || path.join(__dirname, '../data/app_database.json');
      this.loadFromFile();
      if (this.databaseUrl) {
        this.setupPostgres();
      }
    }
  }

  setupPostgres() {
    if (!this.databaseUrl) return;
    try {
      const { Pool } = require('pg');
      const isLocal = this.databaseUrl.includes('localhost') || this.databaseUrl.includes('127.0.0.1');
      this.pgPool = new Pool({
        connectionString: this.databaseUrl,
        ssl: isLocal ? false : { rejectUnauthorized: false }
      });
      console.log('[DatabaseEngine] Menginisialisasi koneksi PostgreSQL Cloud Database...');
      this.initPostgres().catch(err => {
        console.warn('[DatabaseEngine] PostgreSQL Init Notice:', err.message);
      });
    } catch (e) {
      console.warn('[DatabaseEngine] PostgreSQL setup error:', e.message);
    }
  }

  async initPostgres() {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        console.log('[DatabaseEngine] Terhubung ke PostgreSQL!');
        await client.query(`
          CREATE TABLE IF NOT EXISTS app_kv_store (
            key TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE,
            name TEXT,
            owner_phone TEXT,
            category TEXT,
            subscription_plan TEXT,
            subscription_until TIMESTAMPTZ,
            whatsapp_connected_phone TEXT,
            owner_email TEXT,
            is_accepting_patients BOOLEAN DEFAULT true,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            name TEXT,
            duration_minutes INT,
            price NUMERIC,
            is_active BOOLEAN DEFAULT true,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            service_id TEXT,
            customer_phone TEXT,
            customer_name TEXT,
            status TEXT,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS subscription_invoices (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            plan_tier TEXT,
            amount NUMERIC,
            status TEXT,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Load existing records from Postgres into memory
        const { rows: tenantRows } = await client.query('SELECT * FROM tenants');
        if (tenantRows.length > 0) {
          console.log(`[DatabaseEngine] ✅ Berhasil memuat ${tenantRows.length} tenant dari PostgreSQL Cloud`);
          for (const row of tenantRows) {
            const tData = row.data || {};
            this.tenants.set(row.id, {
              ...tData,
              id: row.id,
              slug: row.slug || tData.slug,
              name: row.name || tData.name,
              owner_phone: row.owner_phone || tData.owner_phone,
              category: row.category || tData.category,
              subscription_plan: row.subscription_plan || tData.subscription_plan,
              subscription_until: row.subscription_until ? new Date(row.subscription_until).toISOString() : tData.subscription_until,
              whatsapp_connected_phone: row.whatsapp_connected_phone || tData.whatsapp_connected_phone,
              owner_email: row.owner_email || tData.owner_email,
              is_accepting_patients: row.is_accepting_patients !== undefined ? row.is_accepting_patients : tData.is_accepting_patients,
              created_at: row.created_at ? new Date(row.created_at).toISOString() : tData.created_at,
              updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : tData.updated_at
            });
          }
        } else {
          for (const tenant of this.tenants.values()) {
            await this.pgUpsertTenant(tenant, client);
          }
        }

        const { rows: serviceRows } = await client.query('SELECT * FROM services');
        if (serviceRows.length > 0) {
          for (const row of serviceRows) {
            const sData = row.data || {};
            this.services.set(row.id, {
              ...sData,
              id: row.id,
              tenant_id: row.tenant_id,
              name: row.name || sData.name,
              duration_minutes: row.duration_minutes || sData.duration_minutes,
              price: Number(row.price || sData.price),
              is_active: row.is_active !== false,
              created_at: row.created_at ? new Date(row.created_at).toISOString() : sData.created_at,
              updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : sData.updated_at
            });
          }
        } else {
          for (const service of this.services.values()) {
            await this.pgUpsertService(service, client);
          }
        }

        const { rows: aptRows } = await client.query('SELECT * FROM appointments');
        if (aptRows.length > 0) {
          for (const row of aptRows) {
            const aData = row.data || {};
            this.appointments.set(row.id, {
              ...aData,
              id: row.id,
              tenant_id: row.tenant_id,
              service_id: row.service_id,
              customer_phone: row.customer_phone,
              customer_name: row.customer_name,
              status: row.status,
              start_time: row.start_time ? new Date(row.start_time).toISOString() : aData.start_time,
              end_time: row.end_time ? new Date(row.end_time).toISOString() : aData.end_time
            });
          }
        } else {
          for (const apt of this.appointments.values()) {
            await this.pgUpsertAppointment(apt, client);
          }
        }

        const { rows: invRows } = await client.query('SELECT * FROM subscription_invoices');
        if (invRows.length > 0) {
          for (const row of invRows) {
            const iData = row.data || {};
            this.subscriptionInvoices.set(row.id, {
              ...iData,
              id: row.id,
              tenant_id: row.tenant_id,
              plan_tier: row.plan_tier,
              amount: Number(row.amount),
              status: row.status
            });
          }
        } else {
          for (const inv of this.subscriptionInvoices.values()) {
            await this.pgUpsertInvoice(inv, client);
          }
        }

        console.log('[DatabaseEngine] ✅ Sinkronisasi PostgreSQL Cloud aktif & data terjamin aman!');
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('[DatabaseEngine] Koneksi PostgreSQL dilewati / gagal:', err.message);
    }
  }

  async pgUpsertTenant(tenant, optionalClient = null) {
    if (!this.pgPool) return;
    try {
      const client = optionalClient || await this.pgPool.connect();
      try {
        await client.query(`
          INSERT INTO tenants (id, slug, name, owner_phone, category, subscription_plan, subscription_until, whatsapp_connected_phone, owner_email, is_accepting_patients, data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            owner_phone = EXCLUDED.owner_phone,
            category = EXCLUDED.category,
            subscription_plan = EXCLUDED.subscription_plan,
            subscription_until = EXCLUDED.subscription_until,
            whatsapp_connected_phone = EXCLUDED.whatsapp_connected_phone,
            owner_email = EXCLUDED.owner_email,
            is_accepting_patients = EXCLUDED.is_accepting_patients,
            data = EXCLUDED.data,
            updated_at = NOW()
        `, [
          tenant.id,
          tenant.slug,
          tenant.name,
          tenant.owner_phone,
          tenant.category,
          tenant.subscription_plan,
          tenant.subscription_until ? new Date(tenant.subscription_until) : null,
          tenant.whatsapp_connected_phone,
          tenant.owner_email,
          tenant.is_accepting_patients !== false,
          JSON.stringify(tenant)
        ]);
      } finally {
        if (!optionalClient) client.release();
      }
    } catch (e) {
      console.warn(`[DatabaseEngine] PostgreSQL upsert tenant error (${tenant.id}):`, e.message);
    }
  }

  async pgDeleteTenant(tenantId) {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query('DELETE FROM services WHERE tenant_id = $1', [tenantId]);
        await client.query('DELETE FROM appointments WHERE tenant_id = $1', [tenantId]);
        await client.query('DELETE FROM subscription_invoices WHERE tenant_id = $1', [tenantId]);
        await client.query('DELETE FROM tenants WHERE id = $1 OR slug = $1', [tenantId]);
      } finally {
        client.release();
      }
    } catch (e) {
      console.warn(`[DatabaseEngine] PostgreSQL delete tenant error:`, e.message);
    }
  }

  async pgUpsertService(service, optionalClient = null) {
    if (!this.pgPool) return;
    try {
      const client = optionalClient || await this.pgPool.connect();
      try {
        await client.query(`
          INSERT INTO services (id, tenant_id, name, duration_minutes, price, is_active, data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            duration_minutes = EXCLUDED.duration_minutes,
            price = EXCLUDED.price,
            is_active = EXCLUDED.is_active,
            data = EXCLUDED.data,
            updated_at = NOW()
        `, [
          service.id,
          service.tenant_id,
          service.name,
          service.duration_minutes,
          service.price,
          service.is_active !== false,
          JSON.stringify(service)
        ]);
      } finally {
        if (!optionalClient) client.release();
      }
    } catch (e) {
      console.warn(`[DatabaseEngine] PostgreSQL upsert service error:`, e.message);
    }
  }

  async pgDeleteService(serviceId) {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query('DELETE FROM services WHERE id = $1', [serviceId]);
      } finally {
        client.release();
      }
    } catch (e) {}
  }

  async pgUpsertAppointment(apt, optionalClient = null) {
    if (!this.pgPool) return;
    try {
      const client = optionalClient || await this.pgPool.connect();
      try {
        await client.query(`
          INSERT INTO appointments (id, tenant_id, service_id, customer_phone, customer_name, status, start_time, end_time, data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            data = EXCLUDED.data,
            updated_at = NOW()
        `, [
          apt.id,
          apt.tenant_id,
          apt.service_id,
          apt.customer_phone,
          apt.customer_name,
          apt.status,
          apt.start_time ? new Date(apt.start_time) : null,
          apt.end_time ? new Date(apt.end_time) : null,
          JSON.stringify(apt)
        ]);
      } finally {
        if (!optionalClient) client.release();
      }
    } catch (e) {
      console.warn(`[DatabaseEngine] PostgreSQL upsert appointment error:`, e.message);
    }
  }

  async pgDeleteAppointment(aptId) {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query('DELETE FROM appointments WHERE id = $1', [aptId]);
      } finally {
        client.release();
      }
    } catch (e) {}
  }

  async pgUpsertInvoice(inv, optionalClient = null) {
    if (!this.pgPool) return;
    try {
      const client = optionalClient || await this.pgPool.connect();
      try {
        await client.query(`
          INSERT INTO subscription_invoices (id, tenant_id, plan_tier, amount, status, data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            data = EXCLUDED.data,
            updated_at = NOW()
        `, [
          inv.id,
          inv.tenant_id,
          inv.plan_tier,
          inv.amount,
          inv.status,
          JSON.stringify(inv)
        ]);
      } finally {
        if (!optionalClient) client.release();
      }
    } catch (e) {
      console.warn(`[DatabaseEngine] PostgreSQL upsert invoice error:`, e.message);
    }
  }

  async pgSaveSnapshot() {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query(`
          INSERT INTO app_kv_store (key, data, updated_at)
          VALUES ('full_backup_snapshot', $1, NOW())
          ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW()
        `, [JSON.stringify({
          tenants: Array.from(this.tenants.entries()),
          services: Array.from(this.services.entries()),
          appointments: Array.from(this.appointments.entries()),
          subscriptionInvoices: Array.from(this.subscriptionInvoices.entries())
        })]);
      } finally {
        client.release();
      }
    } catch (e) {}
  }

  saveToFile() {
    if (!this.storagePath) return;
    try {
      const data = {
        version: '1.0.0',
        saved_at: new Date().toISOString(),
        tenants: Array.from(this.tenants.entries()),
        services: Array.from(this.services.entries()),
        appointments: Array.from(this.appointments.entries()),
        subscriptionInvoices: Array.from(this.subscriptionInvoices.entries()),
        idempotencyRecords: Array.from(this.idempotencyRecords.entries()),
        userSessions: Array.from(this.userSessions.entries())
      };

      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const jsonString = JSON.stringify(data, null, 2);

      // 1. Direct write to primary storage file
      fs.writeFileSync(this.storagePath, jsonString, 'utf8');

      // 2. Synchronous backup write (.bak) to protect against accidental loss or truncation
      try {
        const bakPath = `${this.storagePath}.bak`;
        fs.writeFileSync(bakPath, jsonString, 'utf8');
      } catch (bakErr) {
        // non-fatal for backup
      }
    } catch (err) {
      console.error('[DatabaseEngine] FATAL: Error persisting database to primary disk:', err.message);
      // Emergency fallback write to project root if primary path had permission/volume errors
      try {
        const fallbackPath = path.join(process.cwd(), 'data/app_database.json');
        const fallbackDir = path.dirname(fallbackPath);
        if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
        fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
        console.warn(`[DatabaseEngine] Emergency backup successfully written to ${fallbackPath}`);
      } catch (emergencyErr) {
        console.error('[DatabaseEngine] Emergency database backup write failed:', emergencyErr.message);
      }
    }
    this.pgSaveSnapshot();
  }

  save() {
    this.saveToFile();
  }

  parseToMap(input) {
    if (!input) return new Map();
    if (input instanceof Map) return input;
    if (Array.isArray(input)) {
      if (input.length > 0 && Array.isArray(input[0]) && input[0].length === 2) {
        return new Map(input);
      }
      const map = new Map();
      for (const item of input) {
        if (item && item.id) {
          map.set(item.id, item);
        } else if (Array.isArray(item) && item.length === 2) {
          map.set(item[0], item[1]);
        }
      }
      return map;
    }
    if (typeof input === 'object') {
      return new Map(Object.entries(input));
    }
    return new Map();
  }

  loadFromFile() {
    if (!this.storagePath) return;

    const candidatePaths = [
      this.storagePath,
      `${this.storagePath}.bak`,
      `${this.storagePath}.tmp`,
      path.join(process.cwd(), 'data/app_database.json'),
      path.join(process.cwd(), 'app_database_fallback.json')
    ];

    let foundValid = false;

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          if (raw && raw.trim().length > 0) {
            const data = JSON.parse(raw);
            if (data && (Array.isArray(data.tenants) || typeof data === 'object')) {
              this.tenants = this.parseToMap(data.tenants);
              this.services = this.parseToMap(data.services);
              this.appointments = this.parseToMap(data.appointments);
              this.subscriptionInvoices = this.parseToMap(data.subscriptionInvoices);
              this.idempotencyRecords = this.parseToMap(data.idempotencyRecords);
              this.userSessions = this.parseToMap(data.userSessions);
              foundValid = true;
              console.log(`[DatabaseEngine] Berhasil memuat basis data dari: ${p} (Total ${this.tenants.size} tenant)`);
              break;
            }
          }
        } catch (e) {
          console.warn(`[DatabaseEngine] Candidate database file ${p} could not be parsed:`, e.message);
        }
      }
    }

    if (!foundValid) {
      const primaryExists = fs.existsSync(this.storagePath);
      if (!primaryExists) {
        if (process.env.NODE_ENV === 'test') {
          this.seedSampleData();
        }
        this.saveToFile();
      } else {
        console.error(`[DatabaseEngine] PERINGATAN: Berkas basis data ${this.storagePath} ada namun gagal dimuat. Menolak penimpaan berkas kosong untuk melindungi data disk!`);
      }
    }
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

  save() {
    return this.saveToFile();
  }

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

  getTenantByPhone(phone) {
    if (!phone) return null;
    const clean = this.normalizePhone(phone);
    const cleanDigits = phone.toString().split('@')[0].split(':')[0].replace(/\D/g, '');
    for (const tenant of this.tenants.values()) {
      const cleanOwner = this.normalizePhone(tenant.owner_phone);
      const cleanBot = tenant.whatsapp_connected_phone ? this.normalizePhone(tenant.whatsapp_connected_phone) : null;
      const cleanDoctorLid = tenant.doctor_lid ? tenant.doctor_lid.toString().replace(/\D/g, '') : null;
      const extraPhones = Array.isArray(tenant.whitelist_phones)
        ? tenant.whitelist_phones.map(p => this.normalizePhone(p))
        : (tenant.whitelist_phones ? tenant.whitelist_phones.split(',').map(p => this.normalizePhone(p)) : []);

      const matchesPhone = clean && (cleanOwner === clean || cleanBot === clean || extraPhones.includes(clean));
      const matchesLid = cleanDigits && (cleanDoctorLid === cleanDigits || extraPhones.includes(cleanDigits) || (tenant.owner_phone && tenant.owner_phone.replace(/\D/g, '') === cleanDigits));

      if (matchesPhone || matchesLid) {
        return tenant;
      }
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
    this.saveToFile();
    this.pgUpsertTenant(tenant);
    return tenant;
  }

  deleteTenant(tenantId) {
    let tenant = this.tenants.get(tenantId);
    if (!tenant) {
      tenant = this.getTenantBySlug(tenantId);
    }
    if (!tenant) {
      for (const t of this.tenants.values()) {
        if (t.id === tenantId || t.slug === tenantId) {
          tenant = t;
          break;
        }
      }
    }
    if (!tenant) return false;

    const actualId = tenant.id;
    const actualSlug = tenant.slug;

    // ON DELETE CASCADE: Delete related services
    for (const [sId, service] of this.services.entries()) {
      if (service.tenant_id === actualId || service.tenant_id === actualSlug) {
        this.services.delete(sId);
      }
    }

    // ON DELETE CASCADE: Delete related appointments
    for (const [aId, appt] of this.appointments.entries()) {
      if (appt.tenant_id === actualId || appt.tenant_id === actualSlug) {
        this.appointments.delete(aId);
      }
    }

    // ON DELETE CASCADE: Delete related invoices
    for (const [iId, inv] of this.subscriptionInvoices.entries()) {
      if (inv.tenant_id === actualId || inv.tenant_id === actualSlug) {
        this.subscriptionInvoices.delete(iId);
      }
    }

    this.tenants.delete(actualId);
    this.saveToFile();
    this.pgDeleteTenant(actualId);
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
    this.saveToFile();
    this.pgUpsertService(service);
    return service;
  }

  updateService(serviceId, data) {
    const service = this.services.get(serviceId);
    if (!service) return null;

    if (data.name !== undefined) service.name = data.name.trim();
    if (data.duration_minutes !== undefined) service.duration_minutes = Number(data.duration_minutes);
    if (data.price !== undefined) service.price = Number(data.price);
    if (data.is_active !== undefined) service.is_active = Boolean(data.is_active);
    service.updated_at = new Date().toISOString();

    this.services.set(serviceId, service);
    this.saveToFile();
    this.pgUpsertService(service);
    return service;
  }

  deleteService(serviceId) {
    if (!this.services.has(serviceId)) return false;
    this.services.delete(serviceId);
    this.saveToFile();
    this.pgDeleteService(serviceId);
    return true;
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
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.appointments.set(id, apt);
    this.saveToFile();
    this.pgUpsertAppointment(apt);
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
    this.saveToFile();
    this.pgUpsertInvoice(invoice);
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
    this.saveToFile();
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
    this.saveToFile();
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
      FREE: 25,
      STARTER: 100,
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
        const isMatch = (a.tenant_id === tenant.id || a.tenant_id === tenant.slug);
        if (isMatch && a.status !== 'CANCELLED') {
          const dateStr = a.created_at || a.start_time || a.scheduled_time;
          let inCurrentMonth = false;
          if (dateStr) {
            const aDate = new Date(dateStr);
            if (!isNaN(aDate.getTime())) {
              inCurrentMonth = (aDate.getUTCFullYear() === curYear && aDate.getUTCMonth() === curMonth) ||
                               (Math.abs(now.getTime() - aDate.getTime()) <= 31 * 24 * 60 * 60 * 1000);
            }
          } else {
            inCurrentMonth = true;
          }
          if (inCurrentMonth) {
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

// Lazy singleton export
let _defaultDbInstance = null;
module.exports = {
  get db() {
    if (!_defaultDbInstance) _defaultDbInstance = new DatabaseEngine();
    return _defaultDbInstance;
  },
  DatabaseEngine
};
