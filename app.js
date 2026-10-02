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

// --- Scenarios Data for Customer-to-Business Booking Simulator ---
const SCENARIOS = {
  dental: {
    title: 'drg. Maya Dental Care 🦷',
    status: '+62 812-9988-7766 • Bisnis Terverifikasi • Online',
    chips: ['Halo dok, mau scaling gigi hari ini', 'A - Dimas Arya', 'Batal'],
    messages: [
      {
        sender: 'user',
        text: 'Halo dok, mau tanya ada jadwal kosong untuk scaling karang gigi sore ini?',
        time: '10:14'
      },
      {
        sender: 'bot',
        text: 'Halo Kak! Selamat datang di *drg. Maya Dental Care* 🦷\n\nUntuk tindakan *Scaling Karang Gigi (±45 menit)*, berikut slot terdekat yang masih tersedia hari ini:\n*A.* 16:00 WIB (Tersedia)\n*B.* 17:30 WIB (Tersedia)\n\nSilakan balas dengan pilihan huruf & nama lengkap ya Kak. Contoh: `A - Dimas Arya`',
        time: '10:14'
      },
      {
        sender: 'user',
        text: 'A - Dimas Arya',
        time: '10:15'
      },
      {
        sender: 'bot',
        text: '✅ *Booking Berhasil Dikonfirmasi!*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ No. Booking: *#DNT-104*\n👤 Pasien: *Dimas Arya*\n🩺 Tindakan: *Scaling Karang Gigi*\n🗓️ Waktu: *Hari ini, 16:00 WIB*\n📍 Lokasi: *Jl. Anggrek No. 14, Bandung*\n━━━━━━━━━━━━━━━━━━━━\n_Mohon hadir 10 menit sebelum jam temu untuk sterilisasi. Notifikasi pengingat otomatis akan dikirimkan H-1 jam ke WhatsApp ini._',
        time: '10:15',
        isConfirmed: true,
        bookingDetails: {
          clientName: 'Dimas Arya',
          service: 'Scaling Karang Gigi (45m)',
          time: 'Hari ini, 16:00 WIB',
          ticket: '#DNT-104',
          practice: 'drg. Maya Dental Care'
        }
      }
    ]
  },

  salon: {
    title: 'Ayra Beauty Salon & Studio 💇‍♀️',
    status: '+62 813-1122-3344 • Bisnis Terverifikasi • Online',
    chips: ['Halo min, mau reservasi creambath & haircut', 'Nadia Putri', 'Lihat Treatment Lain'],
    messages: [
      {
        sender: 'user',
        text: 'Halo min, mau reservasi creambath & haircut untuk nanti sore jam 4 bisa?',
        time: '14:20'
      },
      {
        sender: 'bot',
        text: 'Halo Kak! Selamat datang di *Ayra Beauty Salon & Studio* 💇‍♀️✨\n\nJam 16:00 WIB sore ini masih tersedia kursi dengan Stylist senior kami.\n\nDetail Treatment:\n• Haircut & Blow Styling (±40 mnt)\n• Creambath Spa Treatment (±50 mnt)\n\nBoleh info atas nama siapa reservasinya Kak?',
        time: '14:20'
      },
      {
        sender: 'user',
        text: 'Nadia Putri',
        time: '14:21'
      },
      {
        sender: 'bot',
        text: '✨ *Reservasi Berhasil Terjadwal!*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ Booking ID: *#SLN-208*\n👤 Customer: *Kak Nadia Putri*\n💇‍♀️ Treatment: *Haircut + Creambath Spa*\n⏰ Waktu: *Hari ini, 16:00 WIB*\n💅 Stylist: *Senior Stylist Maya*\n📍 Lokasi: *Ayra Studio, Ruko Boulevard No. 8*\n━━━━━━━━━━━━━━━━━━━━\n_Sampai jumpa nanti sore Kak Nadia! Kursi & ruangan treatment sudah disiapkan._',
        time: '14:21',
        isConfirmed: true,
        bookingDetails: {
          clientName: 'Kak Nadia Putri',
          service: 'Haircut + Creambath Spa',
          time: 'Hari ini, 16:00 WIB',
          ticket: '#SLN-208',
          practice: 'Ayra Beauty Salon & Studio'
        }
      }
    ]
  },

  barber: {
    title: 'The Heritage Barbershop 💈',
    status: '+62 813-8899-0011 • Bisnis Terverifikasi • Online',
    chips: ['Halo bro, mau booking haircut jam 5 sore', 'Bro Kevin - Fade & Beard', 'Lihat Jadwal Barber'],
    messages: [
      {
        sender: 'user',
        text: 'Halo bro, mau booking gentleman haircut sore ini jam 17:00 bisa?',
        time: '14:30'
      },
      {
        sender: 'bot',
        text: 'Halo Bro! Selamat datang di *The Heritage Barbershop* 💈✂️\n\nUntuk sore ini jam 17:00 WIB kursi barber kami masih tersedia.\n\nPaket Tersedia:\n• *Gentleman Haircut & Styling* (±40 mnt)\n• *Beard Trim & Hot Towel Shave* (±20 mnt)\n\nBoleh info nama bro untuk pemesanan kursi?',
        time: '14:30'
      },
      {
        sender: 'user',
        text: 'Bro Kevin - Fade & Beard',
        time: '14:31'
      },
      {
        sender: 'bot',
        text: '💈 *Booking Berhasil Dikonfirmasi!*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ Booking ID: *#BRB-305*\n👤 Customer: *Bro Kevin*\n✂️ Layanan: *Gentleman Haircut & Shave*\n⏰ Waktu: *Hari ini, 17:00 WIB*\n💈 Barber: *Master Barber Rendi (Kursi #2)*\n📍 Lokasi: *The Heritage, Jl. Senopati No. 22*\n━━━━━━━━━━━━━━━━━━━━\n_Mohon hadir tepat waktu ya bro. Pengingat otomatis akan dikirim 30 menit sebelum jadwal._',
        time: '14:31',
        isConfirmed: true,
        bookingDetails: {
          clientName: 'Bro Kevin',
          service: 'Gentleman Haircut & Shave',
          time: 'Hari ini, 17:00 WIB',
          ticket: '#BRB-305',
          practice: 'The Heritage Barbershop'
        }
      }
    ]
  },

  spa: {
    title: 'Orchid Wellness & Spa Massage 🌿',
    status: '+62 811-3344-5566 • Bisnis Terverifikasi • Online',
    chips: ['Sore kak, reservasi massage 90m malam ini', 'Ibu Melati - Aromatherapy Spa', 'Menu Treatment'],
    messages: [
      {
        sender: 'user',
        text: 'Sore kak, mau tanya ada slot kosong untuk massage refleksi 90 menit nanti malam jam 19:00?',
        time: '15:10'
      },
      {
        sender: 'bot',
        text: 'Selamat sore Kak! Selamat datang di *Orchid Wellness & Spa* 🌿✨\n\nUntuk malam ini jam 19:00 WIB ruang private aromatherapy massage kami masih tersedia untuk 1 orang.\n\nPilihan Paket:\n• *Balinese Deep Tissue Massage (90m)*\n• *Aromatherapy Reflexology Spa (90m)*\n\nBoleh dibantu nama tamu untuk kami siapkan ruang relaksasinya Kak?',
        time: '15:10'
      },
      {
        sender: 'user',
        text: 'Ibu Melati - Aromatherapy Spa',
        time: '15:11'
      },
      {
        sender: 'bot',
        text: '🌿 *Reservasi Spa Berhasil Dikonfirmasi!*\n━━━━━━━━━━━━━━━━━━━━\n🏷️ Booking ID: *#SPA-412*\n👤 Tamu: *Ibu Melati*\n💆‍♀️ Treatment: *Aromatherapy Reflexology (90m)*\n⏰ Waktu: *Hari ini, 19:00 WIB*\n🕯️ Ruangan: *Private Suite Jasmine*\n📍 Lokasi: *Orchid Wellness, Lantai 2*\n━━━━━━━━━━━━━━━━━━━━\n_Minyak esensial hangat & herbal tea siap menyambut kehadiran Ibu Melati._',
        time: '15:11',
        isConfirmed: true,
        bookingDetails: {
          clientName: 'Ibu Melati',
          service: 'Aromatherapy Reflexology (90m)',
          time: 'Hari ini, 19:00 WIB',
          ticket: '#SPA-412',
          practice: 'Orchid Wellness & Spa'
        }
      }
    ]
  },

  general: {
    title: 'dr. Rian Sp.PD Praktek Mandiri 🩺',
    status: '+62 812-7788-9900 • Bisnis Terverifikasi • Online',
    chips: ['Sore dok, mau daftar periksa antrean', 'Ibu Siti Rahma - Demam Flu', 'Cek Status Antrean'],
    messages: [
      {
        sender: 'user',
        text: 'Sore dok, mau daftar periksa antrean sore ini keluhan demam dan flu.',
        time: '16:02'
      },
      {
        sender: 'bot',
        text: 'Selamat sore! Selamat datang di *Praktek Mandiri dr. Rian Sp.PD* 🩺\n\nSistem antrean berjalan sore ini:\n• Kuota Terisi: 7 / 25 Pasien\n• Saat Ini Melayani: *Antrean #04*\n\nSilakan ketik nama lengkap pasien yang akan diperiksa:',
        time: '16:02'
      },
      {
        sender: 'user',
        text: 'Ibu Siti Rahma - Demam Flu 3 Hari',
        time: '16:03'
      },
      {
        sender: 'bot',
        text: '🎟️ *TIKET ANTREAN RESMI: #08*\n━━━━━━━━━━━━━━━━━━━━\n👤 Pasien: *Ibu Siti Rahma*\n🩺 Dokter: *dr. Rian Sp.PD*\n🔢 Sisa antrean di depan: *3 pasien*\n⏳ Estimasi Masuk Periksa: *± 16:45 WIB*\n━━━━━━━━━━━━━━━━━━━━\n_WhatsApp akan mengirim notifikasi saat nomor #07 masuk periksa, jadi Ibu tidak perlu menunggu lama di ruang praktek._',
        time: '16:03',
        isConfirmed: true,
        bookingDetails: {
          clientName: 'Ibu Siti Rahma',
          service: 'Pemeriksaan Umum (Demam Flu)',
          time: 'Est. 16:45 WIB',
          ticket: '#08',
          practice: 'dr. Rian Sp.PD'
        }
      }
    ]
  }
};

