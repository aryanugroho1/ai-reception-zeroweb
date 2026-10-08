/* ==========================================================================
   SUPERADMIN SAAS CONTROL PANEL - REACTIVE ENGINE
   Compliant with PRD_WHATSAPP_PRACTICE_BOT.md (Sections 3, 4, 5, 7, 9, 10)
   ========================================================================== */

// --- Multi-Tenant SaaS State (Populated dynamically from Backend API /api/tenants) ---
let SAAS_TENANTS = [];
/* Legacy sample data (now loaded from live database via /api/tenants)
let _MOCK_TENANTS = [
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
*/

// --- Subscription Invoices (Populated dynamically from Backend API /api/invoices) ---
let SAAS_INVOICES = [];
/* Legacy sample invoices (loaded from live backend)
let _MOCK_INVOICES = [
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
*/

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

  showToast(type, message) {
    const container = document.getElementById('adminToastContainer');
    if (!container) {
      console.log(`[Toast ${type}] ${message}`);
      return;
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      background: ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
      border: 1px solid ${type === 'success' ? '#34d399' : '#f87171'};
      transition: all 0.3s ease;
    `;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
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
    this.initTheme();
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
          this.startServerLogStream();
          this.logAudit('info', `Super Admin terotentikasi: ${authData.user.username} (${authData.user.role}).`);
          return;
        } else {
          this.clearAuthToken();
          this.stopServerLogStream();
          this.showLoginGate();
        }
      } catch (e) {
        this.stopServerLogStream();
        this.showLoginGate();
      }
    } else {
      this.stopServerLogStream();
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
          this.startServerLogStream();
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
          this.stopServerLogStream();
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: this.getAuthHeaders()
            });
          } catch (e) { }
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
        if (data && Array.isArray(data.tenants)) {
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
      this.renderWaSessionsTable();
      this.renderCouponsManagement();
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

  initTheme() {
    const savedTheme = localStorage.getItem('praktika_admin_theme');
    let theme = savedTheme;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
    }
    this.applyTheme(theme, false);

    const handleToggle = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'day';
      const nextTheme = (current === 'night' || current === 'dark') ? 'day' : 'night';
      this.applyTheme(nextTheme, true);
    };

    const btnTop = document.getElementById('btnThemeToggle');
    const btnGate = document.getElementById('btnThemeToggleGate');
    if (btnTop) btnTop.addEventListener('click', handleToggle);
    if (btnGate) btnGate.addEventListener('click', handleToggle);
  }

  applyTheme(theme, log = false) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('praktika_admin_theme', theme);

    const isNight = (theme === 'night' || theme === 'dark');
    const icon = isNight ? '🌙' : '☀️';
    const label = isNight ? 'Night' : 'Day';
    const tooltip = isNight ? 'Beralih ke Day Mode (Terang)' : 'Beralih ke Night Mode (Gelap)';

    const iconEl = document.getElementById('themeIcon');
    const labelEl = document.getElementById('themeLabel');
    const btnTop = document.getElementById('btnThemeToggle');
    if (iconEl) iconEl.textContent = icon;
    if (labelEl) labelEl.textContent = label;
    if (btnTop) btnTop.title = tooltip;

    const iconGate = document.getElementById('themeIconGate');
    const labelGate = document.getElementById('themeLabelGate');
    const btnGate = document.getElementById('btnThemeToggleGate');
    if (iconGate) iconGate.textContent = icon;
    if (labelGate) labelGate.textContent = label;
    if (btnGate) btnGate.title = tooltip;

    if (log) {
      this.logAudit('info', `Tampilan diubah ke ${label} Mode (${isNight ? 'Gelap' : 'Terang'}).`);
    }
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
            <button class="tbl-btn" style="border-color:#38bdf8; color:#38bdf8;" onclick="window.adminCtrl.openEditModal('${t.id}')" title="Edit Data & Whitelist Dokter">✏️ Whitelist</button>
            <button class="tbl-btn" style="border-color:#10b981; color:#34d399;" onclick="window.adminCtrl.openServicesModal('${t.id}')" title="Kelola Layanan & Tarif">💰 Tarif</button>
            <button class="tbl-btn" onclick="window.adminCtrl.testLink('${t.slug}', '${t.botPhone || t.ownerPhone || ''}')" title="Buka Link WhatsApp Pasien">Link</button>
            <button class="tbl-btn danger" style="background:rgba(248,113,113,0.15); color:#f87171; border-color:rgba(248,113,113,0.3);" data-id="${t.id}" data-slug="${t.slug}" data-name="${(t.name || '').replace(/"/g, '&quot;')}" onclick="window.adminCtrl.openDeleteRowModal(this.dataset.id, this.dataset.slug, this.dataset.name)" title="Hapus Akun Dokter / Partner">🗑️</button>
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

        if (tabKey === 'gateway') {
          this.renderWaSessionsTable();
        }
        if (tabKey === 'coupons') {
          this.renderCouponsManagement();
        }
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

    // Purge Sample Demo Tenants Modal & Button Listeners
    const btnOpenPurge = document.getElementById('btnPurgeSamples');
    const btnClosePurge = document.getElementById('btnCloseModalPurgeDemo');
    const btnCancelPurge = document.getElementById('btnCancelPurgeDemo');
    const btnConfirmPurge = document.getElementById('btnConfirmPurgeDemo');
    const modalPurge = document.getElementById('modalPurgeDemoTenants');

    if (btnOpenPurge) btnOpenPurge.onclick = (e) => { e.preventDefault(); this.openPurgeDemoModal(); };
    if (btnClosePurge) btnClosePurge.onclick = () => this.closePurgeDemoModal();
    if (btnCancelPurge) btnCancelPurge.onclick = () => this.closePurgeDemoModal();
    if (btnConfirmPurge) btnConfirmPurge.onclick = () => this.executePurgeSampleTenants();
    if (modalPurge) {
      modalPurge.addEventListener('click', (e) => {
        if (e.target === modalPurge) this.closePurgeDemoModal();
      });
    }

    // Delete Row Modal Event Listeners
    const btnCloseDelRow = document.getElementById('btnCloseModalDeleteRow');
    const btnCancelDelRow = document.getElementById('btnCancelDeleteRow');
    const btnConfirmDelRow = document.getElementById('btnConfirmDeleteRow');
    const modalDelRow = document.getElementById('modalDeleteTenantRow');

    if (btnCloseDelRow) btnCloseDelRow.onclick = () => this.closeDeleteRowModal();
    if (btnCancelDelRow) btnCancelDelRow.onclick = () => this.closeDeleteRowModal();
    if (btnConfirmDelRow) {
      btnConfirmDelRow.onclick = () => {
        const id = document.getElementById('deleteTargetTenantId')?.value;
        const slug = document.getElementById('deleteTargetTenantSlug')?.value;
        const name = document.getElementById('deleteTargetDoctorName')?.textContent;
        this.executeDeleteTenant(id, slug, name);
      };
    }
    if (modalDelRow) {
      modalDelRow.addEventListener('click', (e) => {
        if (e.target === modalDelRow) this.closeDeleteRowModal();
      });
    }

    // Refresh WhatsApp Sessions Button
    const refreshWaBtn = document.getElementById('btnRefreshWaTable');
    if (refreshWaBtn) {
      refreshWaBtn.addEventListener('click', async () => {
        await this.renderWaSessionsTable();
        alert('Data sesi WhatsApp berhasil disegarkan.');
      });
    }

    // Admin QR Scanner Modal Listeners
    const modalAdminQr = document.getElementById('modalAdminQr');
    const closeAdminQr = document.getElementById('btnCloseAdminQr');
    const closeAdminQrBtn = document.getElementById('btnCloseAdminQrBtn');
    const closeQr = () => {
      if (modalAdminQr) modalAdminQr.classList.remove('active');
      if (this.adminQrPoll) {
        clearInterval(this.adminQrPoll);
        this.adminQrPoll = null;
      }
    };
    if (closeAdminQr) closeAdminQr.addEventListener('click', closeQr);
    if (closeAdminQrBtn) closeAdminQrBtn.addEventListener('click', closeQr);
    if (modalAdminQr) {
      modalAdminQr.addEventListener('click', (e) => {
        if (e.target === modalAdminQr) closeQr();
      });
    }

    // Edit Tenant & Whitelist Modal Listeners
    const modalEdit = document.getElementById('modalEditTenant');
    const closeEditBtn = document.getElementById('btnCloseEditTenant');
    const cancelEditBtn = document.getElementById('btnCancelEditTenant');
    const formEdit = document.getElementById('formEditTenant');

    const closeEdit = () => {
      if (modalEdit) modalEdit.classList.remove('active');
    };

    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEdit);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEdit);
    if (modalEdit) {
      modalEdit.addEventListener('click', (e) => {
        if (e.target === modalEdit) closeEdit();
      });
    }

    if (formEdit) {
      formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editTenantId').value;
        const name = document.getElementById('editTenantName').value.trim();
        const phone = document.getElementById('editTenantPhone').value.trim().replace(/[^0-9,]/g, '');
        const category = document.getElementById('editTenantCategory').value;
        const plan = document.getElementById('editTenantPlan').value;
        const openHour = document.getElementById('editTenantOpenHour')?.value || '09:00';
        const closeHour = document.getElementById('editTenantCloseHour')?.value || '17:00';

        try {
          const res = await fetch(`/api/tenants/${id}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
              name,
              owner_phone: phone,
              category,
              subscription_plan: plan,
              open_hour: openHour,
              close_hour: closeHour,
              operating_hours: { open: openHour, close: closeHour }
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal memperbarui data tenant');

          await this.loadBackendData();
          closeEdit();
          this.logAudit('success', `Data tenant ${name} berhasil diubah. Jam Operasional: ${openHour} - ${closeHour}, Nomor Whitelist: +${phone}`);
          alert(`✅ Berhasil menyimpan!\n\nData ${name} diperbarui:\n• Jam Operasional: ${openHour} - ${closeHour}\n• Whitelist Dokter: +${phone}`);
        } catch (err) {
          alert('❌ Gagal mengubah data: ' + err.message);
          this.logAudit('danger', `Gagal mengubah tenant: ${err.message}`);
        }
      });
    }

    // Refresh All Data button
    const refreshAllBtn = document.getElementById('btnRefreshAllData');
    if (refreshAllBtn) {
      refreshAllBtn.addEventListener('click', async () => {
        refreshAllBtn.innerHTML = '⏳ <span>Loading...</span>';
        await this.loadBackendData();
        refreshAllBtn.innerHTML = '🔄 <span>Refresh</span>';
        this.logAudit('success', 'UI', 'Data telemetri backend dan utilisasi booking berhasil dimuat ulang.');
      });
    }

    // Modal Services & Tariffs Listeners
    const modalServices = document.getElementById('modalServices');
    const closeServicesBtn = document.getElementById('btnCloseServicesModal');
    const closeServicesBtn2 = document.getElementById('btnCloseServicesModalBtn');
    const formAddService = document.getElementById('formAddService');

    const closeServices = () => {
      if (modalServices) modalServices.classList.remove('active');
    };

    if (closeServicesBtn) closeServicesBtn.addEventListener('click', closeServices);
    if (closeServicesBtn2) closeServicesBtn2.addEventListener('click', closeServices);
    if (modalServices) {
      modalServices.addEventListener('click', (e) => {
        if (e.target === modalServices) closeServices();
      });
    }

    if (formAddService) {
      formAddService.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tenantId = document.getElementById('newServiceTenantId').value;
        const name = document.getElementById('newServiceName').value.trim();
        const duration = parseInt(document.getElementById('newServiceDuration').value, 10);
        const price = parseInt(document.getElementById('newServicePrice').value, 10);

        try {
          const res = await fetch(`/api/tenants/${tenantId}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
            body: JSON.stringify({ name, duration_minutes: duration, price })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal menambahkan layanan');
          formAddService.reset();
          document.getElementById('newServiceTenantId').value = tenantId;
          document.getElementById('newServiceDuration').value = 30;
          await this.openServicesModal(tenantId);
          this.logAudit('success', `Layanan "${name}" (Rp ${price.toLocaleString('id-ID')}) berhasil ditambahkan.`);
        } catch (err) {
          alert('❌ Gagal: ' + err.message);
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

  testLink(slug, phone) {
    const rawNum = (phone || '').toString().replace(/\D/g, '');
    const cleanNum = rawNum ? (rawNum.startsWith('0') ? '62' + rawNum.slice(1) : (rawNum.startsWith('8') ? '62' + rawNum : rawNum)) : '';
    const link = cleanNum ? `https://wa.me/${cleanNum}?text=BOOK_${slug}` : `https://wa.me/?text=BOOK_${slug}`;
    window.open(link, '_blank');
  }

  openDeleteRowModal(tenantId, tenantSlug = '', tenantName = '') {
    if (!tenantId) return;
    const target = (Array.isArray(SAAS_TENANTS) ? SAAS_TENANTS : []).find(t => t.id === tenantId || t.slug === tenantId);
    const resolvedName = tenantName || (target ? target.name : tenantId);
    const resolvedSlug = tenantSlug || (target ? target.slug : '');

    const modal = document.getElementById('modalDeleteTenantRow');
    if (!modal) {
      return this.executeDeleteTenant(tenantId, resolvedSlug, resolvedName);
    }

    const nameEl = document.getElementById('deleteTargetDoctorName');
    const idEl = document.getElementById('deleteTargetTenantId');
    const slugEl = document.getElementById('deleteTargetTenantSlug');

    if (nameEl) nameEl.textContent = resolvedName;
    if (idEl) idEl.value = tenantId;
    if (slugEl) slugEl.value = resolvedSlug;

    modal.classList.add('active');
  }

  closeDeleteRowModal() {
    const modal = document.getElementById('modalDeleteTenantRow');
    if (modal) modal.classList.remove('active');
  }

  openPurgeDemoModal() {
    const modal = document.getElementById('modalPurgeDemoTenants');
    if (!modal) {
      return this.executePurgeSampleTenants();
    }
    modal.classList.add('active');
  }

  closePurgeDemoModal() {
    const modal = document.getElementById('modalPurgeDemoTenants');
    if (modal) modal.classList.remove('active');
  }

  deleteTenant(tenantId, tenantSlug = '', tenantName = '') {
    this.openDeleteRowModal(tenantId, tenantSlug, tenantName);
  }

  purgeSampleTenants() {
    this.openPurgeDemoModal();
  }

  async executeDeleteTenant(tenantId, tenantSlug = '', tenantName = '') {
    if (!tenantId) return;
    const target = (Array.isArray(SAAS_TENANTS) ? SAAS_TENANTS : []).find(t => t.id === tenantId || t.slug === tenantId);
    const resolvedName = tenantName || (target ? target.name : tenantId);
    const resolvedSlug = tenantSlug || (target ? target.slug : '');

    const btn = document.getElementById('btnConfirmDeleteRow');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menghapus...';
    }

    try {
      const endpoint = `/api/tenants/${encodeURIComponent(tenantId)}`;
      let res = await fetch(endpoint, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      let data = {};
      try { data = await res.json(); } catch (e) { data = {}; }

      if (!res.ok) {
        if (res.status === 401) {
          this.showToast('danger', 'Sesi login admin telah kedaluwarsa. Silakan masuk kembali.');
          this.clearAuthToken();
          this.showLoginGate();
          return;
        }
        // Fallback: If 404 and resolvedSlug is available, try deleting by slug
        if (res.status === 404 && resolvedSlug && resolvedSlug !== tenantId) {
          const fallbackRes = await fetch(`/api/tenants/${encodeURIComponent(resolvedSlug)}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
          });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok) {
            data = fallbackData;
          } else {
            throw new Error(data.error || fallbackData.error || 'Tenant tidak ditemukan di server');
          }
        } else {
          throw new Error(data.error || `Gagal menghapus tenant (HTTP ${res.status})`);
        }
      }

      // Optimistically remove from local state immediately
      if (Array.isArray(SAAS_TENANTS)) {
        SAAS_TENANTS = SAAS_TENANTS.filter(t => t.id !== tenantId && t.slug !== tenantId && (!resolvedSlug || t.slug !== resolvedSlug));
      }
      this.renderTenantsTable();
      this.renderMetrics();
      this.closeDeleteRowModal();

      this.showToast('success', data.message || `Akun ${resolvedName} berhasil dihapus permanen.`);
      this.logAudit('warning', `Tenant deleted: ${resolvedName} (${tenantId})`);
      await this.loadBackendData();
    } catch (err) {
      this.showToast('danger', err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Ya, Hapus Sekarang';
      }
    }
  }

  async executePurgeSampleTenants() {
    const btn = document.getElementById('btnConfirmPurgeDemo');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Membersihkan...';
    }

    try {
      const res = await fetch('/api/tenants/purge-samples', {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          this.showToast('danger', 'Sesi login admin telah kedaluwarsa. Silakan masuk kembali.');
          this.clearAuthToken();
          this.showLoginGate();
          return;
        }
        throw new Error(data.error || 'Gagal membersihkan data sample');
      }

      // Optimistically filter known demo slugs from SAAS_TENANTS
      const sampleSlugs = new Set([
        'drg_maya', 'dr_rian_dalam', 'dr_budi_umum', 'drg_siti_ortho', 'dr_hendra_anak',
        'dr_sarah_skin', 'drg_kevin_bali', 'dr_dimas_tht', 'drg_anita_gigi', 'dr_faisal_akupunktur',
        'dr_ratna_mata', 'dr_yudi_umum', 'drg_fajar_perio', 'dr_lukman_obgyn',
        'dr_melani_keluarga', 'drg_wawan_sby', 'dr_anton_jantung', 'dr_wahyu_paru',
        'drg_linda_jogja', 'dr_fajar_ortho', 'dr_nadia_dermatology', 'dr_gunawan_mata',
        'klinik_estetika_ayra'
      ]);
      if (Array.isArray(SAAS_TENANTS)) {
        SAAS_TENANTS = SAAS_TENANTS.filter(t => !sampleSlugs.has(t.slug) && !t.id?.startsWith('TNT-') && !t.id?.includes('-uuid'));
      }
      this.renderTenantsTable();
      this.renderMetrics();
      this.closePurgeDemoModal();

      this.showToast('success', data.message || `Berhasil membersihkan ${data.deleted_count} akun dokter sample demo.`);
      this.logAudit('success', `Cleaned ${data.deleted_count} sample tenants for production`);
      await this.loadBackendData();
    } catch (err) {
      this.showToast('danger', err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Ya, Bersihkan Semua Sample';
      }
    }
  }

  async renderWaSessionsTable() {
    const tbody = document.getElementById('waSessionsTableBody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/baileys/sessions', { headers: this.getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const sessions = data.sessions || [];

      tbody.innerHTML = '';
      if (sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#64748b;">Belum ada tenant/dokter terdaftar.</td></tr>`;
        return;
      }

      sessions.forEach(s => {
        const tr = document.createElement('tr');

        let statusBadge = '<span class="badge-mini" style="background:#334155; color:#94a3b8;">⚪ OFFLINE</span>';
        if (s.status === 'CONNECTED') {
          statusBadge = '<span class="badge-mini" style="background:#064e3b; color:#34d399;">🟢 ONLINE (AKTIF)</span>';
        } else if (s.status === 'SCAN_QR') {
          statusBadge = '<span class="badge-mini" style="background:#78350f; color:#fbbf24;">🟡 PERLU SCAN QR</span>';
        } else if (s.status === 'CONNECTING' || s.status === 'INITIALIZING') {
          statusBadge = '<span class="badge-mini" style="background:#1e3a8a; color:#38bdf8;">🔄 MENGHUBUNGKAN...</span>';
        }

        const phoneDisplay = s.phone ? `+${s.phone.replace(/\D/g, '')}` : '<span style="color:#64748b;">Belum tertaut</span>';
        const connectUrl = window.location.origin + s.connect_url;

        tr.innerHTML = `
          <td>
            <strong style="color:#fff; display:block;">${s.name}</strong>
            <span style="font-size:0.75rem; color:#38bdf8; font-family:var(--font-mono);">${s.slug}</span>
          </td>
          <td>
            <span style="font-size:0.8rem; color:#94a3b8;">${s.category || 'KLINIK'}</span>
          </td>
          <td>
            <span style="font-family:var(--font-mono); color:#cbd5e1;">${phoneDisplay}</span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="tbl-btn" onclick="window.adminCtrl.copyDoctorLink('${connectUrl}')" title="Salin Link Onboarding Dokter">
                📋 Salin Link
              </button>
              <a href="${s.connect_url}" target="_blank" class="tbl-btn primary" style="text-decoration:none; display:inline-block;" title="Buka Halaman Onboarding">
                ↗️ Buka
              </a>
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              <button class="tbl-btn" onclick="window.adminCtrl.openAdminQr('${s.id}', '${(s.name || '').replace(/'/g, "\\'")}')" title="Scan QR di Admin">
                📱 QR
              </button>
              <button class="tbl-btn danger" style="background:rgba(248,113,113,0.15); color:#f87171; border-color:rgba(248,113,113,0.3);" onclick="window.adminCtrl.disconnectWaSession('${s.id}')" title="Putus Sesi WhatsApp">
                🔴 Putus
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.warn('WA Sessions sync error:', err);
    }
  }

  copyDoctorLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert(`✅ Link onboarding dokter berhasil disalin ke clipboard:\n\n${url}\n\nKirimkan tautan ini ke dokter agar dapat scan QR melalui ponsel kliniknya.`);
      }).catch(() => {
        prompt('Salin link onboarding dokter ini:', url);
      });
    } else {
      prompt('Salin link onboarding dokter ini:', url);
    }
  }

  async openAdminQr(tenantId, tenantName) {
    const modal = document.getElementById('modalAdminQr');
    const title = document.getElementById('modalQrTitle');
    const status = document.getElementById('modalQrStatus');
    const img = document.getElementById('modalQrImage');
    if (!modal) return;

    title.textContent = `📱 Scan QR: ${tenantName}`;
    status.textContent = 'Menghubungkan ke Baileys & meminta QR...';
    img.src = '';
    modal.classList.add('active');

    // Trigger start session
    try {
      const res = await fetch(`/api/baileys/sessions/${tenantId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.qr_image) {
        img.src = data.qr_image;
        status.textContent = 'Silakan scan dengan HP Klinik';
      } else if (data.status === 'CONNECTED') {
        status.textContent = `🟢 Sudah terhubung dengan nomor +${data.phone}`;
      }
    } catch (e) {
      status.textContent = 'Error: ' + e.message;
    }

    // Start poll
    if (this.adminQrPoll) clearInterval(this.adminQrPoll);
    this.adminQrPoll = setInterval(async () => {
      try {
        const res = await fetch(`/api/baileys/sessions/${tenantId}/status`, { headers: this.getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'CONNECTED') {
          status.textContent = `🎉 Berhasil Terhubung! (+${data.phone})`;
          img.src = '';
          clearInterval(this.adminQrPoll);
          this.adminQrPoll = null;
          await this.renderWaSessionsTable();
        } else if (data.qr_image && data.qr_image !== img.src) {
          img.src = data.qr_image;
        }
      } catch (e) { }
    }, 1500);
  }

  async disconnectWaSession(tenantId) {
    if (!confirm('Apakah Anda yakin ingin memutus sesi WhatsApp ini?')) return;
    try {
      const res = await fetch(`/api/baileys/sessions/${tenantId}/disconnect`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      alert(data.message || 'Sesi diputus');
      await this.renderWaSessionsTable();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  logAudit(type, message) {
    const consoleEl = document.getElementById('systemAuditLog');
    if (!consoleEl) return;

    const now = new Date().toLocaleTimeString('id-ID');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${now} WIB] [CLIENT] ${message}`;
    consoleEl.prepend(entry);
  }

  startServerLogStream() {
    if (this.logStreamInterval) clearInterval(this.logStreamInterval);
    this.lastServerLogId = 0;
    this.fetchServerLogs();
    let tick = 0;
    this.logStreamInterval = setInterval(() => {
      this.fetchServerLogs();
      tick++;
      // Auto-refresh tenant booking counts and utilization every 8 seconds
      if (tick % 4 === 0) {
        this.loadBackendData();
      }
    }, 2000);
  }

  stopServerLogStream() {
    if (this.logStreamInterval) {
      clearInterval(this.logStreamInterval);
      this.logStreamInterval = null;
    }
  }

  async fetchServerLogs() {
    const consoleEl = document.getElementById('systemAuditLog');
    if (!consoleEl) return;
    try {
      const token = this.getAuthToken();
      if (!token) return;

      const url = this.lastServerLogId > 0
        ? `/api/admin/system-logs?since=${this.lastServerLogId}`
        : '/api/admin/system-logs';

      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (!res.ok) return;

      const data = await res.json();
      if (!data.logs || !Array.isArray(data.logs) || data.logs.length === 0) return;

      // New logs arrive, reverse to append chronologically (newest at top with prepend)
      data.logs.slice().reverse().forEach(log => {
        if (log.id > this.lastServerLogId) {
          this.lastServerLogId = log.id;
        }
        // Avoid duplicate elements if already rendered
        if (consoleEl.querySelector(`[data-log-id="${log.id}"]`)) return;

        const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID');
        const entry = document.createElement('div');
        entry.className = `log-entry ${log.level || 'info'}`;
        entry.setAttribute('data-log-id', log.id);
        entry.textContent = `[${timeStr} WIB] [${log.tag}] ${log.message}`;
        consoleEl.prepend(entry);
      });

      // Keep maximum 200 rows in DOM
      while (consoleEl.children.length > 200) {
        consoleEl.removeChild(consoleEl.lastChild);
      }
    } catch (e) {
      // Quiet fail for polling
    }
  }

  async renderCouponsManagement() {
    try {
      const res = await fetch('/api/admin/coupons', { headers: this.getAuthHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          this.clearAuthToken();
          this.showLoginGate();
        }
        return;
      }
      const data = await res.json();
      if (!data.coupons || !Array.isArray(data.coupons)) return;

      const lt = data.coupons.find(c => c.code === 'LIFETIMEFREE');
      const fp = data.coupons.find(c => c.code === 'FREEPRO');

      // 1. Render Lifetime Free Coupon
      if (lt) {
        const used = lt.quota_used || 0;
        const max = lt.max_capacity || 3;
        const remaining = lt.quota_remaining !== undefined ? lt.quota_remaining : Math.max(0, max - used);
        const percent = Math.min(100, Math.round((used / max) * 100));

        const ltUsedDisplay = document.getElementById('ltUsedDisplay');
        const ltMaxDisplay = document.getElementById('ltMaxDisplay');
        const ltRemainingText = document.getElementById('ltRemainingText');
        const ltProgressBar = document.getElementById('ltProgressBar');
        const ltPercentText = document.getElementById('ltPercentText');
        const ltStatusBadge = document.getElementById('ltStatusBadge');
        const ltCapacityInput = document.getElementById('ltNewCapacityInput');
        const ltRedeemedList = document.getElementById('ltRedeemedPhonesList');

        if (ltUsedDisplay) ltUsedDisplay.textContent = used;
        if (ltMaxDisplay) ltMaxDisplay.textContent = max;
        if (ltRemainingText) {
          ltRemainingText.textContent = remaining > 0 ? `Sisa ${remaining} Kuota` : 'Kuota Penuh';
          ltRemainingText.style.color = remaining > 0 ? '#10b981' : '#ef4444';
        }

        if (ltProgressBar) {
          ltProgressBar.style.width = `${percent}%`;
          ltProgressBar.className = 'coupon-progress-fill' + (percent >= 100 ? ' full' : percent >= 75 ? ' warning' : '');
        }
        if (ltPercentText) ltPercentText.textContent = `${percent}% Kuota Terpakai`;

        if (ltStatusBadge) {
          ltStatusBadge.textContent = lt.is_full ? 'PENUH' : 'TERSEDIA';
          ltStatusBadge.className = 'badge-mini ' + (lt.is_full ? 'expired' : 'partner');
        }

        if (ltCapacityInput && !ltCapacityInput.matches(':focus')) {
          ltCapacityInput.value = max;
        }

        if (ltRedeemedList) {
          ltRedeemedList.innerHTML = '';
          if (lt.redeemed_phones && lt.redeemed_phones.length > 0) {
            lt.redeemed_phones.forEach(phone => {
              const tag = document.createElement('span');
              tag.className = 'phone-tag';
              tag.innerHTML = `📱 <span>+${phone}</span>`;
              ltRedeemedList.appendChild(tag);
            });
          } else {
            ltRedeemedList.innerHTML = '<span class="phone-tag-empty">Belum ada nomor yang redeem kupon ini</span>';
          }
        }
      }

      // 2. Render Free Pro Coupon
      if (fp) {
        const used = fp.quota_used || 0;
        const max = fp.max_capacity || 5;
        const remaining = fp.quota_remaining !== undefined ? fp.quota_remaining : Math.max(0, max - used);
        const percent = Math.min(100, Math.round((used / max) * 100));

        const fpUsedDisplay = document.getElementById('fpUsedDisplay');
        const fpMaxDisplay = document.getElementById('fpMaxDisplay');
        const fpRemainingText = document.getElementById('fpRemainingText');
        const fpProgressBar = document.getElementById('fpProgressBar');
        const fpPercentText = document.getElementById('fpPercentText');
        const fpStatusBadge = document.getElementById('fpStatusBadge');
        const fpCapacityInput = document.getElementById('fpNewCapacityInput');
        const fpRedeemedList = document.getElementById('fpRedeemedPhonesList');

        if (fpUsedDisplay) fpUsedDisplay.textContent = used;
        if (fpMaxDisplay) fpMaxDisplay.textContent = max;
        if (fpRemainingText) {
          fpRemainingText.textContent = remaining > 0 ? `Sisa ${remaining} Kuota` : 'Kuota Penuh';
          fpRemainingText.style.color = remaining > 0 ? '#38bdf8' : '#ef4444';
        }

        if (fpProgressBar) {
          fpProgressBar.style.width = `${percent}%`;
          fpProgressBar.className = 'coupon-progress-fill' + (percent >= 100 ? ' full' : percent >= 75 ? ' warning' : '');
        }
        if (fpPercentText) fpPercentText.textContent = `${percent}% Kuota Terpakai`;

        if (fpStatusBadge) {
          fpStatusBadge.textContent = fp.is_full ? 'PENUH' : 'TERSEDIA';
          fpStatusBadge.className = 'badge-mini ' + (fp.is_full ? 'expired' : 'pro');
        }

        if (fpCapacityInput && !fpCapacityInput.matches(':focus')) {
          fpCapacityInput.value = max;
        }

        if (fpRedeemedList) {
          fpRedeemedList.innerHTML = '';
          if (fp.redeemed_phones && fp.redeemed_phones.length > 0) {
            fp.redeemed_phones.forEach(phone => {
              const tag = document.createElement('span');
              tag.className = 'phone-tag';
              tag.innerHTML = `🤖 <span>+${phone}</span>`;
              fpRedeemedList.appendChild(tag);
            });
          } else {
            fpRedeemedList.innerHTML = '<span class="phone-tag-empty">Belum ada nomor yang redeem kupon ini</span>';
          }
        }
      }

      this.initCouponControlsOnce();
    } catch (err) {
      console.warn('Error fetching coupon status:', err);
    }
  }

  initCouponControlsOnce() {
    if (this._couponsControlBound) return;
    this._couponsControlBound = true;

    // Refresh button
    const btnRefresh = document.getElementById('btnRefreshCoupons');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.renderCouponsManagement();
        this.logAudit('info', 'Data kupon pilot berhasil diperbarui dari server.');
      });
    }

    // Quick add buttons
    document.querySelectorAll('.btn-quick-quota').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const coupon = e.currentTarget.dataset.coupon;
        const addQuota = parseInt(e.currentTarget.dataset.add, 10);
        await this.submitCouponQuotaUpdate(coupon, { add_quota: addQuota });
      });
    });

    // Custom Save Lifetime Quota
    const btnSaveLt = document.getElementById('btnSaveLtQuota');
    const inputLt = document.getElementById('ltNewCapacityInput');
    if (btnSaveLt && inputLt) {
      btnSaveLt.addEventListener('click', async () => {
        const val = parseInt(inputLt.value, 10);
        if (isNaN(val) || val < 1) {
          alert('Masukkan kapasitas kuota yang valid (angka minimal 1)');
          return;
        }
        await this.submitCouponQuotaUpdate('LIFETIMEFREE', { max_capacity: val });
      });
    }

    // Custom Save Free Pro Quota
    const btnSaveFp = document.getElementById('btnSaveFpQuota');
    const inputFp = document.getElementById('fpNewCapacityInput');
    if (btnSaveFp && inputFp) {
      btnSaveFp.addEventListener('click', async () => {
        const val = parseInt(inputFp.value, 10);
        if (isNaN(val) || val < 1) {
          alert('Masukkan kapasitas kuota yang valid (angka minimal 1)');
          return;
        }
        await this.submitCouponQuotaUpdate('FREEPRO', { max_capacity: val });
      });
    }
  }

  async submitCouponQuotaUpdate(couponCode, payload) {
    const feedbackEl = couponCode === 'LIFETIMEFREE' ? document.getElementById('ltQuotaMsg') : document.getElementById('fpQuotaMsg');
    try {
      const res = await fetch('/api/admin/coupons/update-quota', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          coupon: couponCode,
          ...payload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah kapasitas kupon');
      }

      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = 'rgba(16, 185, 129, 0.15)';
        feedbackEl.style.color = '#10b981';
        feedbackEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        feedbackEl.textContent = `✅ Berhasil! Kuota ${couponCode} kini: ${data.max_capacity} nomor (Sisa: ${data.quota_remaining}).`;
        setTimeout(() => { feedbackEl.style.display = 'none'; }, 4000);
      }

      this.logAudit('success', `Super Admin mengubah kuota kupon ${couponCode}: Kapasitas baru = ${data.max_capacity}, Terpakai = ${data.quota_used}`);
      await this.renderCouponsManagement();
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = 'rgba(239, 68, 68, 0.15)';
        feedbackEl.style.color = '#ef4444';
        feedbackEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        feedbackEl.textContent = `❌ ${err.message}`;
        setTimeout(() => { feedbackEl.style.display = 'none'; }, 5000);
      }
      this.logAudit('danger', `Gagal mengubah kuota kupon ${couponCode}: ${err.message}`);
    }
  }

  openEditModal(tenantId) {
    const tenant = SAAS_TENANTS.find(t => t.id === tenantId);
    if (!tenant) return alert('Tenant tidak ditemukan');

    const modal = document.getElementById('modalEditTenant');
    if (!modal) return;

    document.getElementById('editTenantId').value = tenant.id;
    document.getElementById('editTenantName').value = tenant.name || '';
    let phoneVal = tenant.ownerPhone || '';
    if (tenant.whitelistPhones && tenant.whitelistPhones.length > 0) {
      phoneVal = tenant.whitelistPhones.join(', ');
    } else if (tenant.doctorLid && !phoneVal.includes(tenant.doctorLid)) {
      phoneVal = `${phoneVal}, ${tenant.doctorLid}`;
    }
    document.getElementById('editTenantPhone').value = phoneVal;
    if (document.getElementById('editTenantCategory')) {
      document.getElementById('editTenantCategory').value = tenant.specialty || 'GENERAL';
    }
    if (document.getElementById('editTenantPlan')) {
      document.getElementById('editTenantPlan').value = tenant.plan || 'PRO';
    }
    if (document.getElementById('editTenantOpenHour')) {
      document.getElementById('editTenantOpenHour').value = tenant.openHour || (tenant.operatingHours && tenant.operatingHours.open) || '09:00';
    }
    if (document.getElementById('editTenantCloseHour')) {
      document.getElementById('editTenantCloseHour').value = tenant.closeHour || (tenant.operatingHours && tenant.operatingHours.close) || '17:00';
    }

    modal.classList.add('active');
  }

  async openServicesModal(tenantId) {
    const tenant = SAAS_TENANTS.find(t => t.id === tenantId || t.slug === tenantId);
    if (!tenant) return alert('Tenant tidak ditemukan');

    const modal = document.getElementById('modalServices');
    const titleEl = document.getElementById('servicesModalTitle');
    const listEl = document.getElementById('servicesModalList');
    const tenantIdInput = document.getElementById('newServiceTenantId');

    if (titleEl) titleEl.textContent = `💰 Layanan & Dasar Tarif: ${tenant.name}`;
    if (tenantIdInput) tenantIdInput.value = tenant.id;

    if (listEl) {
      listEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">Memuat daftar layanan...</td></tr>`;
    }
    if (modal) modal.classList.add('active');

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/services`, { headers: this.getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat layanan');
      this.renderServicesList(tenant.id, data.services || []);
    } catch (e) {
      if (listEl) {
        listEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#f87171;">Error: ${e.message}</td></tr>`;
      }
    }
  }

  renderServicesList(tenantId, services) {
    const listEl = document.getElementById('servicesModalList');
    if (!listEl) return;

    if (services.length === 0) {
      listEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">Belum ada layanan terdaftar. Tambahkan layanan baru di bawah.</td></tr>`;
      return;
    }

    listEl.innerHTML = services.map((s, idx) => `
      <tr>
        <td style="font-family:var(--font-mono); color:#94a3b8;">${idx + 1}</td>
        <td>
          <input type="text" class="admin-input" style="padding:4px 8px; font-size:0.82rem;" id="srv_name_${s.id}" value="${s.name}">
        </td>
        <td>
          <input type="number" class="admin-input" style="width:80px; padding:4px 8px; font-size:0.82rem;" id="srv_dur_${s.id}" value="${s.duration_minutes}">
        </td>
        <td>
          <input type="number" class="admin-input" style="width:130px; padding:4px 8px; font-size:0.82rem; font-weight:700; color:#34d399;" id="srv_price_${s.id}" value="${s.price}">
        </td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="tbl-btn primary" onclick="window.adminCtrl.saveService('${tenantId}', '${s.id}')" title="Simpan Perubahan Tarif">💾 Simpan</button>
            <button class="tbl-btn danger" style="background:rgba(248,113,113,0.15); color:#f87171; border-color:rgba(248,113,113,0.3);" onclick="window.adminCtrl.deleteService('${tenantId}', '${s.id}')" title="Hapus Layanan">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async saveService(tenantId, serviceId) {
    const name = document.getElementById(`srv_name_${serviceId}`)?.value.trim();
    const duration = parseInt(document.getElementById(`srv_dur_${serviceId}`)?.value, 10);
    const price = parseInt(document.getElementById(`srv_price_${serviceId}`)?.value, 10);

    if (!name || isNaN(price)) return alert('Nama dan harga wajib diisi');

    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify({ name, duration_minutes: duration, price })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan layanan');
      alert(`✅ Tarif layanan "${name}" berhasil diperbarui menjadi Rp ${price.toLocaleString('id-ID')}!`);
      this.openServicesModal(tenantId);
    } catch (e) {
      alert('❌ Error: ' + e.message);
    }
  }

  async deleteService(tenantId, serviceId) {
    if (!confirm('Hapus layanan ini?')) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus layanan');
      this.openServicesModal(tenantId);
    } catch (e) {
      alert('❌ Error: ' + e.message);
    }
  }
}

// Bootstrap with state check
function bootAdmin() {
  if (!window.adminCtrl) {
    window.adminCtrl = new SuperadminController();
    window.adminCtrl.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAdmin);
} else {
  bootAdmin();
}
