/**
 * WHATSAPP INGRESS ROUTER
 * PRD Section 3: Multi-tenant Routing, Doctor Whitelist, Deep-link Slug Parser
 */

class IngressRouter {
  constructor({ db, doctorCopilot, tierGating, rescheduleService }) {
    this.db = db;
    this.doctorCopilot = doctorCopilot;
    this.tierGating = tierGating;
    this.rescheduleService = rescheduleService;
  }

  /**
   * Resolve tenant by doctor phone number (Whitelist routing)
   */
  normalizePhone(phone) {
    if (!phone) return '';
    let clean = phone.toString().replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '62' + clean;
    return clean;
  }

  resolveDoctorTenant(senderPhone) {
    const cleanPhone = this.normalizePhone(senderPhone);
    for (const tenant of this.db.tenants.values()) {
      const cleanOwner = this.normalizePhone(tenant.owner_phone);
      const cleanBot = this.normalizePhone(tenant.whatsapp_connected_phone);
      if (cleanOwner === cleanPhone || cleanBot === cleanPhone) {
        return tenant;
      }
    }
    return null;
  }

  /**
   * Route incoming WhatsApp message
   * @param {Object} message Baileys-compatible message object
   * @param {string} message.from e.g. "6281299887766@s.whatsapp.net"
   * @param {string} message.text e.g. "NEXT" or "BOOK_drg_maya" or "Halo Dok"
   * @param {string} [message.tenant_slug] Optional explicit tenant slug
   */
  async routeMessage({ from, text, tenant_slug }) {
    // Defense-in-depth: Never route messages originating from group chats, newsletters, or broadcasts
    if (!from || from.includes('@g.us') || from.includes('@newsletter') || from.includes('@broadcast')) {
      return null;
    }
    const cleanPhone = (from || '').replace(/@.*$/, '').replace(/\D/g, '');
    const cleanText = (text || '').trim();

    // 1. DOCTOR WHITLELIST ROUTING
    const doctorTenant = this.resolveDoctorTenant(cleanPhone);
    if (doctorTenant) {
      // Doctor is sending a message -> pass to Doctor Copilot
      const copilotResponse = await this.doctorCopilot.handleCommand({
        tenantId: doctorTenant.id,
        commandText: cleanText,
        doctorPhone: doctorTenant.owner_phone
      });

      return {
        recipient_type: 'DOCTOR',
        tenant: doctorTenant,
        response_type: 'TEXT',
        message: copilotResponse.reply,
        metadata: copilotResponse
      };
    }

    // 2. PATIENT INGRESS ROUTING
    // Check if deep link slug format: BOOK_{slug} or Jadwal_{slug}
    let targetTenant = null;
    let commandBody = cleanText;

    const slugMatch = cleanText.match(/^(?:BOOK|JADWAL|INFO)_([a-zA-Z0-9_-]+)/i);
    if (slugMatch) {
      const slug = slugMatch[1].toLowerCase();
      targetTenant = this.db.getTenantBySlug(slug);
      commandBody = 'MENU';
    } else if (tenant_slug) {
      targetTenant = this.db.getTenantBySlug(tenant_slug);
    } else {
      // Look up patient session if exists
      const session = this.db.getSession(cleanPhone);
      if (session && session.tenant_id) {
        targetTenant = this.db.tenants.get(session.tenant_id);
      }
    }

    if (!targetTenant) {
      // Unknown practice slug
      return {
        recipient_type: 'PATIENT',
        response_type: 'TEXT',
        message: [
          `👋 Halo! Terima kasih telah menghubungi layanan asisten praktek medis.`,
          `Silakan buka tautan praktek dokter Anda (contoh: wa.me/.../?text=BOOK_drg_maya) untuk memulai pendaftaran langsung.`
        ].join('\n')
      };
    }

    // Save/update session preserving existing state
    const priorSession = this.db.getSession(cleanPhone) || {};
    this.db.saveSession(cleanPhone, {
      ...priorSession,
      tenant_id: targetTenant.id,
      last_activity: new Date().toISOString()
    });

    // Check if practice subscription has expired
    if (targetTenant.subscription_until && new Date(targetTenant.subscription_until) < new Date()) {
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        response_type: 'TEXT',
        message: `Mohon maaf, layanan pendaftaran otomatis *${targetTenant.name}* sedang dalam masa tenggang (langganan berakhir). Silakan hubungi nomor klinik secara langsung.`
      };
    }