// Initial messages for Doctor's Phone
const DOCTOR_INITIAL_MESSAGES = [
  {
    sender: 'system',
    text: '🔒 Sesi Asisten Bisnis & Praktek Aktif (Zero-Web) • Multi-Tenant WhatsApp\nNomor Terverifikasi Bisnis • Baileys Multi-Session Gateway Online',
    time: '16:00'
  },
  {
    sender: 'doctor',
    text: '📊 Dashboard & Insight hari ini',
    time: '16:00'
  },
  {
    sender: 'bot',
    text: 'Berikut rangkuman performa bisnis dan insight cerdas hari ini:',
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
    this.doctorSim = null;
  }

  setDoctorSim(doctorSim) {
    this.doctorSim = doctorSim;
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

        if (msg.isConfirmed && this.doctorSim) {
          this.doctorSim.notifyNewBooking(msg.bookingDetails);
        }
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
            text: `🔔 *Panggilan Berhasil Terkirim!*\n\n• Pasien Sekarang: *#${nextWaiting.id} (${nextWaiting.name})* dipanggil masuk ke Ruang Periksa.\n• Status: Diperbarui ke \`DALAM LAYANAN\`.\n• Standby Alert: Pasien antrean selanjutnya telah dikirimi pengingat untuk bersiap.`,
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

  notifyNewBooking(details) {
    if (!details) return;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setTimeout(() => {
      this.appendMessage({
        sender: 'system',
        text: `⚡ SYNC NOTIFIKASI REAL-TIME DARI NOMOR RESMI ${details.practice.toUpperCase()}`,
        time: now
      });
      this.appendMessage({
        sender: 'bot',
        text: `🔔 *BOOKING BARU DITERIMA!*\n━━━━━━━━━━━━━━━━━━━━\n👤 Pasien/Klien: *${details.clientName}*\n📋 Layanan: *${details.service}*\n⏰ Waktu: *${details.time}*\n🏷️ No. Tiket: *${details.ticket}*\n━━━━━━━━━━━━━━━━━━━━\n✅ _Jadwal otomatis tersimpan di kalender & database tanpa perlu input manual._`,
        time: now
      });
      sfx.playPop();
    }, 1200);
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
// --- Mayar.id Payment & Bot Activation Modal (3-Step Flow) ---
class MayarPaymentModal {
  constructor() {
    this.modal = document.getElementById('mayarModal');
    this.closeBtn = document.getElementById('closeMayarModal');
    
    // Steps
    this.step1 = document.getElementById('mayarStep1Package');
    this.step2 = document.getElementById('mayarStep2Info');
    this.step3 = document.getElementById('mayarStep3Qr');

    // Step 1: Package & Coupon
    this.planNameEl = document.getElementById('modalPlanName');
    this.planAmountEl = document.getElementById('modalPlanAmount');
    this.planDurationEl = document.getElementById('modalPlanDuration');
    this.invoiceNumberEl = document.getElementById('modalInvoiceNo');
    this.couponInput = document.getElementById('couponCodeInput');
    this.applyCouponBtn = document.getElementById('btnApplyCoupon');
    this.couponStatusMsg = document.getElementById('couponStatusMsg');
    this.btnMayarNext = document.getElementById('btnMayarNext');

    // Step 2: Info Form
    this.infoForm = document.getElementById('mayarInfoForm');
    this.bizNameInput = document.getElementById('mayarBizName');
    this.bizCategoryInput = document.getElementById('mayarBizCategory');
    this.ownerNameInput = document.getElementById('mayarOwnerName');
    this.bizPhoneInput = document.getElementById('mayarBizPhone');
    this.bizEmailInput = document.getElementById('mayarBizEmail');
    this.btnSubmitMayarInfo = document.getElementById('btnSubmitMayarInfo');
    this.btnBackToStep1 = document.getElementById('btnBackToStep1');

    // Step 3: QR & Email
    this.qrImg = document.getElementById('baileysModalQrImg');
    this.qrStatus = document.getElementById('baileysModalQrStatus');
    this.qrSubtitle = document.getElementById('mayarQrSubtitle');
    this.btnCloseAndSendEmailBtn = document.getElementById('btnCloseAndSendEmailBtn');
    this.btnOpenConnectTab = document.getElementById('btnOpenConnectTab');

    // State
    this.activeCoupon = null;
    this.originalPrice = 'Rp 199.000';
    this.pollInterval = null;
    this.currentEmail = '';
    this.currentPhone = '';
    this.currentBizName = '';
    this.currentToken = '';
  }

  init() {
    document.querySelectorAll('[data-buy-plan]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.currentTarget.dataset.buyPlan;
        // FREE plan goes to the registration/trial modal, not the payment modal
        if (plan === 'FREE') {
          const trialModalEl = document.getElementById('trialModal');
          if (trialModalEl) {
            // Reset the trial modal to its form view
            const formContainer = document.getElementById('trialFormContainer');
            const successView = document.getElementById('trialSuccessView');
            const submitBtn = document.getElementById('trialSubmitBtn');
            const couponInput = document.getElementById('trialCouponCode');
            const couponAlert = document.getElementById('trialCouponAlert');
            if (formContainer) formContainer.style.display = 'block';
            if (successView) successView.style.display = 'none';
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>🚀 Aktifkan Paket Free &amp; Scan WhatsApp Sekarang →</span>'; }
            if (couponInput) couponInput.value = '';
            if (couponAlert) couponAlert.style.display = 'none';
            trialModalEl.classList.add('active');
          }
          return;
        }
        this.open(plan);
      });
    });

    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Step 1: Apply Coupon Code
    if (this.applyCouponBtn) {
      this.applyCouponBtn.addEventListener('click', () => this.applyCoupon());
    }
    if (this.couponInput) {
      this.couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.applyCoupon();
        }
      });
    }

    // Step 1 -> Step 2 (Next Button)
    if (this.btnMayarNext) {
      this.btnMayarNext.addEventListener('click', () => {
        this.goToStep2();
      });
    }

    // Step 2 -> Step 1 (Back Button)
    if (this.btnBackToStep1) {
      this.btnBackToStep1.addEventListener('click', () => {
        this.goToStep1();
      });
    }

    // Step 2 Form Submit -> Generate 1 QR untuk 1 Nomor
    if (this.infoForm) {
      this.infoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitBusinessInfo();
      });
    }

    // Step 3: Tutup dan Kirim QR ke Email
    if (this.btnCloseAndSendEmailBtn) {
      this.btnCloseAndSendEmailBtn.addEventListener('click', async () => {
        await this.sendQrToEmailAndClose();
      });
    }
  }

  async applyCoupon() {
    const raw = (this.couponInput ? this.couponInput.value : '').trim().toUpperCase();
    if (!raw) {
      this.showCouponMsg('Masukkan kode kupon terlebih dahulu.', '#ef4444', '#fee2e2');
      return;
    }

    // Normalize coupon aliases
    let code = raw;
    if (code === 'LIFETIMEFREE' || code === 'PILOTLIFETIME') code = 'LIFETIMEFREE';
    if (code === 'FREEPRO' || code === 'FREEPRO1M' || code === 'PILOTPRO') code = 'FREEPRO';

    try {
      const resp = await fetch(`/api/subscriptions/coupon-check?coupon=${encodeURIComponent(code)}`);
      const data = await resp.json();

      if (!resp.ok || !data.valid) {
        this.showCouponMsg(data.error || '❌ Kode kupon tidak valid. Gunakan kupon resmi: <strong>lifetimefree</strong> (3 nomor) atau <strong>freepro</strong> (5 bot).', '#b91c1c', '#fee2e2');
        return;
      }

      if (data.is_full) {
        this.showCouponMsg(`⚠️ Kuota kupon <strong>${data.coupon}</strong> telah habis (${data.quota_used}/${data.max_capacity} nomor terdaftar).`, '#b45309', '#fef3c7');
        return;
      }

      this.activeCoupon = code;
      const label = code === 'LIFETIMEFREE' ? 'LIFETIME PARTNER SELAMANYA' : 'PRO TIER 1 BULAN';

      // Update Plan Price to Rp 0
      this.planAmountEl.innerHTML = `<span style="text-decoration:line-through; color:#94a3b8; font-size:0.95rem; margin-right:6px;">${this.originalPrice}</span> <span style="color:#008767; font-weight:800;">Rp 0 (${label})</span>`;
      
      this.showCouponMsg(`🎉 Kupon <strong>${code}</strong> valid! ${data.label} (Sisa kuota: ${data.quota_remaining} nomor). Mayar.id dilewati (100% Free).`, '#15803d', '#dcfce7');
      if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();
    } catch (err) {
      console.warn('Coupon check error:', err);
      // Fallback local check
      if (code === 'LIFETIMEFREE' || code === 'FREEPRO') {
        this.activeCoupon = code;
        this.planAmountEl.innerHTML = `<span style="text-decoration:line-through; color:#94a3b8; font-size:0.95rem; margin-right:6px;">${this.originalPrice}</span> <span style="color:#008767; font-weight:800;">Rp 0 (GRATIS)</span>`;
        this.showCouponMsg(`🎉 Kupon <strong>${code}</strong> berhasil diterapkan! Mayar.id dilewati.`, '#15803d', '#dcfce7');
      }
    }
  }

  showCouponMsg(html, color, bg) {
    if (this.couponStatusMsg) {
      this.couponStatusMsg.style.display = 'block';
      this.couponStatusMsg.style.color = color;
      this.couponStatusMsg.style.background = bg || '#f8fafc';
      this.couponStatusMsg.style.border = `1px solid ${color}40`;
      this.couponStatusMsg.innerHTML = html;
    }
  }

  goToStep1() {
    if (this.step1) this.step1.style.display = 'block';
    if (this.step2) this.step2.style.display = 'none';
    if (this.step3) this.step3.style.display = 'none';
  }

  goToStep2() {
    if (this.step1) this.step1.style.display = 'none';
    if (this.step2) this.step2.style.display = 'block';
    if (this.step3) this.step3.style.display = 'none';
    if (this.bizNameInput) this.bizNameInput.focus();
  }

  async submitBusinessInfo() {
    const bizName = (this.bizNameInput ? this.bizNameInput.value : '').trim();
    const category = (this.bizCategoryInput ? this.bizCategoryInput.value : 'GENERAL');
    const ownerName = (this.ownerNameInput ? this.ownerNameInput.value : '').trim();
    const phone = (this.bizPhoneInput ? this.bizPhoneInput.value : '').trim();
    const email = (this.bizEmailInput ? this.bizEmailInput.value : '').trim();

    if (!bizName) {
      alert('Mohon masukkan nama bisnis / klinik / salon Anda.');
      this.bizNameInput?.focus();
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('Mohon masukkan nomor WhatsApp bisnis yang valid (minimal 9 digit).');
      this.bizPhoneInput?.focus();
      return;
    }

    if (!email || !email.includes('@')) {
      alert('Mohon masukkan alamat email yang valid untuk pengiriman QR Code.');
      this.bizEmailInput?.focus();
      return;
    }

    if (this.btnSubmitMayarInfo) {
      this.btnSubmitMayarInfo.disabled = true;
      this.btnSubmitMayarInfo.innerHTML = '⏳ Menyiapkan 1 QR WhatsApp...';
    }

    try {
      let resp, data;
      // If coupon is active or user redeemed lifetimefree/freepro
      if (this.activeCoupon) {
        resp = await fetch('/api/subscriptions/redeem-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupon: this.activeCoupon,
            business_name: bizName,
            name: ownerName,
            category: category,
            phone: cleanPhone,
            email: email
          })
        });
      } else {
        // Standard trial / registration flow
        resp = await fetch('/api/trial/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name: bizName,
            owner_name: ownerName,
            category: category,
            phone: cleanPhone,
            email: email
          })
        });
      }

      data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyiapkan pendaftaran WhatsApp.');
      }

      if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();

      // Save state for email dispatch
      this.currentEmail = email;
      this.currentPhone = cleanPhone;
      this.currentBizName = bizName;
      this.currentToken = data.connect_url ? data.connect_url.split('token=')[1] : '';

      // Transition to Step 3: QR Code
      this.showStep3Qr(data, cleanPhone, bizName);

    } catch (err) {
      alert(`⚠️ Pendaftaran gagal: ${err.message}`);
      if (this.btnSubmitMayarInfo) {
        this.btnSubmitMayarInfo.disabled = false;
        this.btnSubmitMayarInfo.innerHTML = '<span>Lanjut / Next (Generate QR WhatsApp) →</span>';
      }
    }
  }

  showStep3Qr(data, phone, bizName) {
    if (this.step1) this.step1.style.display = 'none';
    if (this.step2) this.step2.style.display = 'none';
    if (this.step3) this.step3.style.display = 'block';

    if (this.qrSubtitle) {
      this.qrSubtitle.textContent = `Pindai kode QR di bawah dengan aplikasi WhatsApp di ponsel ${phone} (${bizName}) untuk mengaktifkan bot.`;
    }

    if (this.qrImg) {
      // Use live QR image generated for 1 number
      if (data.qr_image) {
        this.qrImg.src = data.qr_image;
      } else {
        // Fallback quick QR
        this.qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.connect_url || 'https://praktika.id')}`;
      }
    }

    if (this.btnOpenConnectTab) {
      this.btnOpenConnectTab.href = data.connect_url || '#';
    }

    // Start status polling
    this.startStatusPolling(data.connect_url);
  }

  startStatusPolling(connectUrl) {
    if (this.pollInterval) clearInterval(this.pollInterval);
    const token = this.currentToken;
    if (!token) return;

    this.pollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/connect/status?token=${encodeURIComponent(token)}`);
        if (!resp.ok) return;
        const statusData = await resp.json();
        
        if (statusData.status === 'CONNECTED') {
          clearInterval(this.pollInterval);
          if (this.qrStatus) {
            this.qrStatus.innerHTML = '<span>✅ WhatsApp Berhasil Terhubung! Bot Siap Menjawab Chat 24/7! 🎉</span>';
            this.qrStatus.style.color = '#15803d';
          }
          if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();
        } else if (statusData.qr_image && this.qrImg) {
          this.qrImg.src = statusData.qr_image;
        }
      } catch (e) {}
    }, 3000);
  }

  async sendQrToEmailAndClose() {
    if (!this.currentEmail) {
      this.close();
      return;
    }

    if (this.btnCloseAndSendEmailBtn) {
      this.btnCloseAndSendEmailBtn.disabled = true;
      this.btnCloseAndSendEmailBtn.textContent = '⏳ Mengirim QR ke Email...';
    }

    try {
      const resp = await fetch('/api/subscriptions/send-qr-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.currentEmail,
          phone: this.currentPhone,
          business_name: this.currentBizName,
          token: this.currentToken
        })
      });
      const data = await resp.json();

      if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();
      alert(`✅ ${data.message || `QR Code dan tautan aktivasi WhatsApp berhasil dikirim ke ${this.currentEmail}!`}\n\nAnda dapat menutup halaman ini dan memindai QR code kapan saja melalui ponsel.`);
      this.close();
    } catch (err) {
      alert(`✅ Tautan sinkronisasi WhatsApp Anda telah siap. Informasi aktivasi dikirimkan ke ${this.currentEmail}.`);
      this.close();
    }
  }

  open(planKey) {
    const plans = {
      STARTER: { name: 'Starter Monthly', price: 'Rp 99.000', duration: '30 Hari' },
      PRO: { name: 'Pro Monthly (Rekomendasi)', price: 'Rp 199.000', duration: '30 Hari' },
      CLINIC: { name: 'Clinic / Multi-Staff', price: 'Rp 349.000', duration: '30 Hari' }
    };

    const target = plans[planKey] || plans.PRO;
    const invNo = 'INV-MYR-' + Math.floor(100000 + Math.random() * 900000);

    this.originalPrice = target.price;
    if (this.planNameEl) this.planNameEl.textContent = target.name;
    if (this.planAmountEl) this.planAmountEl.textContent = target.price;
    if (this.planDurationEl) this.planDurationEl.textContent = target.duration;
    if (this.invoiceNumberEl) this.invoiceNumberEl.textContent = invNo;

    // Reset flow state
    this.activeCoupon = null;
    this.currentEmail = '';
    this.currentPhone = '';
    this.currentBizName = '';
    this.currentToken = '';
    if (this.pollInterval) clearInterval(this.pollInterval);

    if (this.couponInput) this.couponInput.value = '';
    if (this.couponStatusMsg) {
      this.couponStatusMsg.style.display = 'none';
      this.couponStatusMsg.innerHTML = '';
    }

    if (this.btnSubmitMayarInfo) {
      this.btnSubmitMayarInfo.disabled = false;
      this.btnSubmitMayarInfo.innerHTML = '<span>Lanjut / Next (Generate QR WhatsApp) →</span>';
    }

    if (this.btnCloseAndSendEmailBtn) {
      this.btnCloseAndSendEmailBtn.disabled = false;
      this.btnCloseAndSendEmailBtn.textContent = '✉️ Tutup dan Kirim QR ke Email';
    }

    // Always start at Step 1 (NO QR CODE initially!)
    this.goToStep1();

    this.modal.classList.add('active');
  }

  close() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.modal) this.modal.classList.remove('active');
  }
}

