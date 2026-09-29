/* ==========================================================================
   AI-RECEPTIONIST ZERO-WEB: INTERACTIVE LOGIC & SIMULATOR ENGINE
   Compliant with PRD_WHATSAPP_PRACTICE_BOT.md (v3.0.0-PROD-COMPLETE)
   Supports: Patient Perspective, Doctor Perspective, Dual Live Sync,
   and Full-Access Doctor Insight & Practice Analytics Dashboard.
   ========================================================================== */

// --- Web Audio API for Realistic Subtle WhatsApp Sounds ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playPop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playSent() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      // ignore
    }
  }

  playAlarm() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      osc.frequency.setValueAtTime(950, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      // ignore
    }
  }
}

const sfx = new SoundEffects();

// --- Reactive State Management for Appointments (Live Dashboard & Bot) ---
let APPOINTMENTS_DATA = [
  { id: 'DNT-101', name: 'Budi Santoso', service: 'Scaling Gigi (40m)', time: '14:00 WIB', status: 'COMPLETED', duration: '35m' },
  { id: 'DNT-102', name: 'Ratna Dewi', service: 'Tambal Estetik (45m)', time: '14:45 WIB', status: 'COMPLETED', duration: '42m' },
  { id: 'DNT-103', name: 'Ahmad Fauzi', service: 'Konsultasi Gigi', time: '15:30 WIB', status: 'COMPLETED', duration: '18m' },
  { id: 'DNT-104', name: 'Dimas Arya', service: 'Scaling Karang Gigi', time: '16:00 WIB', status: 'IN_CONSULTATION', duration: '14m...' },
  { id: 'DNT-105', name: 'Siti Rahma', service: 'Tambal Estetik', time: '17:30 WIB', status: 'WAITING', duration: '-' },
  { id: 'DNT-106', name: 'Hendra Wijaya', service: 'Ekstraksi Gigi', time: '18:30 WIB', status: 'WAITING', duration: '-' }
];

let IS_PRACTICE_OPEN = true;

// --- Scenarios Data for Patient Perspective Simulator ---
const SCENARIOS = {
  dental: {
    title: 'Asisten drg. Maya 🦷',
    status: 'Online • Auto Slot Booking',
    chips: ['BOOK_DRG_MAYA', '1', 'A - Dimas Arya', 'Batal'],
    messages: [
      {
        sender: 'user',
        text: 'BOOK_DRG_MAYA',
        time: '10:14'
      },
      {
        sender: 'bot',
        text: 'Halo! Selamat datang di *Praktek Mandiri drg. Maya* 🦷\n\nSilakan pilih tindakan medis:\n1️⃣ Scaling Karang Gigi (40 mnt)\n2️⃣ Tambal Estetik (45 mnt)\n3️⃣ Ekstraksi/Cabut Gigi (60 mnt)',
        time: '10:14'
      },
      {
        sender: 'user',
        text: '1',
        time: '10:15'
      },
      {
        sender: 'bot',
        text: 'Pilihan Anda: *Scaling Karang Gigi*.\n\nBerikut pilihan slot kosong hari ini:\n*A.* 16:00 WIB (Tersedia)\n*B.* 17:30 WIB (Tersedia)\n\nBalas dengan *[Huruf Opsi] - [Nama Anda]*, contoh: `A - Budi`',
        time: '10:15'
      },
      {
        sender: 'user',
        text: 'A - Dimas Arya',
        time: '10:15'
      },
      {
        sender: 'bot',
        text: '✅ *Pendaftaran Berhasil Terkonfirmasi!*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ No. Tiket: *#DNT-104*\n👤 Pasien: *Dimas Arya*\n🩺 Layanan: *Scaling Gigi (40m)*\n🗓️ Jadwal: *Hari ini, 16:00 WIB*\n📍 Lokasi: Jl. Anggrek No. 14, Bandung\n━━━━━━━━━━━━━━━━━━━━\n_Mohon hadir 10 menit sebelum jam temu untuk sterilisasi. Ketik RESCHEDULE jika ingin ubah jam (maks H-2 jam)._',
        time: '10:15'
      }
    ]
  },

  general: {
    title: 'Klinik dr. Rian Sp.PD 🩺',
    status: 'Online • Antrean Berjalan Real-time',
    chips: ['DAFTAR_ANTREAN', 'Siti Rahma - Flu & Batuk', 'STATUS_ANTREAN'],
    messages: [
      {
        sender: 'user',
        text: 'DAFTAR_ANTREAN',
        time: '16:02'
      },
      {
        sender: 'bot',
        text: 'Selamat sore! Selamat datang di *Praktek Mandiri dr. Rian*.\n\nSistem antrean berjalan aktif:\n• Kuota Terisi: 7 / 25 Pasien\n• Saat Ini Memeriksa: *Antrean #04*\n\nSilakan ketik *Nama Lengkap - Keluhan Singkat* untuk mengambil nomor antrean:',
        time: '16:02'
      },
      {
        sender: 'user',
        text: 'Siti Rahma - Demam dan Flu 3 Hari',
        time: '16:03'
      },
      {
        sender: 'bot',
        text: '🎟️ *TIKET ANTREAN ANDA: #08*\n━━━━━━━━━━━━━━━━━━━━\n👤 Pasien: *Ibu Siti Rahma*\n🔢 Sisa antrean di depan: *3 pasien*\n⏳ Estimasi Pelayanan: *± 16:45 WIB*\n(Perhitungan real-time: 15 menit/pasien)\n━━━━━━━━━━━━━━━━━━━━\n_Kami akan mengirim pesan WhatsApp saat nomor #07 masuk periksa, agar Anda bisa bersiap tanpa perlu menunggu lama di ruang praktek._',
        time: '16:03'
      }
    ]
  },

  reschedule: {
    title: 'Self-Service Reschedule 🔄',
    status: 'Atomic Database Swap (H-2 Jam)',
    chips: ['RESCHEDULE #DNT-104', 'B - Besok 18:00 WIB'],
    messages: [
      {
        sender: 'user',
        text: 'RESCHEDULE #DNT-104',
        time: '11:20'
      },
      {
        sender: 'bot',
        text: '🔍 *Validasi Reschedule Tiket #DNT-104:*\n• Waktu Sekarang: 11:20 WIB\n• Jadwal Semula: Hari ini, 16:00 WIB\n• Sisa Waktu: 4 jam 40 mnt (> batas cutoff H-2 jam ✅)\n• Kuota Reschedule: 1 dari 2 kali tersisa.\n\nPilih slot pengganti yang masih kosong:\n*A.* Hari ini, 19:00 WIB\n*B.* Besok, 18:00 WIB\n\nBalas dengan *[Huruf Pilihan]* untuk tukar jadwal secara instan:',
        time: '11:20'
      },
      {
        sender: 'user',
        text: 'B',
        time: '11:21'
      },
      {
        sender: 'bot',
        text: '🔄 *Reschedule Berhasil! (Atomic Swap)*\n━━━━━━━━━━━━━━━━━━━━\nJadwal lama (16:00 WIB) telah dibebaskan untuk pasien lain.\n\n🗓️ *JADWAL BARU ANDA:*\n• Hari: *Besok (Rabu)*\n• Jam: *18:00 WIB*\n• No Tiket Tetap: *#DNT-104*\n\nTiket kalender telah diperbarui otomatis. Sampai jumpa besok!',
        time: '11:21'
      }
    ]
  }
};

