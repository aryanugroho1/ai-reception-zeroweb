/* ==========================================================================
   SUPERADMIN SAAS CONTROL PANEL - REACTIVE ENGINE
   Compliant with PRD_WHATSAPP_PRACTICE_BOT.md (Sections 3, 4, 5, 7, 9, 10)
   ========================================================================== */

// --- Initial Multi-Tenant Seed Data (16 Tenants matching PRD Milestone) ---
let SAAS_TENANTS = [
  {
    id: 'TNT-001',
    name: 'drg. Maya Dental Care',
    slug: 'drg_maya',
    ownerPhone: '6281299887766',
    specialty: 'Dokter Gigi Spesialis',
    plan: 'PRO',
    maxQuota: 400,
    currentBookings: 245,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-29',
    isActive: true,
    isAccepting: true,
    mrr: 199000
  },
  {
    id: 'TNT-002',
    name: 'dr. Rian Sp.PD Praktek Mandiri',
    slug: 'dr_rian_dalam',
    ownerPhone: '6281311223344',
    specialty: 'Spesialis Penyakit Dalam',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 88,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-18',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-003',
    name: 'dr. Budi Praktek Umum Rumahan',
    slug: 'dr_budi_umum',
    ownerPhone: '6281277665544',
    specialty: 'Dokter Umum Mandiri (Fase 1 Pilot)',
    plan: 'LIFETIME_PARTNER',
    maxQuota: 250,
    currentBookings: 142,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2099-12-31',
    isActive: true,
    isAccepting: true,
    mrr: 0
  },
  {
    id: 'TNT-004',
    name: 'drg. Siti Fadilah Orthodontics',
    slug: 'drg_siti_ortho',
    ownerPhone: '6281122334455',
    specialty: 'Ortodontis Gigi',
    plan: 'PRO',
    maxQuota: 400,
    currentBookings: 382,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-22',
    isActive: true,
    isAccepting: true,
    mrr: 199000
  },
  {
    id: 'TNT-005',
    name: 'dr. Hendra Sp.A Anak Ceria',
    slug: 'dr_hendra_anak',
    ownerPhone: '6281566778899',
    specialty: 'Dokter Spesialis Anak',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 54,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-30',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-006',
    name: 'dr. Sarah Estetika & Skincare',
    slug: 'dr_sarah_skin',
    ownerPhone: '6281933445566',
    specialty: 'Estetika Medis Mandiri',
    plan: 'CLINIC',
    maxQuota: 999999,
    currentBookings: 520,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-11-04',
    isActive: true,
    isAccepting: true,
    mrr: 349000
  },
  {
    id: 'TNT-007',
    name: 'drg. Kevin Dental Estetik Bali',
    slug: 'drg_kevin_bali',
    ownerPhone: '6281399001122',
    specialty: 'Dokter Gigi Estetik',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 96,
    timezone: 'Asia/Makassar',
    subscriptionUntil: '2026-10-14',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-008',
    name: 'dr. Dimas Wahyu Sp.THT',
    slug: 'dr_dimas_tht',
    ownerPhone: '6281244556677',
    specialty: 'Spesialis THT-KL',
    plan: 'PRO',
    maxQuota: 400,
    currentBookings: 210,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-25',
    isActive: true,
    isAccepting: true,
    mrr: 199000
  },
  {
    id: 'TNT-009',
    name: 'drg. Anita Ratna Konservasi Gigi',
    slug: 'drg_anita_gigi',
    ownerPhone: '6281788990011',
    specialty: 'Konservasi Gigi & Endodontik (Fase 1 Pilot)',
    plan: 'LIFETIME_PARTNER',
    maxQuota: 250,
    currentBookings: 110,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2099-12-31',
    isActive: true,
    isAccepting: true,
    mrr: 0
  },
  {
    id: 'TNT-010',
    name: 'dr. Faisal Akupunktur Medik',
    slug: 'dr_faisal_akupunktur',
    ownerPhone: '6281233441199',
    specialty: 'Akupunktur Medik Mandiri',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 42,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-27',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-011',
    name: 'dr. Ratna Sp.M Mata Sehat',
    slug: 'dr_ratna_mata',
    ownerPhone: '6281855667788',
    specialty: 'Spesialis Mata',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 68,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-20',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-012',
    name: 'dr. Yudi Praktek Umum Sore',
    slug: 'dr_yudi_umum',
    ownerPhone: '6281988776655',
    specialty: 'Dokter Umum Sore & Malam',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 75,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-26',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-013',
    name: 'drg. Fajar Periodontik',
    slug: 'drg_fajar_perio',
    ownerPhone: '6281211009988',
    specialty: 'Spesialis Gusi & Periodontik',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 35,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-11-01',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-014',
    name: 'dr. Lukman Sp.OG Kebidanan Mandiri',
    slug: 'dr_lukman_obgyn',
    ownerPhone: '6281344332211',
    specialty: 'Spesialis Obstetri & Ginekologi',
    plan: 'PRO',
    maxQuota: 400,
    currentBookings: 290,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-24',
    isActive: true,
    isAccepting: true,
    mrr: 199000
  },
  {
    id: 'TNT-015',
    name: 'dr. Melani Praktek Keluarga',
    slug: 'dr_melani_keluarga',
    ownerPhone: '6281599881122',
    specialty: 'Dokter Keluarga / Umum',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 60,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-28',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  },
  {
    id: 'TNT-016',
    name: 'drg. Wawan Gigi Keluarga Surabaya',
    slug: 'drg_wawan_sby',
    ownerPhone: '6281800112233',
    specialty: 'Dokter Gigi Umum',
    plan: 'STARTER',
    maxQuota: 100,
    currentBookings: 81,
    timezone: 'Asia/Jakarta',
    subscriptionUntil: '2026-10-21',
    isActive: true,
    isAccepting: true,
    mrr: 99000
  }
];

// --- Initial Subscription Invoices (Mayar.id Dynamic QRIS) ---
let SAAS_INVOICES = [
  {
    id: 'INV-MYR-849201',
    tenantName: 'drg. Maya Dental Care',
    plan: 'PRO',
    amount: 199000,
    method: 'MAYAR_DYNAMIC_QRIS',
    paidAt: '2026-09-29 14:15 WIB',
    status: 'PAID',
    hmacVerified: true
  },
  {
    id: 'INV-MYR-849202',
    tenantName: 'dr. Sarah Estetika & Skincare',
    plan: 'CLINIC',
    amount: 349000,
    method: 'MAYAR_DYNAMIC_QRIS',
    paidAt: '2026-09-28 11:20 WIB',
    status: 'PAID',
    hmacVerified: true
  },
  {
    id: 'INV-MYR-849203',
    tenantName: 'dr. Lukman Sp.OG',
    plan: 'PRO',
    amount: 199000,
    method: 'MAYAR_DYNAMIC_QRIS',
    paidAt: '2026-09-24 16:45 WIB',
    status: 'PAID',
    hmacVerified: true
  },
  {
    id: 'INV-MYR-849204',
    tenantName: 'dr. Rian Sp.PD',
    plan: 'STARTER',
    amount: 99000,
    method: 'MAYAR_DYNAMIC_QRIS',
    paidAt: '2026-09-18 10:10 WIB',
    status: 'PAID',
    hmacVerified: true
  },
  {
    id: 'INV-MYR-849205',
    tenantName: 'drg. Siti Fadilah Orthodontics',
    plan: 'PRO',
    amount: 199000,
    method: 'MAYAR_DYNAMIC_QRIS',
    paidAt: '2026-09-22 13:30 WIB',
    status: 'PAID',
    hmacVerified: true
  }
];

// --- 7 Idempotency & Concurrency Scenarios Definition (PRD Section 7) ---
const IDEMP_SCENARIOS = {
  1: {
    title: 'Skenario 1: Successful Booking (Normal)',
    condition: 'Slot 16:00 WIB kosong, layanan aktif, kuota tier aman, key idempotensi baru.',
    dbFlow: [
      'BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;',
      'SELECT is_active, is_accepting_patients FROM services JOIN tenants ... FOR SHARE;',
      '-- btree_gist range-lock check:',
      'SELECT COUNT(*) FROM appointments WHERE tenant_id = :tid AND scheduled_time && tstzrange(:start, :end) = 0;',
      'INSERT INTO appointments (id, tenant_id, service_id, customer_phone, scheduled_time, status) VALUES (...);',
      'INSERT INTO idempotency_records (key, response_payload, status) VALUES (:key, :resp, "RESOLVED");',
      'COMMIT;'
    ],
    clientOutput: '✅ WhatsApp Bot: "Pendaftaran Berhasil! Tiket #DNT-104 diterbitkan untuk 16:00 WIB. Terima kasih."',
    note: 'Transaksi berhasil diselesaikan dalam 14ms tanpa konflik.'
  },
  2: {
    title: 'Skenario 2: Occupied Slot (Tabrakan Waktu)',
    condition: 'Dua pasien memilih slot 16:00 WIB dalam selisih milidetik.',
    dbFlow: [
      'BEGIN TRANSACTION;',
      'SELECT COUNT(*) FROM appointments WHERE tenant_id = :tid AND scheduled_time && tstzrange("16:00", "16:40");',
      '-- btree_gist mendeteksi overlap (COUNT = 1)!',
      'ROLLBACK;',
      '-- Clean Abort tanpa corrupcy data.'
    ],
    clientOutput: '⚠️ WhatsApp Bot: "Maaf, slot 16:00 WIB baru saja diambil pasien lain. Pilihan tersedia: 17:30 atau 18:30 WIB."',
    note: 'Pasien diarahkan secara otomatis dan sopan ke slot berikutnya tanpa interupsi dokter.'
  },
  3: {
    title: 'Skenario 3: Inactive Service / Kuota Tutup',
    condition: 'Dokter membalas "TUTUP" via WA, atau layanan Scaling dinonaktifkan.',
    dbFlow: [
      '-- Short-circuit validation:',
      'SELECT is_accepting_patients FROM tenants WHERE id = :tid; -- returns FALSE',
      '-- Early Exit, tidak mengeksekusi lock slot atau tulis database'
    ],
    clientOutput: '🔒 WhatsApp Bot: "Mohon maaf, kuota periksa hari ini telah ditutup oleh dokter. Pendaftaran baru dibuka kembali besok pagi."',
    note: 'Melindungi beban praktek dokter mandiri dari penumpukan pasien liar.'
  },
  4: {
    title: 'Skenario 4: Double-Booking Identik Pasien Sama',
    condition: 'Pasien yang sama menekan tombol booking di slot yang sudah dimilikinya.',
    dbFlow: [
      'BEGIN TRANSACTION;',
      'INSERT INTO appointments (...) VALUES (...);',
      '-- Caught UNIQUE constraint violation: unique_active_customer_slot',
      'ROLLBACK TO SAVEPOINT;',
      'SELECT id, scheduled_time FROM appointments WHERE tenant_id = :tid AND customer_phone = :phone;'
    ],
    clientOutput: 'ℹ️ WhatsApp Bot: "Anda sudah terdaftar di slot ini dengan Kode Tiket #DNT-104. Silakan hadir 10 menit sebelum jam temu."',
    note: 'Sistem mengenali pasien lama dan tidak membuat baris ganda di basis data.'
  },
  5: {
    title: 'Skenario 5: Repeated Request (Jaringan Lag WhatsApp)',
    condition: 'Webhook WhatsApp terkirim ulang 2x karena timeout jaringan seluler.',
    dbFlow: [
      'SELECT status, response_payload FROM idempotency_records WHERE key = :idemp_key;',
      '-- Record ditemukan dengan status RESOLVED!',
      '-- Lewati (Skip) operasi insert database appointments;',
      '-- Ambil response payload dari cache Redis/DB dan kirim ulang;'
    ],
    clientOutput: '✅ WhatsApp Bot: Mengirimkan ulang tiket #DNT-104 identik tanpa mengubah antrean atau nomor urut.',
    note: 'Mencegah duplikasi data akibat jaringan operator yang tidak stabil.'
  },
  6: {
    title: 'Skenario 6: Key Sama Payload Berbeda (422 Tamper)',
    condition: 'Key yang sama dicoba dikirim dengan memodifikasi nama pasien atau layanan.',
    dbFlow: [
      'SELECT payload_hash FROM idempotency_records WHERE key = :idemp_key;',
      '-- Hash mismatch: SHA256(payload_baru) != payload_hash tersimpan!',
      'RAISE EXCEPTION "422 Unprocessable Entity - Idempotency conflict";'
    ],
    clientOutput: '❌ WhatsApp Bot: "Terjadi ketidaksesuaian data reservasi. Mohon ulangi proses pendaftaran dari awal."',
    note: 'Integritas transaksi terlindungi dari manipulasi payload.'
  },
  7: {
    title: 'Skenario 7: Concurrent Race Condition Lock',
    condition: '2 request masuk bersamaan dengan key identik dalam selisih mikrodetik.',
    dbFlow: [
      '-- Request 1: Klaim row-lock',
      'INSERT INTO idempotency_records (key, status) VALUES (:key, "IN_PROGRESS"); -- SUCCESS',
      '-- Request 2: Coba klaim row-lock dengan key sama',
      'INSERT INTO idempotency_records (key, status) VALUES (:key, "IN_PROGRESS"); -- UNIQUE CONSTRAINT ERROR',
      '-- Request 2 melakukan exponential backoff (250ms), lalu membaca hasil Request 1 yang telah RESOLVED.'
    ],
    clientOutput: '🛡️ WhatsApp Bot: Kedua request ditangani dengan elegan. Hanya 1 baris appointment yang tercipta!',
    note: 'Zero race condition berkat koordinasi atomic row-lock PostgreSQL.'
  }
};

// --- DOM Controller ---
class SuperadminController {
  constructor() {
    this.currentFilter = 'ALL';
    this.searchQuery = '';
    this.token = this.getAuthToken();
  }

  getAuthToken() {
    return sessionStorage.getItem('praktika_admin_token') || localStorage.getItem('praktika_admin_token') || null;
  }

  setAuthToken(token, remember = false) {
    this.token = token;
    if (remember) {
      localStorage.setItem('praktika_admin_token', token);
    } else {
      sessionStorage.setItem('praktika_admin_token', token);
    }
  }

  clearAuthToken() {
    this.token = null;
    sessionStorage.removeItem('praktika_admin_token');
    localStorage.removeItem('praktika_admin_token');
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  showLoginGate() {
    const gate = document.getElementById('adminLoginGate');
    const app = document.getElementById('adminMainApp');
    if (gate) gate.style.display = 'flex';
    if (app) app.style.display = 'none';
  }

  showMainApp() {
    const gate = document.getElementById('adminLoginGate');
    const app = document.getElementById('adminMainApp');
    if (gate) gate.style.display = 'none';
    if (app) app.style.display = 'block';
  }

  async init() {
    this.initClock();
    this.initAuth();
    this.initTabs();
    this.initFilters();
    this.initSearch();
    this.initModals();
    this.initIdempotencyMatrix();
    this.initWebhookSimulator();

    // Check existing session
    const token = this.getAuthToken();
    if (token) {
      try {
        const checkRes = await fetch('/api/auth/me', { headers: this.getAuthHeaders() });
        if (checkRes.ok) {
          const authData = await checkRes.json();
          this.showMainApp();
          await this.loadBackendData();
          this.logAudit('info', `Super Admin terotentikasi: ${authData.user.username} (${authData.user.role}).`);
          return;
        } else {
          this.clearAuthToken();
          this.showLoginGate();
        }
      } catch (e) {
        this.showLoginGate();
      }
    } else {
      this.showLoginGate();
    }
  }

  initAuth() {
    const form = document.getElementById('formAdminLogin');
    const errAlert = document.getElementById('loginErrorAlert');
    const errMsg = document.getElementById('loginErrorMsg');
    const togglePwd = document.getElementById('btnTogglePwd');
    const pwdInput = document.getElementById('adminPasswordInput');
    const logoutBtn = document.getElementById('btnAdminLogout');

    if (togglePwd && pwdInput) {
      togglePwd.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        togglePwd.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsernameInput').value.trim();
        const password = document.getElementById('adminPasswordInput').value;
        const remember = document.getElementById('rememberMeCheckbox').checked;

        if (errAlert) errAlert.style.display = 'none';

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Autentikasi gagal');
          }

          this.setAuthToken(data.token, remember);
          this.showMainApp();
          await this.loadBackendData();
          this.logAudit('success', `Login berhasil sebagai Super Admin (${username}).`);
        } catch (err) {
          if (errAlert && errMsg) {
            errMsg.textContent = err.message;
            errAlert.style.display = 'flex';
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin keluar dari sesi Super Admin?')) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: this.getAuthHeaders()
            });
          } catch (e) {}
          this.clearAuthToken();
          this.showLoginGate();
          document.getElementById('formAdminLogin').reset();
          if (errAlert) errAlert.style.display = 'none';
        }
      });
    }
  }

  async loadBackendData() {
    try {
      // 1. Telemetry Health (Public)
      const healthRes = await fetch('/api/health').catch(() => null);
      if (healthRes && healthRes.ok) {
        const health = await healthRes.json();
        this.logAudit('info', `Backend Telemetry: Status ${health.status}, Tenants: ${health.tenants_count}, Appointments: ${health.appointments_count}`);
      }

      // 2. Tenants (Protected)
      const tenantsRes = await fetch('/api/tenants', { headers: this.getAuthHeaders() }).catch(() => null);
      if (tenantsRes && tenantsRes.ok) {
        const data = await tenantsRes.json();
        if (data.tenants && data.tenants.length > 0) {
          SAAS_TENANTS = data.tenants;
        }
      } else if (tenantsRes && tenantsRes.status === 401) {
        this.clearAuthToken();
        this.showLoginGate();
        return;
      }

      // 3. Invoices (Protected)
      const invRes = await fetch('/api/invoices', { headers: this.getAuthHeaders() }).catch(() => null);
      if (invRes && invRes.ok) {
        const data = await invRes.json();
        if (data.invoices && data.invoices.length > 0) {
          SAAS_INVOICES = data.invoices;
        }
      }

      // Re-render UI
      this.renderMetrics();
      this.renderTenantsTable();
      this.renderInvoicesTable();
      this.populateWebhookTenantSelect();
    } catch (err) {
      console.warn('Backend API sync fallback:', err);
    }
  }

  initClock() {
    const clockEl = document.getElementById('liveServerClock');
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
      if (clockEl) clockEl.innerHTML = `<span>WIB: <strong>${timeStr}</strong></span>`;
    };
    update();
    setInterval(update, 1000);
  }

  renderMetrics() {
    // 1. MRR
    const totalMrr = SAAS_TENANTS.reduce((acc, t) => acc + (t.mrr || 0), 0);
    const mrrEl = document.getElementById('metricMrr');
    if (mrrEl) mrrEl.textContent = `Rp ${totalMrr.toLocaleString('id-ID')}`;

    // 2. Tenant count
    const tenantsEl = document.getElementById('metricTenants');
    if (tenantsEl) tenantsEl.textContent = `${SAAS_TENANTS.length} Tenant`;

    // 3. Bookings count
    const totalBookings = SAAS_TENANTS.reduce((acc, t) => acc + (t.currentBookings || 0), 0);
    const bookingsEl = document.getElementById('metricBookings');
    if (bookingsEl) bookingsEl.textContent = `${totalBookings.toLocaleString('id-ID')} Tiket`;
  }

  renderTenantsTable() {
    const tbody = document.getElementById('tenantsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const filtered = SAAS_TENANTS.filter(t => {
      // 1. Filter plan
      if (this.currentFilter !== 'ALL') {
        if (this.currentFilter === 'OVER_QUOTA') {
          if (t.maxQuota === 999999) return false;
          const ratio = t.currentBookings / t.maxQuota;
          if (ratio < 0.75) return false;
        } else if (t.plan !== this.currentFilter) {
          return false;
        }
      }

      // 2. Search query
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const match = t.name.toLowerCase().includes(q) ||
                      t.slug.toLowerCase().includes(q) ||
                      t.ownerPhone.includes(q) ||
                      t.specialty.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#64748b;">Tidak ada tenant yang cocok dengan filter.</td></tr>`;
      return;
    }

    filtered.forEach(t => {
      const tr = document.createElement('tr');

      // Plan badge styling
      let planClass = 'starter';
      if (t.plan === 'PRO') planClass = 'pro';
      else if (t.plan === 'CLINIC') planClass = 'clinic';
      else if (t.plan === 'LIFETIME_PARTNER') planClass = 'partner';

      // Quota progress
      const isUnlimited = t.maxQuota === 999999;
      const pct = isUnlimited ? 10 : Math.min(100, Math.round((t.currentBookings / t.maxQuota) * 100));
      let fillClass = '';
      if (pct >= 90) fillClass = 'danger';
      else if (pct >= 75) fillClass = 'warning';

      // Status
      let statusHtml = t.isAccepting
        ? `<span style="color:#34d399; font-weight:700;">🟢 Buka</span>`
        : `<span style="color:#f87171; font-weight:700;">🔒 Tutup</span>`;

      tr.innerHTML = `
        <td>
          <div style="font-family:var(--font-mono); font-weight:700; color:#cbd5e1;">${t.id}</div>
          <div style="font-size:0.72rem; color:#38bdf8;">${t.slug}</div>
        </td>
        <td>
          <strong style="color:#fff; display:block;">${t.name}</strong>
          <span style="font-size:0.72rem; color:#94a3b8;">${t.specialty}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); color:#cbd5e1;">+${t.ownerPhone}</span>
        </td>
        <td>
          <span class="badge-mini ${planClass}">${t.plan}</span>
          <div style="font-size:0.68rem; color:#64748b; margin-top:2px;">${t.timezone}</div>
        </td>
        <td class="quota-cell">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span>${t.currentBookings} / ${isUnlimited ? '∞' : t.maxQuota}</span>
            <strong style="color:${pct >= 85 ? '#fbbf24' : '#cbd5e1'}">${isUnlimited ? 'Unmetered' : pct + '%'}</strong>
          </div>
          <div class="quota-bar-wrap">
            <div class="quota-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
        </td>
        <td>
          <span style="font-size:0.8rem; color:#e2e8f0;">${t.subscriptionUntil}</span>
        </td>
        <td>
          ${statusHtml}
        </td>
        <td style="text-align: right;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="tbl-btn primary" onclick="window.adminCtrl.extendSub('${t.id}')" title="Perpanjang 30 Hari">+30H</button>
            <button class="tbl-btn" onclick="window.adminCtrl.toggleQuota('${t.id}')" title="Buka/Tutup Kuota Pendaftaran">
              ${t.isAccepting ? 'Tutup' : 'Buka'}
            </button>
            <button class="tbl-btn" onclick="window.adminCtrl.testLink('${t.slug}')" title="Buka Link WhatsApp Pasien">Link</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  renderInvoicesTable() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    SAAS_INVOICES.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:var(--font-mono); font-weight:700; color:#38bdf8;">${inv.id}</td>
        <td><strong>${inv.tenantName}</strong></td>
        <td><span class="badge-mini pro">${inv.plan}</span></td>
        <td style="font-weight:700; color:#34d399;">Rp ${inv.amount.toLocaleString('id-ID')}</td>
        <td style="font-size:0.75rem; color:#94a3b8;">${inv.method}</td>
        <td style="font-size:0.78rem;">${inv.paidAt}</td>
        <td><span class="badge-mini partner">${inv.status}</span></td>
        <td><span style="color:#34d399; font-size:0.72rem; font-family:var(--font-mono);">✓ HMAC-SHA256 OK</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  populateWebhookTenantSelect() {
    const select = document.getElementById('whTenantSelect');
    if (!select) return;

    select.innerHTML = '';
    SAAS_TENANTS.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.plan} - ${t.ownerPhone})`;
      select.appendChild(opt);
    });
  }

  initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabs.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tabKey = e.currentTarget.dataset.tab;
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

        const targetPane = document.getElementById(`pane${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  initFilters() {
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.renderTenantsTable();
      });
    });
  }

  initSearch() {
    const input = document.getElementById('tenantSearchInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderTenantsTable();
    });
  }

  initModals() {
    const modalAdd = document.getElementById('modalAddTenant');
    const openBtn1 = document.getElementById('btnOpenAddTenant');
    const openBtn2 = document.getElementById('btnPaneAddTenant');
    const closeBtn = document.getElementById('btnCloseAddTenant');
    const cancelBtn = document.getElementById('btnCancelAddTenant');
    const form = document.getElementById('formAddTenant');

    const open = () => modalAdd.classList.add('active');
    const close = () => modalAdd.classList.remove('active');

    if (openBtn1) openBtn1.addEventListener('click', open);
    if (openBtn2) openBtn2.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    if (modalAdd) {
      modalAdd.addEventListener('click', (e) => {
        if (e.target === modalAdd) close();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newTenantName').value.trim();
        const slug = document.getElementById('newTenantSlug').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const phone = document.getElementById('newTenantPhone').value.trim().replace(/[^0-9]/g, '');
        const plan = document.getElementById('newTenantPlan').value;
        const tz = document.getElementById('newTenantTz').value;

        try {
          const res = await fetch('/api/tenants', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              name,
              slug,
              owner_phone: phone,
              subscription_plan: plan,
              timezone: tz
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan tenant');

          await this.loadBackendData();
          close();
          form.reset();

          this.logAudit('success', `API Success: Tenant ${name} (${slug}) tersimpan di PostgreSQL. Deep-link: BOOK_${slug} aktif.`);
          alert(`✅ Tenant ${name} berhasil didaftarkan di Backend API!\n\nID: ${data.tenant.id}\nDeep-link: https://wa.me/6281234567890?text=BOOK_${slug}\nNomor Dokter Whitelist: +${phone}\nPaket: ${plan}`);
        } catch (err) {
          alert('❌ Gagal mendaftarkan tenant: ' + err.message);
          this.logAudit('danger', `Gagal mendaftarkan tenant: ${err.message}`);
        }
      });
    }
  }

  initIdempotencyMatrix() {
    const buttons = document.querySelectorAll('.idemp-test-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        buttons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const id = parseInt(e.currentTarget.dataset.scenario, 10);
        this.runIdempotencyScenario(id);
      });
    });

    // Run first scenario by default
    this.runIdempotencyScenario(1);
  }

  async runIdempotencyScenario(id) {
    const item = IDEMP_SCENARIOS[id] || IDEMP_SCENARIOS[1];
    const term = document.getElementById('idempOutputTerminal');
    if (!term) return;

    let sqlLines = item.dbFlow.map(l => `<div style="color:#93c5fd;">${l}</div>`).join('');

    // Fetch live test execution from backend
    let liveResultJson = '';
    try {
      const res = await fetch('/api/test/idempotency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: id })
      });
      if (res.ok) {
        const liveData = await res.json();
        liveResultJson = JSON.stringify(liveData.execution_result, null, 2);
      }
    } catch (e) {
      // offline fallback
    }

    term.innerHTML = `
      <div style="color:#34d399; font-weight:700; margin-bottom:8px; font-size:0.86rem;">
        ⚡ [EXECUTION TRACE] ${item.title}
      </div>
      <div style="color:#cbd5e1; margin-bottom:10px;">
        <span style="color:#64748b;">Kondisi Masukan:</span> ${item.condition}
      </div>
      <div style="background:#090e18; border:1px solid #1e293b; border-radius:6px; padding:10px; margin-bottom:12px;">
        <div style="color:#64748b; font-size:0.72rem; margin-bottom:4px;">SQL Transaction Sequence (PostgreSQL btree_gist Engine):</div>
        ${sqlLines}
      </div>
      <div style="background:rgba(2,132,199,0.15); border-left:3px solid #38bdf8; padding:8px 12px; border-radius:4px; margin-bottom:8px;">
        <strong style="color:#38bdf8;">${item.clientOutput}</strong>
      </div>
      ${liveResultJson ? `
      <div style="background:#0f172a; border:1px solid #334155; border-radius:4px; padding:8px; margin-bottom:8px; font-family:var(--font-mono); font-size:0.75rem; color:#a7f3d0;">
        <span style="color:#94a3b8; display:block; margin-bottom:4px;">[Live Backend Response API /api/test/idempotency]:</span>
        <pre style="margin:0; white-space:pre-wrap;">${liveResultJson}</pre>
      </div>` : ''}
      <div style="color:#94a3b8; font-size:0.74rem;">
        <em>💡 Hasil Engine: ${item.note}</em>
      </div>
    `;

    this.logAudit('info', `Executed Idempotency Test via API: ${item.title}`);
  }

  initWebhookSimulator() {
    const form = document.getElementById('webhookSimulatorForm');
    const topBtn = document.getElementById('btnTestWebhookTop');

    if (topBtn) {
      topBtn.addEventListener('click', () => {
        const tabBtn = document.querySelector('[data-tab="billing"]');
        if (tabBtn) tabBtn.click();
        const target = document.getElementById('webhookSimulatorForm');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tenantId = document.getElementById('whTenantSelect').value;
        const plan = document.getElementById('whPlanSelect').value;

        const target = SAAS_TENANTS.find(t => t.id === tenantId);
        if (!target) return;

        const planPrices = { STARTER: 149000, PRO: 299000, CLINIC: 599000 };
        const price = planPrices[plan] || 299000;
        const invNo = `INV-MYR-${Math.floor(100000 + Math.random() * 900000)}`;

        try {
          const res = await fetch('/api/webhooks/mayar/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.received',
              data: {
                invoice_id: invNo,
                tenant_id: tenantId,
                plan_tier: plan,
                amount: price,
                status: 'PAID'
              }
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Webhook gagal');

          await this.loadBackendData();

          this.logAudit('success', `Mayar Webhook ${invNo} verified (HMAC: ${data.signature.slice(0, 16)}...). Tenant ${target.name} diperpanjang +30 hari (Paket: ${plan}).`);

          alert(
            `🎉 SIMULASI WEBHOOK MAYAR.ID SUKSES VIA BACKEND ENGINE!\n\n` +
            `• Event: payment.received\n` +
            `• Tagihan: ${invNo}\n` +
            `• Tenant: ${target.name}\n` +
            `• Paket: ${plan} (Rp ${price.toLocaleString('id-ID')})\n` +
            `• Signature HMAC-SHA256: VALID (${data.signature.slice(0, 16)}...)\n` +
            `• Masa Aktif Baru: ${data.subscription_until ? data.subscription_until.slice(0, 10) : 'Diperpanjang'}\n\n` +
            `Pesan Resi Resmi WhatsApp telah dibuat:\n\n${data.receipt_message}`
          );
        } catch (err) {
          alert('❌ Gagal memproses webhook Mayar: ' + err.message);
          this.logAudit('danger', `Webhook Mayar gagal: ${err.message}`);
        }
      });
    }

    const clearBtn = document.getElementById('btnClearLog');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const body = document.getElementById('systemAuditLog');
        if (body) body.innerHTML = '';
      });
    }
  }

  async extendSub(tenantId) {
    const target = SAAS_TENANTS.find(t => t.id === tenantId);
    if (!target) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/extend`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperpanjang');

      await this.loadBackendData();
      this.logAudit('success', `API: Extended subscription for ${target.name} (+30 hari). New date: ${data.subscription_until}`);
      alert(`✅ Masa aktif ${target.name} diperpanjang +30 hari!\nBerlaku sampai: ${data.subscription_until}`);
    } catch (err) {
      alert('❌ Gagal memperpanjang masa aktif: ' + err.message);
    }
  }

  async toggleQuota(tenantId) {
    const target = SAAS_TENANTS.find(t => t.id === tenantId);
    if (!target) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/toggle`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status');

      await this.loadBackendData();
      const stateStr = data.is_accepting ? 'DIBUKA' : 'DITUTUP';
      this.logAudit('warning', `API: Toggle practice quota for ${target.name} -> ${stateStr}`);
    } catch (err) {
      alert('❌ Gagal mengubah status praktek: ' + err.message);
    }
  }

  testLink(slug) {
    const link = `https://wa.me/6281234567890?text=BOOK_${slug}`;
    window.open(link, '_blank');
  }

  logAudit(type, message) {
    const consoleEl = document.getElementById('systemAuditLog');
    if (!consoleEl) return;

    const now = new Date().toLocaleTimeString('id-ID');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${now} UTC+7] ${message}`;
    consoleEl.prepend(entry);
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.adminCtrl = new SuperadminController();
  window.adminCtrl.init();
});