// --- 30-Day Free Trial Modal ---
class FreeTrialModal {
  constructor() {
    this.modal = document.getElementById('trialModal');
    this.closeBtn = document.getElementById('closeTrialModal');
    this.form = document.getElementById('trialForm');
    this.formContainer = document.getElementById('trialFormContainer');
    this.successView = document.getElementById('trialSuccessView');
    this.submitBtn = document.getElementById('trialSubmitBtn');
    this.couponInput = document.getElementById('trialCouponCode');
    this.couponAlert = document.getElementById('trialCouponAlert');
    this.connectActionBtn = document.getElementById('trialConnectActionBtn');
    this.copyLinkBtn = document.getElementById('trialCopyLinkBtn');
    this.currentWaLink = '';
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

    // Live interactive coupon feedback
    if (this.couponInput) {
      this.couponInput.addEventListener('input', () => {
        const val = this.couponInput.value.trim().toUpperCase();
        if (val === 'PILOTPRO' || val === 'FREEPRO') {
          if (this.couponAlert) {
            this.couponAlert.style.display = 'block';
            this.couponAlert.style.color = '#15803d';
            this.couponAlert.style.background = '#dcfce7';
            this.couponAlert.style.borderColor = '#86efac';
            this.couponAlert.innerHTML = 'Kupon Valid: Upgrade ke Paket PRO (1 Tahun Penuh) aktif.';
          }
          if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();
        } else if (val === 'PILOTLIFETIME' || val === 'LIFETIMEFREE') {
          if (this.couponAlert) {
            this.couponAlert.style.display = 'block';
            this.couponAlert.style.color = '#15803d';
            this.couponAlert.style.background = '#dcfce7';
            this.couponAlert.style.borderColor = '#86efac';
            this.couponAlert.innerHTML = 'Kupon Valid: Akses Lifetime Partner (Unlimited Booking) aktif.';
          }
          if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();
        } else if (val.length > 3) {
          if (this.couponAlert) {
            this.couponAlert.style.display = 'block';
            this.couponAlert.style.color = '#b91c1c';
            this.couponAlert.style.background = '#fee2e2';
            this.couponAlert.style.borderColor = '#fca5a5';
            this.couponAlert.innerHTML = 'Kode kupon tidak valid. Pendaftaran tetap dapat dilanjutkan dengan paket Free 25 booking.';
          }
        } else {
          if (this.couponAlert) this.couponAlert.style.display = 'none';
        }
      });
    }

    // Copy deep-link button handler
    if (this.copyLinkBtn) {
      this.copyLinkBtn.addEventListener('click', () => {
        if (!this.currentWaLink) return;
        navigator.clipboard.writeText(this.currentWaLink).then(() => {
          this.copyLinkBtn.textContent = '✅ Link Reservasi Berhasil Disalin!';
          setTimeout(() => {
            this.copyLinkBtn.textContent = '📋 Salin Link WhatsApp Reservasi Pasien';
          }, 2500);
        }).catch(() => {
          alert(`Link reservasi: ${this.currentWaLink}`);
        });
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docName = (document.getElementById('trialDocName')?.value || '').trim();
        const clinicName = (document.getElementById('trialClinicName')?.value || '').trim();
        const category = document.getElementById('trialCategory')?.value || 'GENERAL';
        const phone = (document.getElementById('trialPhone')?.value || '').trim();
        const coupon = (this.couponInput?.value || '').trim().toUpperCase();

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 9) {
          alert('Mohon masukkan nomor WhatsApp bisnis yang valid (minimal 9 digit).');
          document.getElementById('trialPhone')?.focus();
          return;
        }

        if (this.submitBtn) {
          this.submitBtn.disabled = true;
          this.submitBtn.innerHTML = 'Menyiapkan Akun &amp; QR WhatsApp...';
        }

        try {
          const resp = await fetch('/api/trial/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              business_name: clinicName,
              owner_name: docName,
              category: category,
              phone: cleanPhone,
              coupon: coupon
            })
          });

          const data = await resp.json();
          if (!resp.ok || !data.success) {
            throw new Error(data.error || 'Gagal mendaftarkan uji coba.');
          }

          if (typeof sfx !== 'undefined' && sfx.playPop) sfx.playPop();

          // Smoothly reveal Celebration Screen
          if (this.formContainer) this.formContainer.style.display = 'none';
          if (this.successView) this.successView.style.display = 'block';

          const titleEl = document.getElementById('trialSuccessTitle');
          if (titleEl) {
            titleEl.textContent = `Selamat, ${docName || 'Partner'}! Bot ${clinicName} Aktif`;
          }

          const bizNameEl = document.getElementById('trialSummaryBizName');
          if (bizNameEl) bizNameEl.textContent = data.tenant.name;

          const phoneEl = document.getElementById('trialSummaryPhone');
          if (phoneEl) phoneEl.textContent = data.tenant.owner_phone;

          const planEl = document.getElementById('trialSummaryPlan');
          if (planEl) planEl.textContent = data.label;

          this.currentWaLink = data.wa_deeplink || `https://wa.me/${cleanPhone}`;

          if (this.connectActionBtn) {
            this.connectActionBtn.href = data.connect_url;
          }
        } catch (err) {
          alert(`Pendaftaran gagal: ${err.message}`);
          if (this.submitBtn) {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = '<span>Aktifkan Paket Free &amp; Scan WhatsApp Sekarang →</span>';
          }
        }
      });
    }
  }

  open() {
    // Reset to initial screen
    if (this.formContainer) this.formContainer.style.display = 'block';
    if (this.successView) this.successView.style.display = 'none';
    if (this.couponAlert) this.couponAlert.style.display = 'none';
    if (this.submitBtn) {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = '<span>Aktifkan Paket Free &amp; Scan WhatsApp Sekarang →</span>';
    }
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

// --- Day & Night Theme Engine ---
class ThemeEngine {
  constructor() {
    this.btn = document.getElementById('btnThemeToggle');
    this.iconEl = document.getElementById('themeIcon');
    this.labelEl = document.getElementById('themeLabel');
  }

  init() {
    const saved = localStorage.getItem('praktika_theme') || localStorage.getItem('praktika_admin_theme');
    let theme = saved;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
    }
    this.apply(theme);

    if (this.btn) {
      this.btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'day';
        const next = (cur === 'night' || cur === 'dark') ? 'day' : 'night';
        this.apply(next);
      });
    }
  }

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('praktika_theme', theme);
    localStorage.setItem('praktika_admin_theme', theme);

    const isNight = (theme === 'night' || theme === 'dark');

    // Update browser-level color-scheme so native controls (scrollbars, inputs) match
    document.documentElement.style.colorScheme = isNight ? 'dark' : 'light';

    if (this.iconEl) this.iconEl.textContent = isNight ? '🌙' : '☀️';
    if (this.labelEl) this.labelEl.textContent = isNight ? 'Night' : 'Day';
    if (this.btn) {
      this.btn.title = isNight ? 'Beralih ke Day Mode (Terang)' : 'Beralih ke Night Mode (Gelap)';
      // Trigger icon pop animation
      this.iconEl && this.iconEl.animate(
        [{ transform: 'scale(0.6) rotate(-30deg)' }, { transform: 'scale(1.2) rotate(10deg)' }, { transform: 'scale(1) rotate(0deg)' }],
        { duration: 380, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
    }
  }
}

// --- Application Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  const theme = new ThemeEngine();
  theme.init();

  const patientSim = new PatientSimulator();
  patientSim.init();

  const doctorSim = new DoctorCopilotSimulator(patientSim);
  doctorSim.init();
  patientSim.setDoctorSim(doctorSim);

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