// Initial messages for Doctor's Phone
const DOCTOR_INITIAL_MESSAGES = [
  {
    sender: 'system',
    text: '🔒 Sesi Asisten Dokter Mandiri Aktif (Zero-Web) • drg. Maya\nNomor Terverifikasi: +62 812-9988-7766 • WhatsApp Autonomous Engine Online',
    time: '16:00'
  },
  {
    sender: 'doctor',
    text: '📊 Dashboard & Insight hari ini',
    time: '16:00'
  },
  {
    sender: 'bot',
    text: 'Berikut rangkuman performa praktek dan insight cerdas hari ini:',
    hasDashboard: true,
    time: '16:00'
  }
];

// --- Patient Simulator Controller ---
class PatientSimulator {
  constructor() {
    this.currentMode = 'dental';
    this.container = document.getElementById('chatStream');
    this.titleEl = document.getElementById('waHeaderTitle');
    this.statusEl = document.getElementById('waHeaderStatus');
    this.chipsContainer = document.getElementById('quickChips');
    this.inputField = document.getElementById('waInputField');
    this.sendBtn = document.getElementById('waSendBtn');
    this.timeouts = [];
  }

  init() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.switchMode(mode);
      });
    });

    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleUserInput());
    }
    if (this.inputField) {
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleUserInput();
      });
    }

    this.switchMode('dental');
  }

  clearTimeouts() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  }

  switchMode(mode) {
    if (!SCENARIOS[mode]) return;
    this.currentMode = mode;
    this.clearTimeouts();

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const data = SCENARIOS[mode];
    this.titleEl.innerHTML = `${data.title} <span class="wa-verified-badge">✓</span>`;
    this.statusEl.textContent = data.status;

    this.renderChips(data.chips);
    this.playScenario(mode);
  }

  renderChips(chips) {
    this.chipsContainer.innerHTML = '';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.textContent = chip;
      btn.addEventListener('click', () => {
        this.inputField.value = chip;
        this.handleUserInput();
      });
      this.chipsContainer.appendChild(btn);
    });
  }

  playScenario(mode) {
    this.clearTimeouts();
    this.container.innerHTML = `<div class="wa-date-divider">Hari ini</div>`;

    const msgs = SCENARIOS[mode].messages;
    let delay = 300;

    msgs.forEach((msg) => {
      if (msg.sender === 'bot') {
        const t1 = setTimeout(() => this.showTyping(), delay);
        this.timeouts.push(t1);
        delay += 900;
      }

      const t2 = setTimeout(() => {
        this.hideTyping();
        this.appendMessage(msg);
        if (msg.sender === 'bot') sfx.playPop();
        else sfx.playSent();
      }, delay);
      this.timeouts.push(t2);

      delay += 1600;
    });
  }

  showTyping() {
    this.hideTyping();
    const typing = document.createElement('div');
    typing.id = 'waPatientTyping';
    typing.className = 'wa-typing';
    typing.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.container.appendChild(typing);
    this.container.scrollTop = this.container.scrollHeight;
  }

  hideTyping() {
    const el = document.getElementById('waPatientTyping');
    if (el) el.remove();
  }

  appendMessage(msg) {
    const bubble = document.createElement('div');
    const isOutgoing = msg.sender === 'user';
    bubble.className = `wa-msg ${isOutgoing ? 'outgoing' : 'incoming'}`;

    let textHtml = msg.text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 4px;border-radius:4px;font-family:var(--font-mono);font-size:0.75rem;">$1</code>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `
      <div class="wa-bubble">
        <div class="wa-text">${textHtml}</div>
        <div class="wa-meta">
          <span>${msg.time || '10:15'}</span>
          ${isOutgoing ? '<span class="wa-check">✓✓</span>' : ''}
        </div>
      </div>
    `;

    this.container.appendChild(bubble);
    this.container.scrollTop = this.container.scrollHeight;
  }

  handleUserInput() {
    const text = this.inputField.value.trim();
    if (!text) return;
    this.inputField.value = '';

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    this.appendMessage({ sender: 'user', text: text, time: now });
    sfx.playSent();

    this.showTyping();
    setTimeout(() => {
      this.hideTyping();
      let replyText = `Terima kasih! Pesan "${text}" telah diterima sistem penjadwalan.`;
      if (text.startsWith('1') || text.toLowerCase().includes('scaling')) {
        replyText = 'Pilihan: *Scaling Gigi*. Slot kosong hari ini:\n*A.* 16:00 WIB\n*B.* 17:30 WIB\nBalas dengan `A - Nama Anda` untuk memesan.';
      } else if (text.toLowerCase().startsWith('a') || text.toLowerCase().startsWith('b')) {
        replyText = '✅ *Tiket Terkonfirmasi!* Data tersimpan aman di database. Mohon hadir 10 menit sebelum jadwal.';
      }
      this.appendMessage({ sender: 'bot', text: replyText, time: now });
      sfx.playPop();
    }, 1000);
  }

  // Live push notification from doctor's action
  receiveDoctorCallNotification(ticketId, patientName) {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    this.showTyping();
    setTimeout(() => {
      this.hideTyping();
      this.appendMessage({
        sender: 'bot',
        text: `🔔 *PANGGILAN GILIRAN ANDA!*\n━━━━━━━━━━━━━━━━━━━━\nTiket *#${ticketId}* atas nama *${patientName}*, giliran Anda telah tiba.\nSilakan langsung masuk ke *Ruang Periksa 1 (drg. Maya)*.\n━━━━━━━━━━━━━━━━━━━━\n_Mohon siapkan identitas Anda._`,
        time: now
      });
      sfx.playPop();
    }, 800);
  }
}