    // Check if practice is accepting patients
    if (!targetTenant.is_accepting_patients) {
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        response_type: 'TEXT',
        message: `Mohon maaf, *${targetTenant.name}* sedang tidak menerima pendaftaran baru saat ini (istirahat / kuota harian terpenuhi). Silakan coba beberapa saat lagi.`
      };
    }

    // Check Monthly Quota for Tenant
    try {
      this.tierGating.assertBookingQuotaAvailable(targetTenant.id);
    } catch (quotaErr) {
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        response_type: 'TEXT',
        message: `Mohon maaf, sistem reservasi digital *${targetTenant.name}* sedang dalam pemeliharaan kapasitas bulanan. Silakan hubungi nomor klinik secara langsung.`
      };
    }

    // Check Reschedule intent:
    // Supports:
    // 1. RESCHEDULE_<appointment_id>
    // 2. RESCHEDULE_<nama lengkap> or RESCHEDULE <nama lengkap>
    // 3. RESCHEDULE (plain, auto-detect active appointment by phone)
    // 4. UBAH JADWAL or GANTI JADWAL
    const isRescheduleIntent = /^(?:RESCHEDULE|UBAH JADWAL|GANTI JADWAL)(?:[_\s]+(.+))?$/i.test(cleanText);
    if (isRescheduleIntent) {
      const match = cleanText.match(/^(?:RESCHEDULE|UBAH JADWAL|GANTI JADWAL)(?:[_\s]+(.+))?$/i);
      const param = (match && match[1] ? match[1].trim() : '');

      let targetAppt = null;

      // A. If param is an exact appointment ID
      if (param && this.db.appointments.has(param)) {
        targetAppt = this.db.appointments.get(param);
      }

      // B. If param is a name, look for active appointment with that name
      if (!targetAppt && param) {
        const cleanParam = param.toLowerCase();
        for (const apt of this.db.appointments.values()) {
          if (apt.tenant_id === targetTenant.id && (apt.status === 'CONFIRMED' || apt.status === 'IN_CONSULTATION')) {
            if (apt.customer_name.toLowerCase().includes(cleanParam) || cleanParam.includes(apt.customer_name.toLowerCase())) {
              targetAppt = apt;
              break;
            }
          }
        }
      }

      // C. Look up active appointment for this sender phone number
      if (!targetAppt) {
        const activeCheck = this.db.checkCustomerActiveSlot(targetTenant.id, cleanPhone);
        if (activeCheck) {
          targetAppt = activeCheck.appointment;
        }
      }

      // D. Fallback search by phone
      if (!targetAppt) {
        for (const apt of this.db.appointments.values()) {
          if (apt.tenant_id === targetTenant.id && (apt.status === 'CONFIRMED' || apt.status === 'IN_CONSULTATION')) {
            if (apt.customer_phone.replace(/\D/g, '') === cleanPhone) {
              targetAppt = apt;
              break;
            }
          }
        }
      }

      if (!targetAppt) {
        return {
          recipient_type: 'PATIENT',
          tenant: targetTenant,
          response_type: 'TEXT',
          message: `Tidak ditemukan reservasi aktif atas nomor Anda di *${targetTenant.name}*.\n\nUntuk membuat reservasi baru, silakan ketik *Nama Lengkap <spasi> Nomor Layanan* (contoh: *Budi Santoso 1*).`
        };
      }

      this.db.saveSession(cleanPhone, {
        tenant_id: targetTenant.id,
        step: 'AWAITING_RESCHEDULE_TIME',
        target_reschedule_id: targetAppt.id,
        last_activity: new Date().toISOString()
      });

      const svc = targetAppt.service_id ? this.db.services.get(targetAppt.service_id) : null;
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        action: 'PROMPT_RESCHEDULE_SLOT',
        appointment_id: targetAppt.id,
        message: [
          `📅 *UBAH JADWAL RESERVASI*`,
          `----------------------------------------`,
          `👤 *Pasien:* ${targetAppt.customer_name}`,
          `📋 *Layanan:* ${svc ? svc.name : 'Pemeriksaan'}`,
          `⏰ *Jadwal Saat Ini:* ${this.formatIndoDateTime(targetAppt.start_time)}`,
          `----------------------------------------`,
          `Silakan balas dengan waktu baru yang Anda inginkan.`,
          `Contoh:`,
          `• *Besok jam 14:00*`,
          `• *2026-10-05 10:00*`,
          `• Atau ketik *BATAL* untuk membatalkan.`
        ].join('\n')
      };
    }

    // Cancel / Reset intent
    if (['BATAL', 'CANCEL', 'RESET'].includes(cleanText.toUpperCase())) {
      this.db.saveSession(cleanPhone, {
        tenant_id: targetTenant.id,
        step: null,
        selected_service_id: null,
        last_activity: new Date().toISOString()
      });
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        response_type: 'TEXT',
        message: `Sesi reservasi telah dibatalkan. Silakan kirim pesan kapan saja untuk melihat menu layanan kembali.`
      };
    }

    const services = this.db.getServicesByTenant(targetTenant.id);
    const existingSession = this.db.getSession(cleanPhone) || {};

    // Handle in-progress Reschedule
    if (existingSession.step === 'AWAITING_RESCHEDULE_TIME' && existingSession.target_reschedule_id) {
      const parsedTime = this.parseDateString(cleanText);
      if (parsedTime) {
        try {
          const reschedResult = await this.rescheduleService.rescheduleAppointment({
            tenantId: targetTenant.id,
            appointmentId: existingSession.target_reschedule_id,
            newStartTime: parsedTime,
            customerPhone: cleanPhone
          });
          const updatedAppt = reschedResult.new_appointment || reschedResult.newAppointment;
          this.db.saveSession(cleanPhone, { ...existingSession, step: null, target_reschedule_id: null });
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'CONFIRMATION',
            message: [
              `✅ *JADWAL BERHASIL DIUBAH!*`,
              `----------------------------------------`,
              `🏥 *Klinik:* ${targetTenant.name}`,
              `⏰ *Waktu Baru:* ${this.formatIndoDateTime(updatedAppt.start_time)}`,
              `📌 *Kode Booking:* #${updatedAppt.id.slice(-8).toUpperCase()}`,
              `----------------------------------------`,
              `Terima kasih! Sampai jumpa di jadwal yang baru.`
            ].join('\n')
          };
        } catch (reschedErr) {
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'TEXT',
            message: `⚠️ Gagal mengubah jadwal: ${reschedErr.message}. Silakan coba jam lain atau ketik BATAL.`
          };
        }
      }
    }

    // --- CONVERSATIONAL BOOKING PARSER ---
    let customerName = null;
    let selectedService = null;

    // Pattern 1: Step AWAITING_NAME (Patient already picked service, now sending their name)
    if (existingSession.step === 'AWAITING_NAME' && existingSession.selected_service_id) {
      if (cleanText.length >= 2 && !/^[0-9]+$/.test(cleanText)) {
        customerName = cleanText.trim();
        selectedService = services.find(s => s.id === existingSession.selected_service_id);
      }
    }

    // Pattern 2: "Nama Lengkap <spasi> Nomor Index" (Contoh: "Budi Santoso 1" atau "Budi 2")
    const matchNameNum = cleanText.match(/^([a-zA-Z\s'.]{2,})\s+([1-9])$/);
    if (matchNameNum && !customerName) {
      const idx = parseInt(matchNameNum[2], 10);
      if (services[idx - 1]) {
        customerName = matchNameNum[1].trim();
        selectedService = services[idx - 1];
      }
    }

    // Pattern 3: "Nomor Index <spasi> Nama Lengkap" (Contoh: "1 Budi Santoso")
    const matchNumName = cleanText.match(/^([1-9])\s+([a-zA-Z\s'.]{2,})$/);
    if (matchNumName && !customerName) {
      const idx = parseInt(matchNumName[1], 10);
      if (services[idx - 1]) {
        customerName = matchNumName[2].trim();
        selectedService = services[idx - 1];
      }
    }

    // Pattern 4: "DAFTAR / BOOK / PESAN <Nama> <Nomor>"
    const matchCmd = cleanText.match(/^(?:DAFTAR|BOOK|PESAN)\s+([a-zA-Z\s'.]{2,})\s+([1-9])/i);
    if (matchCmd && !customerName) {
      const idx = parseInt(matchCmd[2], 10);
      if (services[idx - 1]) {
        customerName = matchCmd[1].trim();
        selectedService = services[idx - 1];
      }
    }

    // Pattern 5: Hanya kirim Nomor Layanan saja (Contoh: "1")
    const matchSingleNum = cleanText.match(/^([1-9])$/);
    if (matchSingleNum && !customerName) {
      const idx = parseInt(matchSingleNum[1], 10);
      if (services[idx - 1]) {
        const s = services[idx - 1];
        this.db.saveSession(cleanPhone, {
          ...existingSession,
          tenant_id: targetTenant.id,
          step: 'AWAITING_NAME',
          selected_service_id: s.id,
          last_activity: new Date().toISOString()
        });
        return {
          recipient_type: 'PATIENT',
          tenant: targetTenant,
          response_type: 'TEXT',
          message: [
            `👍 Anda memilih layanan: *${s.name}*`,
            `⏱️ Durasi: ${s.duration_minutes} menit | 💳 Rp ${s.price.toLocaleString('id-ID')}`,
            `----------------------------------------`,
            `Silakan balas pesan ini dengan *Nama Lengkap* Anda untuk konfirmasi jadwal.`
          ].join('\n')
        };
      }
    }

    // IF CUSTOMER NAME & SERVICE ARE IDENTIFIED -> EXECUTE BOOKING
    if (customerName && selectedService) {
      // 1. Check if patient already has an active slot
      const activeCheck = this.db.checkCustomerActiveSlot(targetTenant.id, cleanPhone);
      if (activeCheck) {
        const exist = activeCheck.appointment;
        return {
          recipient_type: 'PATIENT',
          tenant: targetTenant,
          response_type: 'TEXT',
          message: [
            `⚠️ *ANDA SUDAH MEMILIKI RESERVASI AKTIF*`,
            `----------------------------------------`,
            `📌 *Kode:* #${exist.id.slice(-8).toUpperCase()}`,
            `👤 *Nama:* ${exist.customer_name}`,
            `⏰ *Waktu:* ${this.formatIndoDateTime(exist.start_time)}`,
            `----------------------------------------`,
            `Untuk mengubah waktu, balas dengan:`,
            `*RESCHEDULE* atau *RESCHEDULE_${exist.customer_name}*`
          ].join('\n')
        };
      }

      // 2. Find next available slot
      const slot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes);

      // 3. Create appointment in database
      const appt = this.db.createAppointment({
        tenant_id: targetTenant.id,
        service_id: selectedService.id,
        customer_name: customerName,
        customer_phone: cleanPhone,
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: 'CONFIRMED'
      });

      // Clear session step
      this.db.saveSession(cleanPhone, {
        tenant_id: targetTenant.id,
        step: null,
        selected_service_id: null,
        last_appointment_id: appt.id,
        last_activity: new Date().toISOString()
      });

      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        response_type: 'CONFIRMATION',
        appointment: appt,
        message: [
          `✅ *RESERVASI BERHASIL DIKONFIRMASI!*`,
          `----------------------------------------`,
          `🏥 *Tempat:* ${targetTenant.name}`,
          `👤 *Nama Pasien:* ${customerName}`,
          `📋 *Layanan:* ${selectedService.name}`,
          `⏰ *Waktu:* ${this.formatIndoDateTime(appt.start_time)}`,
          `⏱️ *Durasi:* ${selectedService.duration_minutes} menit`,
          `💳 *Biaya:* Rp ${selectedService.price.toLocaleString('id-ID')} (Bayar di tempat)`,
          `----------------------------------------`,
          `📌 *Kode Reservasi:* #${appt.id.slice(-8).toUpperCase()}`,
          `Mohon hadir 10 menit sebelum jadwal reservasi.`,
          `Jika ingin mengubah jadwal, cukup ketik:`,
          `*RESCHEDULE* atau *RESCHEDULE_${customerName}*`
        ].join('\n')
      };
    }

    // Default Patient Welcome & Service Catalog Menu
    const serviceList = services.map((s, i) => `${i + 1}. *${s.name}* (${s.duration_minutes}m - Rp ${s.price.toLocaleString('id-ID')})`).join('\n');

    return {
      recipient_type: 'PATIENT',
      tenant: targetTenant,
      response_type: 'MENU',
      message: [
        `🏥 *SELAMAT DATANG DI ${targetTenant.name.toUpperCase()}*`,
        `Resepsionis Otonom AI siap membantu reservasi Anda secara cepat & mudah.`,
        `----------------------------------------`,
        `📋 *Pilihan Layanan:*`,
        serviceList || 'Pemeriksaan Dokter',
        `----------------------------------------`,
        `💡 *Cara Booking Praktis:*`,
        `• Cukup ketik: *Nama Lengkap <spasi> Nomor Layanan*`,
        `  Contoh: *Budi Santoso 1*`,
        `• Atau ketik *Nomor Layanan* saja (misal: *1*)`
      ].join('\n')
    };
  }

  // --- HELPER: FIND NEXT AVAILABLE SLOT ---
  findNextAvailableSlot(tenantId, durationMinutes = 30) {
    const now = new Date();
    // Start at least 1 hour from now, rounded to :00 or :30
    let candidate = new Date(now.getTime() + 60 * 60 * 1000);

    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + day);

      for (let hour = 9; hour < 17; hour++) {
        for (const min of [0, 30]) {
          const testStart = new Date(checkDate);
          testStart.setHours(hour, min, 0, 0);

          if (testStart.getTime() < candidate.getTime()) continue;

          const testEnd = new Date(testStart.getTime() + durationMinutes * 60 * 1000);
          const overlap = this.db.checkSlotOverlap(tenantId, testStart.toISOString(), testEnd.toISOString());
          if (!overlap) {
            return {
              startTime: testStart.toISOString(),
              endTime: testEnd.toISOString()
            };
          }
        }
      }
    }

    const fallbackStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    fallbackStart.setHours(10, 0, 0, 0);
    return {
      startTime: fallbackStart.toISOString(),
      endTime: new Date(fallbackStart.getTime() + durationMinutes * 60 * 1000).toISOString()
    };
  }

  // --- HELPER: FORMAT INDONESIAN DATETIME ---
  formatIndoDateTime(isoStr) {
    const d = new Date(isoStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dateNum} ${monthName} ${year} pukul ${hours}:${mins} WIB`;
  }

  // --- HELPER: PARSE USER INPUT DATE STRING ---
  parseDateString(text) {
    try {
      const clean = text.trim();
      const now = new Date();

      // Check natural language: "besok jam 14:00", "besok jam 14.00", "besok jam 10", "lusa jam 11", "hari ini jam 15"
      const naturalMatch = clean.match(/(hari ini|besok|lusa)?\s*(?:jam|pukul)?\s*(\d{1,2})[:.]?(\d{2})?/i);
      if (naturalMatch && naturalMatch[2]) {
        const dayWord = (naturalMatch[1] || '').toLowerCase();
        let targetDate = new Date(now);
        if (dayWord === 'besok') {
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (dayWord === 'lusa') {
          targetDate.setDate(targetDate.getDate() + 2);
        } else if (!dayWord && clean.toLowerCase().includes('jam')) {
          targetDate.setDate(targetDate.getDate() + 1);
        }

        const hour = parseInt(naturalMatch[2], 10);
        const min = parseInt(naturalMatch[3] || '0', 10);
        if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
          targetDate.setHours(hour, min, 0, 0);
          if (targetDate.getTime() > now.getTime()) {
            return targetDate.toISOString();
          }
        }
      }

      // Check standard ISO or YYYY-MM-DD HH:mm
      const matchDate = clean.match(/(\d{4}-\d{2}-\d{2})\s*(?:jam|pukul)?\s*(\d{1,2})[:.](\d{2})/);
      if (matchDate) {
        const d = new Date(`${matchDate[1]}T${String(matchDate[2]).padStart(2, '0')}:${matchDate[3]}:00.000Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }

      const direct = new Date(clean);
      if (!isNaN(direct.getTime()) && direct.getTime() > Date.now()) {
        return direct.toISOString();
      }
    } catch (e) {}
    return null;
  }
}

module.exports = {
  IngressRouter
};
