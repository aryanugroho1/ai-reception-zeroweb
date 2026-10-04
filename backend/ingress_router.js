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

  resolveDoctorTenant(senderPhone, senderLid = null, onlyTenant = null) {
    const cleanPhone = this.normalizePhone(senderPhone);
    const cleanLid = senderLid ? senderLid.toString().split('@')[0].split(':')[0].replace(/\D/g, '') : null;

    if (!cleanPhone && !cleanLid) return null;

    const tenantsToCheck = onlyTenant ? [onlyTenant] : Array.from(this.db.tenants.values());

    for (const tenant of tenantsToCheck) {
      if (!tenant) continue;
      const cleanOwner = this.normalizePhone(tenant.owner_phone);
      const cleanBot = tenant.whatsapp_connected_phone ? this.normalizePhone(tenant.whatsapp_connected_phone) : null;
      const cleanDoctorLid = tenant.doctor_lid ? tenant.doctor_lid.toString().replace(/\D/g, '') : null;
      const extraPhones = Array.isArray(tenant.whitelist_phones)
        ? tenant.whitelist_phones.map(p => this.normalizePhone(p))
        : (tenant.whitelist_phones ? tenant.whitelist_phones.split(',').map(p => this.normalizePhone(p).trim()).filter(Boolean) : []);

      const matchesPhone = cleanPhone && (
        cleanOwner === cleanPhone ||
        cleanBot === cleanPhone ||
        extraPhones.includes(cleanPhone)
      );

      const matchesLid = cleanLid && (
        cleanDoctorLid === cleanLid ||
        extraPhones.includes(cleanLid) ||
        (tenant.owner_phone && tenant.owner_phone.replace(/\D/g, '') === cleanLid)
      );

      if (matchesPhone || matchesLid) {
        if (cleanLid && !tenant.doctor_lid) {
          tenant.doctor_lid = cleanLid;
          if (this.db && typeof this.db.saveToFile === 'function') {
            this.db.saveToFile();
          }
        }
        return tenant;
      }
    }
    return null;
  }

  /**
   * Route incoming WhatsApp message
   * @param {Object} message Baileys-compatible message object
   * @param {string} message.from e.g. "6281299887766@s.whatsapp.net" or "28918434295981@lid"
   * @param {string} [message.sender_phone] Resolved Phone Number if from was LID
   * @param {string} [message.sender_lid] Raw LID if from was LID
   * @param {string} message.text e.g. "NEXT" or "BOOK_drg_maya" or "Halo Dok"
   * @param {string} [message.tenant_slug] Optional explicit tenant slug
   */
  async routeMessage({ from, text, tenant_slug, sender_phone, sender_lid }) {
    // Defense-in-depth: Never route messages originating from group chats, newsletters, or broadcasts
    if (!from || from.includes('@g.us') || from.includes('@newsletter') || from.includes('@broadcast')) {
      return null;
    }
    const cleanPhone = sender_phone ? this.normalizePhone(sender_phone) : (from.includes('@lid') ? '' : this.normalizePhone(from));
    const cleanLid = sender_lid
      ? sender_lid.toString().split('@')[0].split(':')[0].replace(/\D/g, '')
      : (from.includes('@lid') ? from.split('@')[0].split(':')[0].replace(/\D/g, '') : null);
    const cleanText = (text || '').trim();

    // 1. DOCTOR WHITLELIST ROUTING (Check Phone AND LID, scoped to target tenant if tenant_slug is present)
    let scopedTenant = null;
    if (tenant_slug) {
      scopedTenant = this.db.getTenantBySlug(tenant_slug);
    }
    const doctorTenant = this.resolveDoctorTenant(cleanPhone, cleanLid, scopedTenant);
    if (doctorTenant) {
      // Doctor is sending a message -> pass to Doctor Copilot
      const copilotResponse = await this.doctorCopilot.handleCommand({
        tenantId: doctorTenant.id,
        commandText: cleanText,
        doctorPhone: cleanPhone || cleanLid
      });

      if (!copilotResponse || !copilotResponse.reply || copilotResponse.action === 'IGNORE_BOT_ECHO') {
        return null;
      }

      return {
        recipient_type: 'DOCTOR',
        tenant: doctorTenant,
        response_type: 'TEXT',
        message: copilotResponse.reply,
        notifications: copilotResponse.notifications || [],
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
    const upperText = cleanText.toUpperCase().trim();
    const isCancelCmd = ['BATAL', 'CANCEL', 'RESET', 'BATALKAN'].includes(upperText) ||
      upperText.startsWith('BATAL ') ||
      upperText.startsWith('BATALKAN ') ||
      upperText.startsWith('CANCEL ') ||
      upperText.includes('BATAL JADWAL') ||
      upperText.includes('BATALKAN JADWAL') ||
      upperText.includes('BATAL JANJI') ||
      upperText.includes('CANCEL JADWAL') ||
      upperText.includes('CANCEL BOOKING');

    if (isCancelCmd) {
      this.db.saveSession(cleanPhone, {
        tenant_id: targetTenant.id,
        step: null,
        selected_service_id: null,
        target_reschedule_id: null,
        last_activity: new Date().toISOString()
      });

      // Find active appointment(s) for this patient at this clinic
      const normSender = this.normalizePhone(cleanPhone);
      const activeAppts = Array.from(this.db.appointments.values()).filter(a => {
        if (a.tenant_id !== targetTenant.id) return false;
        if (!['CONFIRMED', 'SCHEDULED', 'IN_CONSULTATION'].includes(a.status)) return false;
        const normCustomer = this.normalizePhone(a.customer_phone);
        return normCustomer === normSender || a.customer_phone === cleanPhone;
      }).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

      if (activeAppts.length > 0) {
        for (const appt of activeAppts) {
          appt.status = 'CANCELLED';
          appt.cancelled_at = new Date().toISOString();
          appt.cancelled_by = 'PATIENT';
          appt.updated_at = new Date().toISOString();
          if (this.db && typeof this.db.pgUpsertAppointment === 'function') {
            this.db.pgUpsertAppointment(appt).catch(() => {});
          }
        }
        if (this.db && typeof this.db.saveToFile === 'function') {
          this.db.saveToFile();
        }

        const cancelledAppt = activeAppts[0];
        return {
          recipient_type: 'PATIENT',
          tenant: targetTenant,
          response_type: 'TEXT',
          message: [
            `✅ *JADWAL RESERVASI DIBATALKAN*`,
            `----------------------------------------`,
            `🏥 Klinik: *${targetTenant.name}*`,
            `👤 Pasien: *${cancelledAppt.customer_name}*`,
            `⏰ Waktu: *${this.formatIndoDateTime(cancelledAppt.start_time)}*`,
            `📌 Status: ❌ Dibatalkan`,
            `----------------------------------------`,
            `Jadwal Anda telah resmi dibatalkan dari sistem antrean dokter.`,
            `Jika ingin membuat reservasi baru di kemudian hari, cukup kirim pesan kembali. Terima kasih!`
          ].join('\n')
        };
      }

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

    // Handle confirmation of alternative offered slot
    if (existingSession.step === 'AWAITING_SLOT_CONFIRMATION' && existingSession.pending_offered_slot) {
      const isAffirmative = ['YA', 'OKE', 'OK', 'SETUJU', 'SIAP', 'DEAL', 'BISA', 'MAU', 'IYA'].includes(cleanText.toUpperCase().trim());
      if (isAffirmative) {
        const slot = existingSession.pending_offered_slot;
        const selectedService = services.find(s => s.id === existingSession.selected_service_id) || services[0];
        const customerName = existingSession.customer_name || 'Pasien';

        const appt = this.db.createAppointment({
          tenant_id: targetTenant.id,
          service_id: selectedService ? selectedService.id : 'srv-default',
          customer_name: customerName,
          customer_phone: cleanPhone,
          start_time: slot.startTime,
          end_time: slot.endTime,
          status: 'CONFIRMED'
        });

        this.db.saveSession(cleanPhone, {
          tenant_id: targetTenant.id,
          step: null,
          selected_service_id: null,
          pending_offered_slot: null,
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
            `Jika ingin membatalkan jadwal, cukup ketik: *BATAL*`
          ].join('\n')
        };
      }
    }

    // --- CONVERSATIONAL BOOKING PARSER ---
    let customerName = null;
    let selectedService = null;

    // Pattern 1: Step AWAITING_NAME (Patient already picked service, now sending their name)
    if (existingSession.step === 'AWAITING_NAME' && existingSession.selected_service_id) {
      if (cleanText.length >= 2 && !/^[0-9]+$/.test(cleanText)) {
        selectedService = services.find(s => s.id === existingSession.selected_service_id);
        const parsedTime = this.parseDateString(cleanText, targetTenant.timezone || 'Asia/Jakarta');
        if (parsedTime) {
          existingSession.preferred_time = parsedTime;
          let cleaned = cleanText
            .replace(/\d{4}-\d{2}-\d{2}/g, '')
            .replace(/(?:hari ini|besok|lusa)?\s*(?:jam|pukul)?\s*(\d{1,2})[:.]?(\d{2})?/gi, '')
            .replace(/\b(?:hari ini|besok|lusa)\b/gi, '')
            .trim();
          customerName = cleaned.length >= 2 ? cleaned : 'Pasien';
        } else {
          customerName = cleanText.trim();
        }
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
            `Silakan balas pesan ini dengan *Nama Lengkap* Anda untuk konfirmasi jadwal.`,
            `*(Contoh: Budi Santoso, atau sertakan waktu seperti "Budi besok jam 10")*`
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
            `Untuk membatalkan jadwal, ketik: *BATAL*`,
            `Untuk mengubah waktu, ketik: *RESCHEDULE*`
          ].join('\n')
        };
      }

      // 2. Determine slot respecting operating hours, closed dates, and preferred time
      const openH = targetTenant.open_hour || (targetTenant.operating_hours && targetTenant.operating_hours.open) || '09:00';
      const closeH = targetTenant.close_hour || (targetTenant.operating_hours && targetTenant.operating_hours.close) || '17:00';
      const closedDates = Array.isArray(targetTenant.closed_dates) ? targetTenant.closed_dates : [];
      const tz = targetTenant.timezone || 'Asia/Jakarta';
      const now = new Date();

      let preferredTime = this.parseDateString(cleanText, tz) || existingSession.preferred_time;
      let slot = null;

      if (preferredTime) {
        const prefDate = new Date(preferredTime);
        let prefDateStr = '';
        try {
          prefDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(prefDate);
        } catch (e) {
          prefDateStr = prefDate.toISOString().slice(0, 10);
        }

        // Check maximum booking horizon: strictly max H+2 (Today, Tomorrow, Day After Tomorrow)
        let tzOffsetStr = '+07:00';
        if (tz === 'Asia/Makassar') tzOffsetStr = '+08:00';
        else if (tz === 'Asia/Jayapura') tzOffsetStr = '+09:00';

        const maxH2Obj = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        let maxH2DateStr = '';
        try {
          maxH2DateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(maxH2Obj);
        } catch (e) {
          maxH2DateStr = maxH2Obj.toISOString().slice(0, 10);
        }
        const maxH2Cutoff = new Date(`${maxH2DateStr}T23:59:59${tzOffsetStr}`);

        if (prefDate.getTime() > maxH2Cutoff.getTime()) {
          const nextSlot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes);
          this.db.saveSession(cleanPhone, {
            ...existingSession,
            step: 'AWAITING_SLOT_CONFIRMATION',
            selected_service_id: selectedService.id,
            customer_name: customerName,
            pending_offered_slot: nextSlot,
            last_activity: new Date().toISOString()
          });
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'TEXT',
            message: [
              `⚠️ *BATAS MAKSIMAL RESERVASI H+2*`,
              `----------------------------------------`,
              `Mohon maaf, sistem reservasi *${targetTenant.name}* saat ini hanya dibuka maksimal hingga *H+2 (Hari ini, Besok, dan Lusa)*.`,
              ``,
              `Rekomendasi jadwal terdekat yang tersedia:`,
              `⏰ *${this.formatIndoDateTime(nextSlot.startTime, tz)}*`,
              `----------------------------------------`,
              `Balas *YA* untuk konfirmasi jadwal ini, atau ketik waktu lain dalam rentang H+2.`
            ].join('\n')
          };
        }

        // Check if preferred date is closed
        if (closedDates.includes(prefDateStr)) {
          const nextSlot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes);
          this.db.saveSession(cleanPhone, {
            ...existingSession,
            step: 'AWAITING_SLOT_CONFIRMATION',
            selected_service_id: selectedService.id,
            customer_name: customerName,
            pending_offered_slot: nextSlot,
            last_activity: new Date().toISOString()
          });
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'TEXT',
            message: [
              `🛑 *MOHON MAAF, PRAKTEK LIBUR*`,
              `----------------------------------------`,
              `Praktek *${targetTenant.name}* sedang tutup/libur pada tanggal *${prefDateStr}*.`,
              ``,
              `Jadwal buka operasional terdekat:`,
              `⏰ *${this.formatIndoDateTime(nextSlot.startTime)}*`,
              `----------------------------------------`,
              `Balas *YA* untuk konfirmasi jadwal ini, atau ketik waktu lain yang Anda inginkan.`
            ].join('\n')
          };
        }

        // Check operating hours
        const openHourNum = parseInt(openH.split(':')[0], 10);
        const openMinNum = parseInt(openH.split(':')[1] || '0', 10);
        const closeHourNum = parseInt(closeH.split(':')[0], 10);
        const closeMinNum = parseInt(closeH.split(':')[1] || '0', 10);

        let prefHour = 0, prefMin = 0;
        try {
          const prefParts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(prefDate);
          prefHour = parseInt(prefParts.find(p => p.type === 'hour')?.value || '0', 10);
          prefMin = parseInt(prefParts.find(p => p.type === 'minute')?.value || '0', 10);
        } catch (e) {
          prefHour = prefDate.getHours();
          prefMin = prefDate.getMinutes();
        }

        const isBeforeOpen = (prefHour < openHourNum) || (prefHour === openHourNum && prefMin < openMinNum);
        const isAfterClose = (prefHour > closeHourNum) || (prefHour === closeHourNum && prefMin > closeMinNum);

        if (isBeforeOpen || isAfterClose) {
          const nextSlot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes, preferredTime);
          this.db.saveSession(cleanPhone, {
            ...existingSession,
            step: 'AWAITING_SLOT_CONFIRMATION',
            selected_service_id: selectedService.id,
            customer_name: customerName,
            pending_offered_slot: nextSlot,
            last_activity: new Date().toISOString()
          });
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'TEXT',
            message: [
              `⏰ *DI LUAR JAM OPERASIONAL*`,
              `----------------------------------------`,
              `Jam operasional praktek *${targetTenant.name}* adalah pukul *${openH}* s/d *${closeH}* WIB.`,
              ``,
              `Rekomendasi jadwal terdekat di jam operasional:`,
              `⏰ *${this.formatIndoDateTime(nextSlot.startTime)}*`,
              `----------------------------------------`,
              `Balas *YA* untuk konfirmasi jadwal ini, atau ketik jam lainnya.`
            ].join('\n')
          };
        }

        // Check slot overlap
        const testEnd = new Date(prefDate.getTime() + selectedService.duration_minutes * 60 * 1000).toISOString();
        const overlap = this.db.checkSlotOverlap(targetTenant.id, prefDate.toISOString(), testEnd);
        if (overlap) {
          const nextSlot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes, preferredTime);
          this.db.saveSession(cleanPhone, {
            ...existingSession,
            step: 'AWAITING_SLOT_CONFIRMATION',
            selected_service_id: selectedService.id,
            customer_name: customerName,
            pending_offered_slot: nextSlot,
            last_activity: new Date().toISOString()
          });
          return {
            recipient_type: 'PATIENT',
            tenant: targetTenant,
            response_type: 'TEXT',
            message: [
              `⚠️ *SLOT JAM SUDAH TERISI*`,
              `----------------------------------------`,
              `Jam yang Anda pilih sudah terisi oleh pasien lain.`,
              ``,
              `Rekomendasi slot kosong terdekat:`,
              `⏰ *${this.formatIndoDateTime(nextSlot.startTime)}*`,
              `----------------------------------------`,
              `Balas *YA* untuk mengambil jadwal ini, atau ketik waktu lainnya.`
            ].join('\n')
          };
        }

        slot = {
          startTime: prefDate.toISOString(),
          endTime: testEnd
        };
      } else {
        slot = this.findNextAvailableSlot(targetTenant.id, selectedService.duration_minutes);
      }

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
  findNextAvailableSlot(tenantId, durationMinutes = 30, preferredDateIso = null) {
    const tenant = this.db.tenants.get(tenantId);
    const tz = tenant?.timezone || 'Asia/Jakarta';
    const openHStr = tenant?.open_hour || (tenant?.operating_hours && tenant?.operating_hours.open) || '09:00';
    const closeHStr = tenant?.close_hour || (tenant?.operating_hours && tenant?.operating_hours.close) || '17:00';
    const startHour = parseInt(openHStr.split(':')[0], 10) || 9;
    const startMin = parseInt(openHStr.split(':')[1] || '0', 10) || 0;
    const endHour = parseInt(closeHStr.split(':')[0], 10) || 17;
    const closedDates = Array.isArray(tenant?.closed_dates) ? tenant.closed_dates : [];

    const now = new Date();
    let baseTime = preferredDateIso ? new Date(preferredDateIso) : new Date(now.getTime() + 60 * 60 * 1000);
    if (baseTime.getTime() < now.getTime()) {
      baseTime = new Date(now.getTime() + 60 * 60 * 1000);
    }

    let tzOffsetStr = '+07:00';
    if (tz === 'Asia/Makassar') tzOffsetStr = '+08:00';
    else if (tz === 'Asia/Jayapura') tzOffsetStr = '+09:00';

    for (let day = 0; day < 3; day++) {
      const checkDate = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000);

      let dateStr = '';
      try {
        dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(checkDate);
      } catch (e) {
        dateStr = checkDate.toISOString().slice(0, 10);
      }

      // Skip closed dates (e.g. "besok tutup")
      if (closedDates.includes(dateStr)) {
        continue;
      }

      for (let hour = startHour; hour < endHour; hour++) {
        for (const min of [0, 30]) {
          if (hour === startHour && min < startMin) continue;

          const isoCandidate = `${dateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00${tzOffsetStr}`;
          const testStart = new Date(isoCandidate);

          if (testStart.getTime() < now.getTime() + 30 * 60 * 1000) continue;

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

    const fallbackDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    let fallbackDateStr = '';
    try {
      fallbackDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(fallbackDate);
    } catch (e) {
      fallbackDateStr = fallbackDate.toISOString().slice(0, 10);
    }
    const fallbackIso = `${fallbackDateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00${tzOffsetStr}`;
    const fallbackStart = new Date(fallbackIso);
    return {
      startTime: fallbackStart.toISOString(),
      endTime: new Date(fallbackStart.getTime() + durationMinutes * 60 * 1000).toISOString()
    };
  }

  // --- HELPER: FORMAT INDONESIAN DATETIME ---
  formatIndoDateTime(isoStr, tz = 'Asia/Jakarta') {
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    let tzAbbr = 'WIB';
    if (tz === 'Asia/Makassar') tzAbbr = 'WITA';
    else if (tz === 'Asia/Jayapura') tzAbbr = 'WIT';

    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(d);

      const getPart = (type) => parts.find(p => p.type === type)?.value || '';
      const dayVal = parseInt(getPart('day'), 10);
      const monthVal = parseInt(getPart('month'), 10) - 1;
      const yearVal = getPart('year');
      const hours = getPart('hour');
      const mins = getPart('minute');

      const dayOfWeek = new Intl.DateTimeFormat('id-ID', { timeZone: tz, weekday: 'long' }).format(d);
      const monthName = months[monthVal] || '';

      return `${dayOfWeek}, ${dayVal} ${monthName} ${yearVal} pukul ${hours}:${mins} ${tzAbbr}`;
    } catch (e) {
      return d.toLocaleString('id-ID', { timeZone: tz });
    }
  }

  // --- HELPER: PARSE USER INPUT DATE STRING ---
  parseDateString(text, tz = 'Asia/Jakarta') {
    try {
      const clean = text.trim();
      const now = new Date();

      let tzOffsetStr = '+07:00';
      if (tz === 'Asia/Makassar') tzOffsetStr = '+08:00';
      else if (tz === 'Asia/Jayapura') tzOffsetStr = '+09:00';

      // 1. Check standard ISO or YYYY-MM-DD [HH:mm]
      const matchDate = clean.match(/(\d{4}-\d{2}-\d{2})(?:[T\s](?:jam|pukul)?\s*(\d{1,2})[:.](\d{2}))?/i);
      if (matchDate) {
        const hour = matchDate[2] !== undefined ? String(matchDate[2]).padStart(2, '0') : '09';
        const min = matchDate[3] !== undefined ? String(matchDate[3]).padStart(2, '0') : '00';
        const candidate = `${matchDate[1]}T${hour}:${min}:00${tzOffsetStr}`;
        const d = new Date(candidate);
        if (!isNaN(d.getTime())) return d.toISOString();
      }

      // 2. Check natural language: "besok jam 14:00", "besok jam 14.00", "besok jam 10", "lusa jam 11", "hari ini jam 15"
      const naturalMatch = clean.match(/(?:(hari ini|besok|lusa)\s*(?:jam|pukul\s*)?|(?:jam|pukul)\s*)(\d{1,2})(?:[:.](\d{2}))?/i);
      if (naturalMatch && naturalMatch[2]) {
        const dayWord = (naturalMatch[1] || '').toLowerCase();
        let dayOffset = 0;
        if (dayWord === 'besok') {
          dayOffset = 1;
        } else if (dayWord === 'lusa') {
          dayOffset = 2;
        } else if (!dayWord && clean.toLowerCase().includes('jam')) {
          dayOffset = 1;
        }

        const hour = parseInt(naturalMatch[2], 10);
        const min = parseInt(naturalMatch[3] || '0', 10);
        if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
          const targetDateObj = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
          let targetDateStr = '';
          try {
            targetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(targetDateObj);
          } catch (e) {
            targetDateStr = targetDateObj.toISOString().slice(0, 10);
          }
          const candidateIso = `${targetDateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00${tzOffsetStr}`;
          const parsed = new Date(candidateIso);
          if (parsed.getTime() > now.getTime()) {
            return parsed.toISOString();
          }
        }
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