// --- Doctor Copilot Simulator Controller (Zero-Web Practice Assistant) ---
class DoctorCopilotSimulator {
  constructor(patientSim) {
    this.patientSim = patientSim;
    this.container = document.getElementById('doctorChatStream');
    this.inputField = document.getElementById('docInputField');
    this.sendBtn = document.getElementById('docSendBtn');
  }

  init() {
    // Initial messages
    this.container.innerHTML = `<div class="wa-date-divider">Hari ini</div>`;
    DOCTOR_INITIAL_MESSAGES.forEach(msg => this.appendMessage(msg));

    // Fast command buttons
    const btnDashboard = document.getElementById('cmdDoctorDashboard');
    if (btnDashboard) btnDashboard.addEventListener('click', () => this.handleCommand('DASHBOARD'));

    const btnQueue = document.getElementById('cmdDoctorQueue');
    if (btnQueue) btnQueue.addEventListener('click', () => this.handleCommand('ANTREAN'));

    const btnNext = document.getElementById('cmdDoctorNext');
    if (btnNext) btnNext.addEventListener('click', () => this.handleCommand('NEXT'));

    const btnDone = document.getElementById('cmdDoctorDone');
    if (btnDone) btnDone.addEventListener('click', () => this.handleCommand('DONE'));

    const btnNudge = document.getElementById('cmdDoctorNudge');
    if (btnNudge) btnNudge.addEventListener('click', () => this.triggerSmartNudgeAlarm());

    const btnToggle = document.getElementById('cmdDoctorToggleStatus');
    if (btnToggle) btnToggle.addEventListener('click', () => this.handleCommand('TOGGLE_STATUS'));

    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleInput());
    }
    if (this.inputField) {
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleInput();
      });
    }
  }

  appendMessage(msg) {
    const bubble = document.createElement('div');
    const isOutgoing = msg.sender === 'doctor';
    const isSystem = msg.sender === 'system';

    if (isSystem) {
      bubble.className = 'wa-msg';
      bubble.style.cssText = 'align-self: center; max-width: 95%;';
      bubble.innerHTML = `
        <div style="background: rgba(30, 58, 95, 0.4); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 6px 12px; font-size: 0.72rem; color: #93c5fd; text-align: center; line-height: 1.4;">
          ${msg.text}
        </div>
      `;
      this.container.appendChild(bubble);
      this.container.scrollTop = this.container.scrollHeight;
      return;
    }

    bubble.className = `wa-msg ${isOutgoing ? 'outgoing doctor' : 'incoming'}`;

    let textHtml = msg.text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 4px;border-radius:4px;font-family:var(--font-mono);font-size:0.75rem;">$1</code>')
      .replace(/\n/g, '<br>');

    // Optional Dashboard Card injection
    let dashboardCardHtml = '';
    if (msg.hasDashboard) {
      dashboardCardHtml = `
        <div class="wa-dash-card">
          <div class="wa-dash-header">
            <div class="wa-dash-title">
              <span>📊</span>
              <span>DASHBOARD PRAKTEK drg. Maya</span>
            </div>
            <span class="wa-dash-badge">SESI SORE AKTIF</span>
          </div>

          <div class="wa-kpi-mini-grid">
            <div class="wa-kpi-mini-pill accent-blue">
              <div class="wa-kpi-mini-val">14 Pasien</div>
              <div class="wa-kpi-mini-lbl">4 Selesai • 1 Aktif • 9 Antre</div>
            </div>
            <div class="wa-kpi-mini-pill accent-emerald">
              <div class="wa-kpi-mini-val">18.5 mnt</div>
              <div class="wa-kpi-mini-lbl">Rata-rata Durasi Konsul</div>
            </div>
            <div class="wa-kpi-mini-pill accent-purple">
              <div class="wa-kpi-mini-val">Rp 3.650.000</div>
              <div class="wa-kpi-mini-lbl">Estimasi Omzet Sesi</div>
            </div>
            <div class="wa-kpi-mini-pill accent-amber">
              <div class="wa-kpi-mini-val">100% Hadir</div>
              <div class="wa-kpi-mini-lbl">0 No-Show (Pengingat WA)</div>
            </div>
          </div>

          <div class="wa-chart-img" style="background:#0b141a; margin:4px 0 8px 0; border:1px solid #1f2c34;">
            <div style="font-size:0.7rem; color:#8696a0; margin-bottom:4px; display:flex; justify-content:space-between;">
              <span>📈 Tren Kunjungan Pasien (7 Hari)</span>
              <span style="color:#34d399; font-weight:700;">+24% vs pekan lalu</span>
            </div>
            <svg viewBox="0 0 320 100" style="width: 100%; height: auto; display: block;">
              <defs>
                <linearGradient id="chartGradDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <line x1="20" y1="20" x2="300" y2="20" stroke="#1f2c34" stroke-dasharray="2,2"/>
              <line x1="20" y1="50" x2="300" y2="50" stroke="#1f2c34" stroke-dasharray="2,2"/>
              <line x1="20" y1="80" x2="300" y2="80" stroke="#1f2c34" stroke-dasharray="2,2"/>
              <polygon points="25,75 70,60 115,68 160,35 205,42 250,18 295,22 295,85 25,85" fill="url(#chartGradDash)"/>
              <polyline points="25,75 70,60 115,68 160,35 205,42 250,18 295,22" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
              <circle cx="160" cy="35" r="3" fill="#67e8f9"/>
              <circle cx="250" cy="18" r="4" fill="#fff" stroke="#0284c7" stroke-width="2"/>
              <text x="25" y="95" fill="#64748b" font-size="8" text-anchor="middle">Sen</text>
              <text x="70" y="95" fill="#64748b" font-size="8" text-anchor="middle">Sel</text>
              <text x="115" y="95" fill="#64748b" font-size="8" text-anchor="middle">Rab</text>
              <text x="160" y="95" fill="#64748b" font-size="8" text-anchor="middle">Kam</text>
              <text x="205" y="95" fill="#64748b" font-size="8" text-anchor="middle">Jum</text>
              <text x="250" y="95" fill="#38bdf8" font-weight="bold" font-size="8" text-anchor="middle">Sab</text>
              <text x="295" y="95" fill="#64748b" font-size="8" text-anchor="middle">Min</text>
            </svg>
          </div>

          <div class="wa-insight-box">
            <div class="wa-insight-head">
              <span>🧠</span> <span>Kecerdasan Klinis AI (Zero-Web Insight):</span>
            </div>
            <div class="wa-insight-item"><strong>Puncak Kunjungan:</strong> 65% pasien terkonsentrasi di 16:30 - 18:30 WIB. Slot pagi sering lengang, disarankan broadcast slot pagi di H-1.</div>
            <div class="wa-insight-item"><strong>Efisiensi Tindakan:</strong> Scaling karang gigi selesai rata-rata 22 menit (6m lebih cepat dari standar). Kuota aman ditambah +2 pasien per sesi.</div>
            <div class="wa-insight-item"><strong>Retensi Pasien:</strong> 8 dari 14 pasien (57%) adalah pasien lama yang kembali kontrol berkat reminder otomatis WhatsApp.</div>
            <div class="wa-insight-item"><strong>Anti-Tabrakan:</strong> 2 booking serentak berhasil ditangani Postgres GIST lock Baileys tanpa tabrakan jadwal.</div>
          </div>

          <div class="wa-btn-group">
            <button class="wa-inline-btn" id="btnWaShowQueue">📋 Lihat Detail Antrean Live</button>
            <button class="wa-inline-btn" id="btnWaCallNext" style="color:#34d399; border-color:rgba(52,211,153,0.3);">📢 Panggil Pasien Berikutnya (Next)</button>
          </div>
        </div>
      `;
    }

    // Optional Live Queue Roster injection
    let queueRosterHtml = '';
    if (msg.hasQueue) {
      queueRosterHtml = `<div class="wa-queue-roster">`;
      queueRosterHtml += `<div style="font-size:0.75rem; font-weight:700; color:#38bdf8; margin-bottom:4px;">📋 DAFTAR ANTREAN LIVE (SESI SORE):</div>`;
      APPOINTMENTS_DATA.forEach(item => {
        let tagClass = 'waiting';
        let tagLabel = 'MENUNGGU';
        let isCurrent = false;

        if (item.status === 'IN_CONSULTATION') {
          tagClass = 'in-consult';
          tagLabel = 'SEDANG DIPERIKSA';
          isCurrent = true;
        } else if (item.status === 'COMPLETED') {
          tagClass = 'completed';
          tagLabel = 'SELESAI';
        }

        queueRosterHtml += `
          <div class="wa-queue-item ${isCurrent ? 'active' : ''}">
            <div>
              <span style="font-weight:700; color:#e2e8f0;">#${item.id}</span>
              <span style="color:#94a3b8; margin: 0 4px;">•</span>
              <strong style="color:#f8fafc;">${item.name}</strong>
              <div style="font-size:0.65rem; color:#64748b;">${item.service} (${item.time})</div>
            </div>
            <div>
              <span class="wa-queue-tag ${tagClass}">${tagLabel}</span>
            </div>
          </div>
        `;
      });
      queueRosterHtml += `</div>`;
    }

    bubble.innerHTML = `
      <div class="wa-bubble">
        <div class="wa-text">${textHtml}</div>
        ${dashboardCardHtml}
        ${queueRosterHtml}
        <div class="wa-meta">
          <span>${msg.time || '16:00'}</span>
          ${isOutgoing ? '<span class="wa-check">✓✓</span>' : ''}
        </div>
      </div>
    `;

    this.container.appendChild(bubble);
    this.container.scrollTop = this.container.scrollHeight;

    // Attach inline button handlers if present
    const btnQueue = bubble.querySelector('#btnWaShowQueue');
    if (btnQueue) {
      btnQueue.addEventListener('click', () => this.handleCommand('ANTREAN'));
    }
    const btnCall = bubble.querySelector('#btnWaCallNext');
    if (btnCall) {
      btnCall.addEventListener('click', () => this.handleCommand('NEXT'));
    }
  }

  handleInput() {
    const text = this.inputField.value.trim();
    if (!text) return;
    this.inputField.value = '';
    this.handleCommand(text);
  }

  handleCommand(cmd) {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const clean = cmd.toUpperCase().trim();

    // 1. Doctor sends message
    this.appendMessage({ sender: 'doctor', text: cmd, time: now });
    sfx.playSent();

    setTimeout(() => {
      // 2. Bot processes command via Tool Calling / Conversational Intelligence
      if (clean.includes('DASHBOARD') || clean.includes('INSIGHT') || clean.includes('LAPORAN') || clean.includes('ANALITIK') || clean.includes('KINERJA') || clean.includes('PERFORMA')) {
        this.appendMessage({
          sender: 'bot',
          text: `📊 *Laporan Dashboard & Clinical Practice Insight Terkini*\nData disinkronkan otomatis dari aktivitas reservasi WhatsApp hari ini:`,
          hasDashboard: true,
          time: now
        });
        sfx.playPop();
      } else if (clean.includes('ANTREAN') || clean.includes('JADWAL') || clean.includes('QUEUE') || clean.includes('DAFTAR')) {
        const activeCount = APPOINTMENTS_DATA.filter(a => a.status === 'IN_CONSULTATION').length;
        const waitingCount = APPOINTMENTS_DATA.filter(a => a.status === 'WAITING').length;
        const completedCount = APPOINTMENTS_DATA.filter(a => a.status === 'COMPLETED').length;
        this.appendMessage({
          sender: 'bot',
          text: `📋 *STATUS ANTREAN AKTIF HARI INI*\n• Selesai: *${completedCount} Pasien*\n• Sedang Berjalan: *${activeCount} Pasien*\n• Menunggu Giliran: *${waitingCount} Pasien*\n\nKetik \`NEXT\` untuk memanggil atau \`DONE\` setelah selesai periksa.`,
          hasQueue: true,
          time: now
        });
        sfx.playPop();
      } else if (clean.includes('OMZET') || clean.includes('PENDAPATAN') || clean.includes('UANG')) {
        this.appendMessage({
          sender: 'bot',
          text: `💰 *REKAP OMZET & TINDAKAN HARI INI:*\n━━━━━━━━━━━━━━━━━━━━\n• Scaling Gigi (7x): *Rp 1.750.000*\n• Tambal Estetik (4x): *Rp 1.400.000*\n• Ekstraksi/Cabut (1x): *Rp 500.000*\n━━━━━━━━━━━━━━━━━━━━\n💵 *Total Estimasi Sesi:* *Rp 3.650.000*\n💳 Pembayaran: 65% Non-Tunai (QRIS Mayar.id), 35% Tunai di Kasir`,
          time: now
        });
        sfx.playPop();
      } else if (clean.includes('DURASI') || clean.includes('WAKTU') || clean.includes('EFISIENSI')) {
        this.appendMessage({
          sender: 'bot',
          text: `⏱️ *ANALITIK DURASI KONSULTASI:*\n━━━━━━━━━━━━━━━━━━━━\n• Rata-rata per Pasien: *18.5 Menit*\n• Tindakan Tercepat: *#DNT-103 Konsultasi (18m)*\n• Tindakan Terlama: *#DNT-102 Tambal Estetik (42m)*\n• Pasien Sedang Berjalan: *#DNT-104 (14m)*\n\n💡 *Smart Nudge AI:* Bot otomatis menyalakan alarm lembut jika periksa melebihi 20 menit agar antrean tetap presisi.`,
          time: now
        });
        sfx.playPop();
      } else if (clean === 'NEXT' || clean === 'PANGGIL') {
        const nextWaiting = APPOINTMENTS_DATA.find(a => a.status === 'WAITING');
        const currentActive = APPOINTMENTS_DATA.find(a => a.status === 'IN_CONSULTATION');

        if (currentActive) {
          currentActive.status = 'COMPLETED';
          currentActive.duration = '24m';
        }

        if (nextWaiting) {
          nextWaiting.status = 'IN_CONSULTATION';
          this.appendMessage({
            sender: 'bot',
            text: `🔔 *Panggilan Terkirim via Baileys!*\n\n• Pasien Sekarang: *#${nextWaiting.id} (${nextWaiting.name})* dipanggil masuk ke Ruang Periksa.\n• Status Database: Diperbarui ke \`IN_CONSULTATION\`.\n• Standby Alert: Pasien antrean selanjutnya telah dikirimi pengingat untuk bersiap.`,
            time: now
          });
          // Live sync: Notify patient phone!
          if (this.patientSim) {
            this.patientSim.receiveDoctorCallNotification(nextWaiting.id, nextWaiting.name);
          }
        } else {
          this.appendMessage({
            sender: 'bot',
            text: `ℹ️ Semua pasien dalam daftar antrean hari ini telah selesai diperiksa! Tidak ada pasien yang berstatus WAITING.`,
            time: now
          });
        }
        sfx.playPop();
      } else if (clean === 'DONE' || clean === 'SELESAI') {
        const current = APPOINTMENTS_DATA.find(a => a.status === 'IN_CONSULTATION');
        if (current) {
          current.status = 'COMPLETED';
          current.duration = '26m (Tuntas)';
        }
        const remaining = APPOINTMENTS_DATA.filter(a => a.status === 'WAITING').length;
        this.appendMessage({
          sender: 'bot',
          text: `✅ *Konsultasi Selesai!*\n\n• Status Pasien: \`COMPLETED\`\n• Durasi Konsultasi: *26 menit*\n• Sisa Antrean Aktif: *${remaining} Pasien*\n\nKetik \`NEXT\` saat Anda siap memanggil pasien berikutnya.`,
          time: now
        });
        sfx.playPop();
      } else if (clean === 'TOGGLE_STATUS' || clean.includes('TUTUP') || clean.includes('BUKA')) {
        IS_PRACTICE_OPEN = !IS_PRACTICE_OPEN;
        const toggleBtn = document.getElementById('cmdDoctorToggleStatus');
        if (toggleBtn) {
          toggleBtn.innerHTML = IS_PRACTICE_OPEN ? '🔒 <span>Tutup Kuota</span>' : '🟢 <span>Buka Kuota</span>';
        }
        this.appendMessage({
          sender: 'bot',
          text: IS_PRACTICE_OPEN
            ? `🟢 *Pendaftaran Dibuka Kembali!*\nPasien baru di WhatsApp sekarang dapat memesan slot waktu.`
            : `🔒 *Pendaftaran Hari Ini Ditutup!*\nPasien baru yang mengirim chat booking akan menerima pesan sopan bahwa kuota periksa hari ini telah penuh.`,
          time: now
        });
        sfx.playPop();
      } else {
        this.appendMessage({
          sender: 'bot',
          text: `🤖 Perintah *"${cmd}"* dipahami via AI Copilot.\n\nPerintah cepat yang tersedia:\n• \`DASHBOARD\` - Laporan metrik, grafik, dan insight klinis\n• \`ANTREAN\` - Status seluruh pasien sore ini\n• \`NEXT\` - Panggil pasien berikutnya\n• \`DONE\` - Selesaikan konsultasi berjalan\n• \`OMZET\` - Rincian pendapatan sesi hari ini`,
          time: now
        });
        sfx.playPop();
      }
    }, 600);
  }

  triggerSmartNudgeAlarm() {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    sfx.playAlarm();

    // Show Smart Nudge alert banner in chat
    const alertEl = document.createElement('div');
    alertEl.className = 'nudge-alarm-banner';
    alertEl.innerHTML = `
      <span style="font-size: 1.3rem;">⚠️</span>
      <div style="font-size: 0.78rem; line-height: 1.4; color: #ffe4e6;">
        <strong style="color: #fecdd3; display: block;">PROAKTIF: SMART NUDGE TIMER (&gt;20 MENIT)</strong>
        Konsultasi pasien #DNT-104 telah berjalan <strong>24 menit</strong>. Terdapat 2 pasien lain yang sedang menunggu giliran.
      </div>
    `;
    this.container.appendChild(alertEl);
    this.container.scrollTop = this.container.scrollHeight;
  }
}

// --- Dual Sync Simulator Floating Controls (Sound & Replay) ---
function initSimulatorControls(patientSim, doctorSim) {
  const replayBtn = document.getElementById('replayChatBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      // Reset patient scenario
      patientSim.switchMode(patientSim.currentMode || 'dental');
      // Reset doctor initial messages
      doctorSim.container.innerHTML = `<div class="wa-date-divider">Hari ini</div>`;
      DOCTOR_INITIAL_MESSAGES.forEach(msg => doctorSim.appendMessage(msg));
      sfx.playPop();
    });
  }

  const soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      soundBtn.textContent = sfx.enabled ? '🔊 Suara On' : '🔇 Suara Off';
      if (sfx.enabled) sfx.playPop();
    });
  }
}

// --- Pricing Engine (Monthly vs Annual) ---
class PricingEngine {
  constructor() {
    this.isAnnual = false;
    this.switchBtn = document.getElementById('billingSwitch');
    this.labelMonthly = document.getElementById('labelMonthly');
    this.labelAnnual = document.getElementById('labelAnnual');
    this.starterPrice = document.getElementById('priceStarter');
    this.proPrice = document.getElementById('pricePro');
    this.clinicPrice = document.getElementById('priceClinic');
  }

  init() {
    if (!this.switchBtn) return;
    this.switchBtn.addEventListener('click', () => {
      this.isAnnual = !this.isAnnual;
      this.render();
    });

    this.labelMonthly.addEventListener('click', () => {
      this.isAnnual = false;
      this.render();
    });

    this.labelAnnual.addEventListener('click', () => {
      this.isAnnual = true;
      this.render();
    });
  }

  render() {
    this.switchBtn.classList.toggle('annual', this.isAnnual);
    this.labelMonthly.classList.toggle('active', !this.isAnnual);
    this.labelAnnual.classList.toggle('active', this.isAnnual);

    if (this.isAnnual) {
      this.starterPrice.textContent = '79.000';
      this.proPrice.textContent = '159.000';
      this.clinicPrice.textContent = '279.000';
    } else {
      this.starterPrice.textContent = '99.000';
      this.proPrice.textContent = '199.000';
      this.clinicPrice.textContent = '349.000';
    }
  }
}

// --- Mayar.id Payment Modal & Webhook Simulator ---
class MayarPaymentModal {
  constructor() {
    this.modal = document.getElementById('mayarModal');
    this.closeBtn = document.getElementById('closeMayarModal');
    this.planNameEl = document.getElementById('modalPlanName');
    this.planAmountEl = document.getElementById('modalPlanAmount');
    this.timerEl = document.getElementById('qrisTimer');
    this.simulateBtn = document.getElementById('simulatePaymentBtn');
    this.invoiceNumberEl = document.getElementById('modalInvoiceNo');
    this.countdown = 30 * 60;
    this.timerInterval = null;
  }

  init() {
    document.querySelectorAll('[data-buy-plan]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.currentTarget.dataset.buyPlan;
        this.open(plan);
      });
    });

    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    if (this.simulateBtn) {
      this.simulateBtn.addEventListener('click', () => this.simulateWebhookSuccess());
    }
  }

  open(planKey) {
    const plans = {
      STARTER: { name: 'Starter Monthly', price: 'Rp 99.000' },
      PRO: { name: 'Pro Monthly (Rekomendasi)', price: 'Rp 199.000' },
      CLINIC: { name: 'Clinic / Multi-Staff', price: 'Rp 349.000' }
    };

    const target = plans[planKey] || plans.PRO;
    const invNo = 'INV-MYR-' + Math.floor(100000 + Math.random() * 900000);

    this.planNameEl.textContent = target.name;
    this.planAmountEl.textContent = target.price;
    this.invoiceNumberEl.textContent = invNo;

    this.simulateBtn.disabled = false;
    this.simulateBtn.innerHTML = '⚡ Simulasikan Scan QRIS & Webhook Mayar.id';
    this.simulateBtn.className = 'btn btn-primary btn-pulse';

    this.countdown = 30 * 60;
    this.updateTimerDisplay();
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) clearInterval(this.timerInterval);
      this.updateTimerDisplay();
    }, 1000);

    this.modal.classList.add('active');
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.countdown / 60).toString().padStart(2, '0');
    const secs = (this.countdown % 60).toString().padStart(2, '0');
    if (this.timerEl) this.timerEl.textContent = `${mins}:${secs}`;
  }

  simulateWebhookSuccess() {
    this.simulateBtn.disabled = true;
    this.simulateBtn.innerHTML = '⏳ Memverifikasi HMAC-SHA256 Signature...';

    setTimeout(() => {
      this.simulateBtn.innerHTML = '🔄 Eksekusi DB: Tambah Masa Aktif +30 Hari...';
    }, 900);

    setTimeout(() => {
      this.simulateBtn.innerHTML = '✅ Pembayaran Berhasil! Terverifikasi';
      this.simulateBtn.className = 'btn btn-secondary';
      sfx.playPop();

      alert(
        `🎉 NOTIFIKASI WHATSAPP DOKTER:\n\n` +
        `✅ Pembayaran Terkonfirmasi!\n` +
        `Langganan ${this.planNameEl.textContent} aktif untuk 30 hari ke depan.\n` +
        `Total: ${this.planAmountEl.textContent}\n` +
        `Status Gateway: PAID (Mayar.id Dynamic QRIS)\n\n` +
        `Fitur AI Copilot & WhatsApp Bot aktif seketika tanpa perlu restart!`
      );
      this.close();
    }, 2000);
  }

  close() {
    clearInterval(this.timerInterval);
    if (this.modal) this.modal.classList.remove('active');
  }
}

// --- 30-Day Free Trial Modal ---
class FreeTrialModal {
  constructor() {
    this.modal = document.getElementById('trialModal');
    this.closeBtn = document.getElementById('closeTrialModal');
    this.form = document.getElementById('trialForm');
  }

  init() {
    document.querySelectorAll('[data-open-trial]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const docName = document.getElementById('trialDocName').value;
        const clinicName = document.getElementById('trialClinicName').value;
        const phone = document.getElementById('trialPhone').value;
        const slug = clinicName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        sfx.playPop();
        alert(
          `🚀 SELAMAT, ${docName.toUpperCase()}!\n\n` +
          `Akun bot uji coba 30 hari untuk "${clinicName}" telah disiapkan:\n` +
          `• Deep-link Pasien Anda: https://wa.me/6281234567890?text=BOOK_${slug}\n` +
          `• Nomor Terhubung: ${phone}\n` +
          `• Kuota Gratis: 250 Booking\n\n` +
          `Asisten Anda langsung online di WhatsApp sekarang juga!`
        );
        this.close();
      });
    }
  }

  open() {
    if (this.modal) this.modal.classList.add('active');
  }

  close() {
    if (this.modal) this.modal.classList.remove('active');
  }
}

// --- SaaS Superadmin Drawer & Idempotency Runner (PRD Section 10 & 7) ---
class SuperadminHub {
  constructor() {
    this.drawer = document.getElementById('adminDrawer');
    this.openBtn = document.getElementById('openAdminDrawerBtn');
    this.closeBtn = document.getElementById('closeAdminDrawer');
    this.outputBox = document.getElementById('idempotencyOutput');
  }

  init() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.drawer.classList.add('open'));
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.drawer.classList.remove('open'));
    }

    document.querySelectorAll('[data-idemp-scenario]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scenarioId = parseInt(e.currentTarget.dataset.idempScenario, 10);
        this.runScenario(scenarioId);
      });
    });
  }

  runScenario(id) {
    const matrix = {
      1: {
        title: 'Skenario 1: Successful Booking',
        condition: 'Slot kosong, layanan aktif, idempotency key baru, kuota aman.',
        db: 'BEGIN -> Periksa slot GIST -> INSERT appointments -> Idempotency: RESOLVED -> COMMIT.',
        output: '✅ Tiket #DNT-104 diterbitkan dengan jam temu 16:00 WIB.'
      },
      2: {
        title: 'Skenario 2: Occupied Slot (Slot Tabrakan)',
        condition: 'Slot target 16:00 WIB telah diambil pasien lain dalam selisih milidetik.',
        db: 'Query GIST detect overlap -> Clean Abort (Rollback).',
        output: '⚠️ "Maaf, slot 16:00 baru saja terisi. Opsi alternatif: 17:30 atau 18:30 WIB."'
      },
      3: {
        title: 'Skenario 3: Inactive Service / Kuota Tutup',
        condition: 'Layanan Scaling dinonaktifkan dokter atau kuota harian tercapai.',
        db: 'Validasi services.is_active = false -> Short-circuit return.',
        output: '⛔ "Layanan ini sedang tidak menerima reservasi baru hari ini."'
      },
      4: {
        title: 'Skenario 4: Double-Booking Identik',
        condition: 'Pasien yang sama memesan slot yang sama dua kali.',
        db: 'Catch UNIQUE constraint violation (unique_active_customer_slot).',
        output: 'ℹ️ "Anda sudah terdaftar di slot ini dengan Kode #DNT-104. Tidak perlu daftar ulang."'
      },
      5: {
        title: 'Skenario 5: Repeated Request (Jaringan Lag)',
        condition: 'WhatsApp mengirim payload identik 2 kali karena timeout.',
        db: 'Hash payload cocok 100% -> Skip DB write -> Return cached response.',
        output: '✅ Kirim ulang tiket #DNT-104 yang sama persis tanpa duplikasi baris database.'
      },
      6: {
        title: 'Skenario 6: Key Sama Payload Berbeda',
        condition: 'Key sama dicoba dipakai dengan modifikasi nama di detik sama.',
        db: 'Payload Hash mismatch -> Reject with 422 Unprocessable Entity.',
        output: '❌ "Terjadi inkonsistensi data reservasi. Mohon ulangi proses dari awal."'
      },
      7: {
        title: 'Skenario 7: Concurrent Race Condition Lock',
        condition: '2 request serentak dengan key identik dalam selisih mikrodetik.',
        db: 'Request 1 klaim row-lock (IN_PROGRESS). Request 2 exponential backoff lalu ambil hasil Request 1.',
        output: '🛡️ Kedua request aman, hanya 1 appointment tercipta tanpa race-condition!'
      }
    };

    const item = matrix[id] || matrix[1];
    sfx.playPop();

    if (this.outputBox) {
      this.outputBox.innerHTML = `
        <div style="font-weight: 700; color: #34d399; margin-bottom: 4px;">${item.title}</div>
        <div style="color: #94a3b8; font-size: 0.76rem; margin-bottom: 6px;"><strong>Kondisi:</strong> ${item.condition}</div>
        <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.72rem; color: #cbd5e1; margin-bottom: 6px;">
          ⚙️ <strong>DB Engine:</strong> ${item.db}
        </div>
        <div style="color: #67e8f9; font-size: 0.78rem;">
          💬 <strong>WhatsApp Response:</strong> ${item.output}
        </div>
      `;
    }
  }
}

// --- FAQ Accordion ---
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const parent = q.parentElement;
      const isActive = parent.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isActive) {
        parent.classList.add('active');
        const ans = parent.querySelector('.faq-answer');
        ans.style.maxHeight = ans.scrollHeight + 30 + 'px';
      }
    });
  });
}

// --- Smooth Nav Highlight on Scroll ---
function initNavObserver() {
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });
}

// --- Application Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  const patientSim = new PatientSimulator();
  patientSim.init();

  const doctorSim = new DoctorCopilotSimulator(patientSim);
  doctorSim.init();

  initSimulatorControls(patientSim, doctorSim);

  const pricing = new PricingEngine();
  pricing.init();

  const mayar = new MayarPaymentModal();
  mayar.init();

  const trial = new FreeTrialModal();
  trial.init();

  const admin = new SuperadminHub();
  admin.init();

  initFAQ();
  initNavObserver();
});
