/**
 * DOCTOR COPILOT ENGINE & COMMAND PALETTE
 * PRD Section 5: Command Tool Calling, Queue Progression, QuickChart, Smart Nudge
 */

class DoctorCopilotEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Process Doctor WhatsApp text command
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.commandText
   * @param {string} params.doctorPhone
   */
  async handleCommand({ tenantId, commandText, doctorPhone }) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Practice tenant ${tenantId} not found`);
    }

    const cleanDoc = (doctorPhone || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '');
    const normDoc = cleanDoc.startsWith('0') ? '62' + cleanDoc.slice(1) : (cleanDoc.startsWith('8') ? '62' + cleanDoc : cleanDoc);

    const cleanOwner = (tenant.owner_phone || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '');
    const normOwner = cleanOwner.startsWith('0') ? '62' + cleanOwner.slice(1) : (cleanOwner.startsWith('8') ? '62' + cleanOwner : cleanOwner);

    const cleanBot = (tenant.whatsapp_connected_phone || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '');
    const normBot = cleanBot.startsWith('0') ? '62' + cleanBot.slice(1) : (cleanBot.startsWith('8') ? '62' + cleanBot : cleanBot);

    const cleanDoctorLid = (tenant.doctor_lid || '').toString().replace(/\D/g, '');

    const extraClean = Array.isArray(tenant.whitelist_phones)
      ? tenant.whitelist_phones.map(p => {
          const c = (p || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '');
          return c.startsWith('0') ? '62' + c.slice(1) : (c.startsWith('8') ? '62' + c : c);
        })
      : (tenant.whitelist_phones ? tenant.whitelist_phones.split(',').map(p => {
          const c = (p || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '');
          return c.startsWith('0') ? '62' + c.slice(1) : (c.startsWith('8') ? '62' + c : c);
        }) : []);

    const isAuthorized =
      normDoc === normOwner ||
      normDoc === normBot ||
      (cleanDoctorLid && cleanDoc === cleanDoctorLid) ||
      (tenant.owner_phone && tenant.owner_phone.replace(/\D/g, '') === cleanDoc) ||
      extraClean.includes(normDoc) ||
      extraClean.includes(cleanDoc);

    if (!isAuthorized) {
      const err = new Error(`Unauthorized doctor phone ${doctorPhone} for tenant ${tenant.name}`);
      err.statusCode = 403;
      throw err;
    }

    // Anti-loop defense: Reject bot generated message templates or long formatted replies
    const rawCmd = (commandText || '').trim();
    if (rawCmd.length > 70 || rawCmd.includes('\n\n') || /^[📅✅🛑🟢🩺ℹ️👋🔢⚠️📋]/.test(rawCmd)) {
      return { action: 'IGNORE_BOT_ECHO', reply: null };
    }

    const normalizedCmd = rawCmd.toUpperCase();

    // Check if practice subscription has expired
    if (tenant.subscription_until && new Date(tenant.subscription_until) < new Date()) {
      return {
        action: 'SUBSCRIPTION_EXPIRED',
        reply: `⚠️ *MASA LANGGANAN BERAKHIR*\n\nPaket langganan untuk *${tenant.name}* telah berakhir pada ${tenant.subscription_until.slice(0, 10)}.\n\nSilakan perpanjang langganan Anda melalui tagihan Mayar atau hubungi admin agar asisten AI kembali aktif melayani pasien.`
      };
    }

    // 1. Command: NEXT / BERIKUTNYA / PANGGIL
    if (/^\s*(?:NEXT|BERIKUTNYA|PANGGIL)(?:\s+.*)?$/i.test(normalizedCmd)) {
      return this.handleNextPatient(tenant);
    }

    // 2. Command: DONE / SELESAI
    if (/^\s*(?:DONE|SELESAI)(?:\s+.*)?$/i.test(normalizedCmd)) {
      return this.handleCompletePatient(tenant);
    }

    // 3. Command: STATUS / ANTREAN / DAFTAR / JADWAL / REKAP
    if (/^\s*(?:STATUS|ANTREAN|DAFTAR|JADWAL|REKAP|HARI\s+INI|LIST)(?:\s+.*)?$/i.test(normalizedCmd)) {
      return this.handleQueueStatus(tenant);
    }

    // 4. Command: DASHBOARD / RINGKASAN / INSIGHT / OMSET / CHART / GRAFIK
    if (/^\s*(?:DASHBOARD|RINGKASAN|INSIGHT|OMSET|PENDAPATAN|CHART|GRAFIK|VISUAL)(?:\s+.*)?$/i.test(normalizedCmd)) {
      return this.handleDashboardInsight(tenant);
    }

    // 5A. Command: BESOK TUTUP / TUTUP BESOK / BESOK LIBUR / LIBUR BESOK
    if (/^\s*(?:BESOK\s+TUTUP|TUTUP\s+BESOK|BESOK\s+LIBUR|LIBUR\s+BESOK)(?:\s+.*)?$/i.test(normalizedCmd)) {
      const tz = tenant.timezone || 'Asia/Jakarta';
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      let tomorrowStr = '';
      try {
        tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(tomorrow);
      } catch (e) {
        tomorrowStr = tomorrow.toISOString().slice(0, 10);
      }
      tenant.closed_dates = Array.isArray(tenant.closed_dates) ? tenant.closed_dates : [];
      if (!tenant.closed_dates.includes(tomorrowStr)) {
        tenant.closed_dates.push(tomorrowStr);
      }
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.saveToFile === 'function') this.db.saveToFile();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});

      return {
        action: 'CLOSE_TOMORROW',
        date: tomorrowStr,
        reply: [
          `🛑 *PRAKTEK TUTUP BESOK (${tomorrowStr})*`,
          `----------------------------------------`,
          `Praktek *${tenant.name}* telah ditandai libur/tutup untuk besok (${tomorrowStr}).`,
          `Pasien yang mencoba reservasi untuk besok akan otomatis diinformasikan bahwa praktek sedang libur dan diarahkan ke hari buka berikutnya.`,
          ``,
          `Ketik *BESOK BUKA* untuk mengaktifkan kembali jadwal besok.`
        ].join('\n')
      };
    }

    // 5B. Command: BESOK BUKA / BUKA BESOK
    if (/^\s*(?:BESOK\s+BUKA|BUKA\s+BESOK)(?:\s+.*)?$/i.test(normalizedCmd)) {
      const tz = tenant.timezone || 'Asia/Jakarta';
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      let tomorrowStr = '';
      try {
        tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(tomorrow);
      } catch (e) {
        tomorrowStr = tomorrow.toISOString().slice(0, 10);
      }
      tenant.closed_dates = Array.isArray(tenant.closed_dates) ? tenant.closed_dates.filter(d => d !== tomorrowStr) : [];
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.saveToFile === 'function') this.db.saveToFile();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});

      return {
        action: 'OPEN_TOMORROW',
        date: tomorrowStr,
        reply: [
          `🟢 *PRAKTEK BESOK DIBUKA KEMBALI (${tomorrowStr})*`,
          `----------------------------------------`,
          `Jadwal reservasi untuk besok di *${tenant.name}* kini aktif kembali melayani pasien.`
        ].join('\n')
      };
    }

    // 5C. Command: JAM BUKA / JAM OPERASIONAL [HH:MM] - [HH:MM] (Setting Operating Hours)
    const jamRangeMatch = rawCmd.match(/^\s*(?:JAM\s+BUKA|JAM\s+OPERASIONAL|JAM\s+KERJA)\s+(\d{1,2}[:.]\d{2})\s*(?:-|SAMPAI|SD|HINGGA)\s*(\d{1,2}[:.]\d{2})\s*$/i);
    if (jamRangeMatch) {
      const openH = jamRangeMatch[1].replace('.', ':').padStart(5, '0');
      const closeH = jamRangeMatch[2].replace('.', ':').padStart(5, '0');
      tenant.open_hour = openH;
      tenant.close_hour = closeH;
      tenant.operating_hours = { open: openH, close: closeH };
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.saveToFile === 'function') this.db.saveToFile();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});

      return {
        action: 'SET_OPERATING_HOURS',
        operating_hours: tenant.operating_hours,
        reply: [
          `⏰ *JAM OPERASIONAL BERHASIL DIATUR*`,
          `----------------------------------------`,
          `Praktek: *${tenant.name}*`,
          `Jam Buka: *${openH}*`,
          `Jam Tutup: *${closeH}*`,
          `----------------------------------------`,
          `ZeroWeb AI Receptionist akan mengalokasikan slot reservasi pasien hanya di antara jam *${openH}* hingga *${closeH}*.`
        ].join('\n')
      };
    }

    // 5D. Command: JAM BUKA [HH:MM] (Set Open Hour only)
    const jamBukaSingleMatch = rawCmd.match(/^\s*JAM\s+BUKA\s+(\d{1,2}[:.]\d{2})\s*$/i);
    if (jamBukaSingleMatch) {
      const openH = jamBukaSingleMatch[1].replace('.', ':').padStart(5, '0');
      const closeH = tenant.close_hour || (tenant.operating_hours && tenant.operating_hours.close) || '17:00';
      tenant.open_hour = openH;
      tenant.close_hour = closeH;
      tenant.operating_hours = { open: openH, close: closeH };
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.saveToFile === 'function') this.db.saveToFile();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});

      return {
        action: 'SET_OPEN_HOUR',
        open_hour: openH,
        reply: `⏰ Jam buka praktek *${tenant.name}* diatur ke pukul *${openH}* (Tutup: ${closeH}).`
      };
    }

    // 5E. Command: JAM TUTUP [HH:MM] (Set Close Hour only)
    const jamTutupSingleMatch = rawCmd.match(/^\s*JAM\s+TUTUP\s+(\d{1,2}[:.]\d{2})\s*$/i);
    if (jamTutupSingleMatch) {
      const closeH = jamTutupSingleMatch[1].replace('.', ':').padStart(5, '0');
      const openH = tenant.open_hour || (tenant.operating_hours && tenant.operating_hours.open) || '09:00';
      tenant.open_hour = openH;
      tenant.close_hour = closeH;
      tenant.operating_hours = { open: openH, close: closeH };
      tenant.updated_at = new Date().toISOString();
      if (this.db && typeof this.db.saveToFile === 'function') this.db.saveToFile();
      if (this.db && typeof this.db.pgUpsertTenant === 'function') this.db.pgUpsertTenant(tenant).catch(() => {});

      return {
        action: 'SET_CLOSE_HOUR',
        close_hour: closeH,
        reply: `⏰ Jam tutup praktek *${tenant.name}* diatur ke pukul *${closeH}* (Buka: ${openH}).`
      };
    }

    // 5F. Command: JAM BUKA / JAM OPERASIONAL / JAM KERJA (Query Operating Hours)
    if (/^\s*(?:JAM\s+BUKA|JAM\s+OPERASIONAL|JAM\s+KERJA|JAM\s+TUTUP)\s*$/i.test(normalizedCmd)) {
      const openH = tenant.open_hour || (tenant.operating_hours && tenant.operating_hours.open) || '09:00';
      const closeH = tenant.close_hour || (tenant.operating_hours && tenant.operating_hours.close) || '17:00';
      const closedList = Array.isArray(tenant.closed_dates) && tenant.closed_dates.length > 0
        ? tenant.closed_dates.join(', ')
        : 'Tidak ada (Buka setiap hari operasional)';

      return {
        action: 'GET_OPERATING_HOURS',
        operating_hours: { open: openH, close: closeH },
        closed_dates: tenant.closed_dates || [],
        reply: [
          `⏰ *INFORMASI JAM OPERASIONAL*`,
          `----------------------------------------`,
          `Praktek: *${tenant.name}*`,
          `Jam Buka: *${openH}* WIB`,
          `Jam Tutup: *${closeH}* WIB`,
          `Tanggal Libur / Tutup: *${closedList}*`,
          `----------------------------------------`,
          `💡 *Contoh Perintah Pengaturan:*`,
          `• *JAM BUKA 08:00 - 20:00*`,
          `• *BESOK TUTUP* (Tandai libur besok)`,
          `• *BESOK BUKA* (Buka kembali besok)`
        ].join('\n')
      };
    }

    // 5. Command: TUTUP / ISTIRAHAT / PAUSE
    if (/^\s*(?:TUTUP|ISTIRAHAT|PAUSE)(?:\s+.*)?$/i.test(normalizedCmd)) {
      tenant.is_accepting_patients = false;
      tenant.updated_at = new Date().toISOString();
      return {
        action: 'TOGGLE_PRACTICE',
        status: 'CLOSED',
        reply: `🛑 *PRAKTEK DITUTUP SEMENTARA*\n\nPenerimaan reservasi baru dihentikan sementara waktu. Pasien yang mencoba booking via WhatsApp akan diinformasikan secara otomatis bahwa dokter sedang rehat.\n\nKetik *BUKA* kapan saja untuk mengaktifkan kembali.`
      };
    }

    // 6. Command: BUKA / AKTIF / RESUME
    if (/^\s*(?:BUKA|AKTIF|RESUME)(?:\s+.*)?$/i.test(normalizedCmd)) {
      tenant.is_accepting_patients = true;
      tenant.updated_at = new Date().toISOString();
      return {
        action: 'TOGGLE_PRACTICE',
        status: 'OPEN',
        reply: `🟢 *PRAKTEK TELAH DIBUKA KEMBALI*\n\nZeroWeb AI Receptionist aktif kembali menerima reservasi pasien baru.`
      };
    }

    // 7. Command: TARIF [nomor] [harga] (Ubah harga layanan)
    const tarifChangeMatch = rawCmd.match(/^\s*(?:TARIF|HARGA|UBAH\s+HARGA|UBAH\s+TARIF)\s+(\S+)\s+(\d+)\s*$/i);
    if (tarifChangeMatch) {
      return this.handleUpdateServicePrice(tenant, tarifChangeMatch[1], tarifChangeMatch[2]);
    }

    // 8. Command: TAMBAH [nama], [durasi], [harga] (Tambah layanan baru)
    const tambahMatch = rawCmd.match(/^\s*(?:TAMBAH\s+LAYANAN|TAMBAH)\s+(.+?),\s*(\d+),\s*(\d+)\s*$/i);
    if (tambahMatch) {
      return this.handleAddService(tenant, tambahMatch[1], tambahMatch[2], tambahMatch[3]);
    }

    // 9. Command: TARIF / LAYANAN / HARGA (Daftar layanan & tarif)
    if (/^\s*(?:TARIF|LAYANAN|HARGA|LIST\s+LAYANAN)(?:\s+.*)?$/i.test(normalizedCmd)) {
      return this.handleServicesList(tenant);
    }

    // Fallback menu assistance
    return {
      action: 'HELP',
      reply: [
        `👨‍⚕️ *KOPILOT DOKTER - PERINTAH TERSEDIA*`,
        `----------------------------------------`,
        `👉 *NEXT* : Panggil pasien antrean berikutnya`,
        `👉 *DONE* : Selesaikan pasien yang sedang diperiksa`,
        `👉 *STATUS* atau *JADWAL* : Jadwal pasien hari ini`,
        `👉 *DASHBOARD* atau *CHART* : 3 Visual Chart (Hari Ini, Week Daily, Month Weekly)`,
        `👉 *TARIF* : Cek & kelola harga layanan praktek`,
        `👉 *TARIF [nomor] [harga]* : Ubah harga layanan langsung`,
        `👉 *BESOK TUTUP* : Tandai praktek besok libur / tutup`,
        `👉 *BESOK BUKA* : Buka kembali jadwal praktek besok`,
        `👉 *JAM BUKA 08:00 - 20:00* : Atur jam operasional praktek`,
        `👉 *JAM BUKA* : Cek jam buka & tutup operasional saat ini`,
        `👉 *TUTUP* : Hentikan sementara reservasi baru`,
        `👉 *BUKA* : Aktifkan kembali reservasi baru`,
        `----------------------------------------`
      ].join('\n')
    };
  }

  handleNextPatient(tenant) {
    const now = new Date();
    const tz = tenant.timezone || 'Asia/Jakarta';
    let todayLocal = '';
    try {
      todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
    } catch (e) {
      todayLocal = now.toISOString().slice(0, 10);
    }
    const todayUtc = now.toISOString().slice(0, 10);

    // Check if there is currently someone in consultation, mark them completed
    let previousPatient = null;
    for (const appt of this.db.appointments.values()) {
      if (appt.tenant_id === tenant.id && appt.status === 'IN_CONSULTATION') {
        appt.status = 'COMPLETED';
        appt.updated_at = new Date().toISOString();
        previousPatient = appt;
        break;
      }
    }

    // Find next confirmed appointment for today sorted by start_time
    let queue = Array.from(this.db.appointments.values())
      .filter(a => {
        if (a.tenant_id !== tenant.id || a.status !== 'CONFIRMED') return false;
        try {
          const apptDateLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(a.start_time));
          return apptDateLocal === todayLocal || a.start_time.startsWith(todayUtc);
        } catch (e) {
          return a.start_time.startsWith(todayUtc);
        }
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Fallback: If no appointments strictly match today, but there are CONFIRMED appointments, take the earliest confirmed!
    if (queue.length === 0) {
      queue = Array.from(this.db.appointments.values())
        .filter(a => a.tenant_id === tenant.id && a.status === 'CONFIRMED')
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    }

    if (queue.length === 0) {
      return {
        action: 'QUEUE_EMPTY',
        reply: `✅ *ANTREAN HARI INI HABIS!*\n\nTidak ada antrean menunggu lagi untuk saat ini. Kerja bagus!`
      };
    }

    const nextPatient = queue[0];
    nextPatient.status = 'IN_CONSULTATION';
    nextPatient.consultation_started_at = new Date().toISOString();
    nextPatient.updated_at = new Date().toISOString();

    // Normalize phone number to repair any double-prefixed records and ensure correct international routing
    const cleanCustomerPhone = this.db.normalizePhone
      ? this.db.normalizePhone(nextPatient.customer_phone)
      : nextPatient.customer_phone.replace(/\D/g, '');
    nextPatient.customer_phone = cleanCustomerPhone;

    if (this.db && typeof this.db.saveToFile === 'function') {
      this.db.saveToFile();
    }

    const service = this.db.services.get(nextPatient.service_id);
    const serviceName = service ? service.name : 'Layanan Utama';

    const isBarber = tenant.category === 'BARBER';
    const isSalon = tenant.category === 'SALON';
    const isSpa = tenant.category === 'SPA';

    const personLabel = isBarber ? 'Pelanggan' : (isSalon ? 'Klien' : (isSpa ? 'Tamu' : 'Pasien'));
    const staffLabel = isBarber ? 'Capster' : (isSalon ? 'Stylist' : (isSpa ? 'Terapis' : 'Dokter'));

    const reply = [
      `🔔 *${personLabel.toUpperCase()} BERIKUTNYA DIPANGGIL*`,
      `----------------------------------------`,
      `👤 ${personLabel} : *${nextPatient.customer_name}*`,
      `📱 Telepon : ${cleanCustomerPhone}`,
      `✂️ Layanan : *${serviceName}*`,
      `⏰ Jadwal : ${new Date(nextPatient.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      `🔢 ID Reservasi : \`${nextPatient.id.slice(0, 8)}\``,
      previousPatient ? `\n*(${personLabel} sebelumnya ${previousPatient.customer_name} telah ditandai SELESAI)*` : '',
      `\nKetik *DONE* bila selesai, atau *NEXT* untuk langsung panggil antrean selanjutnya.`
    ].filter(Boolean).join('\n');

    const notifications = [];

    // 1. Direct notification to the patient being called
    if (cleanCustomerPhone) {
      const headerTitle = isBarber ? '💈 *GILIRAN POTONG RAMBUT ANDA TIBA!*'
        : (isSalon ? '💇‍♀️ *GILIRAN PERAWATAN SALON ANDA TIBA!*'
        : (isSpa ? '🧖‍♀️ *GILIRAN TREATMENT SPA ANDA TIBA!*'
        : '🔔 *PANGGILAN PEMERIKSAAN DOKTER*'));

      const actionCall = isBarber ? 'Silakan langsung menuju ke kursi pangkas rambut sekarang. Terima kasih! 💈✂️'
        : (isSalon ? 'Silakan langsung menuju ke kursi perawatan salon Anda. Terima kasih! 💇‍♀️'
        : (isSpa ? 'Silakan langsung menuju ke ruang treatment Anda. Terima kasih! 🧖‍♀️'
        : 'Silakan langsung masuk ke ruang praktek dokter sekarang. Terima kasih! 🙏'));

      notifications.push({
        phone: cleanCustomerPhone,
        type: 'PATIENT_CALLED',
        message: [
          headerTitle,
          `----------------------------------------`,
          `Halo *${nextPatient.customer_name}*,`,
          `Giliran reservasi Anda di *${tenant.name}* telah tiba!`,
          ``,
          `📋 Layanan: *${serviceName}*`,
          actionCall
        ].join('\n')
      });
    }

    // 2. Queue nudge to the upcoming patient in line (if any)
    if (queue.length > 1) {
      const upcoming = queue[1];
      const cleanUpcomingPhone = this.db.normalizePhone
        ? this.db.normalizePhone(upcoming.customer_phone)
        : (upcoming.customer_phone ? upcoming.customer_phone.replace(/\D/g, '') : null);

      if (cleanUpcomingPhone) {
        notifications.push({
          phone: cleanUpcomingPhone,
          type: 'UPCOMING_NUDGE',
          message: [
            `⏳ *PENGINGAT ANTREAN ${tenant.name.toUpperCase()}*`,
            `----------------------------------------`,
            `Halo *${upcoming.customer_name}*,`,
            `${personLabel} sebelum Anda saat ini sedang dilayani di *${tenant.name}*.`,
            ``,
            `Mohon dapat bersiap-siap di ruang tunggu, giliran Anda akan dipanggil berikutnya! 🙏`
          ].join('\n')
        });
      }
    }

    return {
      action: 'PATIENT_CALLED',
      current_patient: nextPatient,
      reply,
      notifications
    };
  }

  handleCompletePatient(tenant) {
    let completedPatient = null;
    for (const appt of this.db.appointments.values()) {
      if (appt.tenant_id === tenant.id && appt.status === 'IN_CONSULTATION') {
        appt.status = 'COMPLETED';
        appt.updated_at = new Date().toISOString();
        completedPatient = appt;
        break;
      }
    }

    if (!completedPatient) {
      return {
        action: 'NO_ACTIVE_PATIENT',
        reply: `ℹ️ Tidak ada pasien yang sedang berstatus *IN_CONSULTATION*. Ketik *NEXT* untuk memanggil pasien berikutnya.`
      };
    }

    // Count remaining in queue
    const today = new Date().toISOString().slice(0, 10);
    const remaining = Array.from(this.db.appointments.values())
      .filter(a => a.tenant_id === tenant.id && a.status === 'CONFIRMED' && a.start_time.startsWith(today)).length;

    const notifications = [];
    if (completedPatient.customer_phone) {
      notifications.push({
        phone: completedPatient.customer_phone,
        type: 'PATIENT_COMPLETED',
        message: [
          `✅ *KONSULTASI SELESAI*`,
          `----------------------------------------`,
          `Terima kasih telah berkonsultasi di *${tenant.name}*, ${completedPatient.customer_name}! 🩺`,
          ``,
          `Semoga lekas sembuh dan sehat selalu. Jika membutuhkan reservasi lanjutan, silakan hubungi asisten kami kapan saja. 🙏`
        ].join('\n')
      });
    }

    return {
      action: 'PATIENT_COMPLETED',
      completed_patient: completedPatient,
      remaining_count: remaining,
      reply: `✅ Pasien *${completedPatient.customer_name}* selesai diperiksa.\n\nSisa antrean hari ini: *${remaining} pasien*.\nKetik *NEXT* untuk memanggil antrean berikutnya.`,
      notifications
    };
  }

  handleQueueStatus(tenant) {
    const now = new Date();
    const tz = tenant.timezone || 'Asia/Jakarta';
    let todayLocal = '';
    try {
      todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
    } catch (e) {
      todayLocal = now.toISOString().slice(0, 10);
    }
    const todayUtc = now.toISOString().slice(0, 10);

    let todayAppts = Array.from(this.db.appointments.values())
      .filter(a => {
        if (a.tenant_id !== tenant.id) return false;
        try {
          const apptDateLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(a.start_time));
          return apptDateLocal === todayLocal || a.start_time.startsWith(todayUtc);
        } catch (e) {
          return a.start_time.startsWith(todayUtc);
        }
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Fallback: If no appointments match today, show any recent appointments
    if (todayAppts.length === 0) {
      todayAppts = Array.from(this.db.appointments.values())
        .filter(a => a.tenant_id === tenant.id)
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        .slice(0, 10)
        .reverse();
    }

    if (todayAppts.length === 0) {
      return {
        action: 'STATUS',
        count: 0,
        reply: `📅 Belum ada jadwal pasien untuk hari ini (${todayLocal || todayUtc}).`
      };
    }

    const lines = todayAppts.map((a, idx) => {
      const timeStr = new Date(a.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz });
      const statusIcon = a.status === 'COMPLETED' ? '✅' : a.status === 'IN_CONSULTATION' ? '🩺' : a.status === 'CANCELLED' ? '❌' : '⏳';
      const statusLabel = a.status === 'CANCELLED' ? 'BATAL' : (a.status === 'IN_CONSULTATION' ? 'KONSULTASI' : (a.status === 'CONFIRMED' ? 'MENUNGGU' : a.status));
      return `${idx + 1}. [${timeStr}] ${statusIcon} *${a.customer_name}* (${statusLabel})`;
    });

    const waiting = todayAppts.filter(a => a.status === 'CONFIRMED').length;
    const inConsult = todayAppts.filter(a => a.status === 'IN_CONSULTATION').length;
    const completed = todayAppts.filter(a => a.status === 'COMPLETED').length;
    const cancelled = todayAppts.filter(a => a.status === 'CANCELLED').length;

    return {
      action: 'STATUS',
      count: todayAppts.length,
      reply: [
        `📋 *DAFTAR ANTREAN HARI INI (${todayLocal || todayUtc})*`,
        `Praktek: *${tenant.name}*`,
        `----------------------------------------`,
        ...lines,
        `----------------------------------------`,
        `⏳ Menunggu: ${waiting} | 🩺 Konsultasi: ${inConsult} | ✅ Selesai: ${completed} | ❌ Batal: ${cancelled}`
      ].join('\n')
    };
  }

  handleDashboardInsight(tenant) {
    const plan = (tenant.subscription_plan || 'FREE').toUpperCase();
    const isProOrAbove = ['PRO', 'CLINIC', 'LIFETIME_PARTNER'].includes(plan);

    if (!isProOrAbove) {
      const quotaLimit = plan === 'FREE' ? 25 : 100;
      return {
        action: 'DASHBOARD_LOCKED',
        chart_url: null,
        charts: null,
        reply: [
          `🔒 *FITUR VISUAL CHART ANALYTICS DIKUNCI*`,
          `----------------------------------------`,
          `Halo *${tenant.name}*, fitur Visual Chart harian & mingguan serta analisis omset adalah fitur eksklusif untuk paket *PRO* dan *Business*.`,
          ``,
          `📦 *Status Paket Anda:*`,
          `• Paket: *${plan}*`,
          `• Kuota Bulanan: ${quotaLimit} booking/bulan`,
          `• Visual Chart: 🔒 Belum Aktif`,
          ``,
          `✨ *Keunggulan Paket PRO:*`,
          `✓ 3 Visual Chart WhatsApp (Hari Ini, Mingguan, Bulanan)`,
          `✓ Analisis Omset & Rekap Keuangan Otomatis`,
          `✓ Smart Nudge Timer Durasi Layanan`,
          `✓ Kuota hingga 400 booking/bulan`,
          `----------------------------------------`,
          `Silakan hubungi admin atau upgrade paket Anda melalui website untuk membuka fitur ini.`
        ].join('\n')
      };
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // --- 1. METRICS & CHART HARI INI ---
    const todayAppts = Array.from(this.db.appointments.values())
      .filter(a => (a.tenant_id === tenant.id || a.tenant_id === tenant.slug) && (a.start_time || a.scheduled_time || a.created_at || '').startsWith(today));

    let completedToday = 0;
    let waitingToday = 0;
    let cancelledToday = 0;
    let revenueToday = 0;

    for (const a of todayAppts) {
      if (a.status === 'COMPLETED') completedToday++;
      else if (a.status === 'CONFIRMED' || a.status === 'IN_CONSULTATION') waitingToday++;
      else if (a.status === 'CANCELLED') cancelledToday++;

      if (a.status !== 'CANCELLED') {
        const srv = this.db.services.get(a.service_id);
        if (srv) revenueToday += (srv.price || 0);
      }
    }

    const chartTodayUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'doughnut',
      data: {
        labels: ['Selesai', 'Menunggu', 'Batal'],
        datasets: [{
          data: [completedToday, waitingToday, cancelledToday],
          backgroundColor: ['#10b981', '#3b82f6', '#ef4444']
        }]
      },
      options: {
        title: { display: true, text: `Pasien Hari Ini (${today})` }
      }
    }))}`;

    // --- 2. METRICS & CHART MINGGU INI (DAILY BASIS: MON - SUN) ---
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);

    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekCounts = [0, 0, 0, 0, 0, 0, 0];
    const weekRevenue = [0, 0, 0, 0, 0, 0, 0];
    let totalWeekAppts = 0;
    let totalWeekRevenue = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);

      for (const a of this.db.appointments.values()) {
        if ((a.tenant_id === tenant.id || a.tenant_id === tenant.slug) && a.status !== 'CANCELLED') {
          const aDateStr = (a.start_time || a.scheduled_time || a.created_at || '').slice(0, 10);
          if (aDateStr === dStr) {
            weekCounts[i]++;
            totalWeekAppts++;
            const srv = this.db.services.get(a.service_id);
            const p = srv ? (srv.price || 0) : 0;
            weekRevenue[i] += p;
            totalWeekRevenue += p;
          }
        }
      }
    }

    const chartWeekUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Pasien (Daily)',
          data: weekCounts,
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        title: { display: true, text: 'Volume Pasien Minggu Ini (Daily: Mon - Sun)' }
      }
    }))}`;

    // --- 3. METRICS & CHART BULAN INI (WEEKLY BASIS: WEEK 1 - 4) ---
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const monthWeeksLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4+'];
    const monthWeeksCounts = [0, 0, 0, 0];
    const monthWeeksRevenue = [0, 0, 0, 0];
    let totalMonthAppts = 0;
    let totalMonthRevenue = 0;

    for (const a of this.db.appointments.values()) {
      if ((a.tenant_id === tenant.id || a.tenant_id === tenant.slug) && a.status !== 'CANCELLED') {
        const refStr = a.start_time || a.scheduled_time || a.created_at;
        if (refStr) {
          const aDate = new Date(refStr);
          if (!isNaN(aDate.getTime()) && aDate.getFullYear() === curYear && aDate.getMonth() === curMonth) {
            const dayNum = aDate.getDate();
            let wIdx = 0;
            if (dayNum <= 7) wIdx = 0;
            else if (dayNum <= 14) wIdx = 1;
            else if (dayNum <= 21) wIdx = 2;
            else wIdx = 3;

            monthWeeksCounts[wIdx]++;
            totalMonthAppts++;
            const srv = this.db.services.get(a.service_id);
            const p = srv ? (srv.price || 0) : 0;
            monthWeeksRevenue[wIdx] += p;
            totalMonthRevenue += p;
          }
        }
      }
    }

    const chartMonthUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'bar',
      data: {
        labels: monthWeeksLabels,
        datasets: [{
          label: 'Pasien per Minggu',
          data: monthWeeksCounts,
          backgroundColor: '#8b5cf6'
        }]
      },
      options: {
        title: { display: true, text: `Tren Pasien ${monthName} (Weekly Basis)` }
      }
    }))}`;

    const weekSummaryStr = weekLabels.map((lbl, idx) => `${lbl}:${weekCounts[idx]}`).join(' ');
    const monthSummaryStr = monthWeeksLabels.map((lbl, idx) => `${lbl}:${monthWeeksCounts[idx]}`).join(' ');

    return {
      action: 'DASHBOARD',
      metrics: {
        today: { total: todayAppts.length, completed: completedToday, waiting: waitingToday, revenue: revenueToday },
        week: { total: totalWeekAppts, revenue: totalWeekRevenue, daily: weekCounts },
        month: { total: totalMonthAppts, revenue: totalMonthRevenue, weekly: monthWeeksCounts }
      },
      charts: {
        today: chartTodayUrl,
        week: chartWeekUrl,
        month: chartMonthUrl
      },
      chart_url: chartTodayUrl,
      reply: [
        `📊 *DASHBOARD & REKAP KINERJA PRAKTEK*`,
        `Praktek : *${tenant.name}*`,
        `Status  : ${tenant.is_accepting_patients ? '🟢 BUKA (Menerima Pasien)' : '🛑 TUTUP'}`,
        `----------------------------------------`,
        `📅 *1. HARI INI (${today})*`,
        `• Total Pasien : *${todayAppts.length}* (${completedToday} Selesai, ${waitingToday} Menunggu)`,
        `• Estimasi Omzet : *Rp ${revenueToday.toLocaleString('id-ID')}*`,
        `📈 *Visual Chart Hari Ini:*`,
        `${chartTodayUrl}`,
        ``,
        `📆 *2. MINGGU INI (Daily Basis)*`,
        `• Total Minggu Ini : *${totalWeekAppts} pasien*`,
        `• Estimasi Omzet   : *Rp ${totalWeekRevenue.toLocaleString('id-ID')}*`,
        `• Rincian Harian   : ${weekSummaryStr}`,
        `📈 *Visual Chart Minggu Ini (Mon - Sun):*`,
        `${chartWeekUrl}`,
        ``,
        `🗓️ *3. BULAN INI (Weekly Basis: ${monthName})*`,
        `• Total Bulan Ini  : *${totalMonthAppts} booking*`,
        `• Estimasi Omzet   : *Rp ${totalMonthRevenue.toLocaleString('id-ID')}*`,
        `• Rincian Mingguan : ${monthSummaryStr}`,
        `📈 *Visual Chart Bulan Ini (Week 1 - 4):*`,
        `${chartMonthUrl}`,
        `----------------------------------------`,
        `💡 Ketik *TARIF* untuk melihat & mengatur harga layanan.`
      ].join('\n')
    };
  }

  handleServicesList(tenant) {
    const services = Array.from(this.db.services.values())
      .filter(s => (s.tenant_id === tenant.id || s.tenant_id === tenant.slug) && s.is_active);

    if (services.length === 0) {
      return {
        action: 'SERVICES_EMPTY',
        reply: `📋 Belum ada layanan terdaftar untuk *${tenant.name}*.\n\nKetik *TAMBAH [nama], [durasi], [harga]* untuk menambahkan layanan pertama.`
      };
    }

    const lines = services.map((s, idx) => {
      return `${idx + 1}. *${s.name}*\n   💰 Tarif: Rp ${(s.price || 0).toLocaleString('id-ID')} | ⏱️ ${s.duration_minutes} menit`;
    });

    return {
      action: 'SERVICES_LIST',
      services,
      reply: [
        `📋 *DAFTAR LAYANAN & TARIF PRAKTEK*`,
        `Praktek : *${tenant.name}*`,
        `----------------------------------------`,
        ...lines,
        `----------------------------------------`,
        `✏️ *CARA UBAH TARIF:*`,
        `Ketik: *TARIF [nomor] [harga_baru]*`,
        `Contoh: *TARIF 1 80000*`,
        ``,
        `➕ *CARA TAMBAH LAYANAN:*`,
        `Ketik: *TAMBAH [nama], [durasi_menit], [harga]*`,
        `Contoh: *TAMBAH Cukur Kumis, 15, 30000*`
      ].join('\n')
    };
  }

  handleUpdateServicePrice(tenant, targetInput, newPrice) {
    const services = Array.from(this.db.services.values())
      .filter(s => (s.tenant_id === tenant.id || s.tenant_id === tenant.slug) && s.is_active);

    let targetService = null;
    const numIdx = parseInt(targetInput, 10);
    if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= services.length) {
      targetService = services[numIdx - 1];
    } else {
      targetService = services.find(s => s.name.toLowerCase().includes(targetInput.toLowerCase()));
    }

    if (!targetService) {
      return {
        action: 'SERVICE_NOT_FOUND',
        reply: `⚠️ Layanan "${targetInput}" tidak ditemukan.\nKetik *TARIF* untuk melihat nomor dan nama layanan yang tersedia.`
      };
    }

    const oldPrice = targetService.price || 0;
    const priceNum = Number(newPrice);
    targetService.price = priceNum;
    targetService.updated_at = new Date().toISOString();
    this.db.saveToFile();

    return {
      action: 'SERVICE_PRICE_UPDATED',
      service: targetService,
      reply: [
        `✅ *TARIF LAYANAN BERHASIL DIPERBARUI!*`,
        `----------------------------------------`,
        `🩺 Layanan: *${targetService.name}*`,
        `💰 Tarif Baru: *Rp ${priceNum.toLocaleString('id-ID')}*`,
        `*(Sebelumnya: Rp ${oldPrice.toLocaleString('id-ID')})*`,
        `----------------------------------------`,
        `Perhitungan omset dan insight berikutnya otomatis menggunakan tarif terbaru ini.`
      ].join('\n')
    };
  }

  handleAddService(tenant, name, duration, price) {
    const srv = this.db.createService({
      tenant_id: tenant.id,
      name: name.trim(),
      duration_minutes: Number(duration) || 30,
      price: Number(price) || 0,
      is_active: true
    });

    return {
      action: 'SERVICE_CREATED',
      service: srv,
      reply: [
        `✅ *LAYANAN BARU BERHASIL DITAMBAHKAN!*`,
        `----------------------------------------`,
        `🩺 Layanan: *${srv.name}*`,
        `⏱️ Durasi: *${srv.duration_minutes} menit*`,
        `💰 Tarif: *Rp ${srv.price.toLocaleString('id-ID')}*`,
        `----------------------------------------`,
        `Pasien kini dapat langsung memilih layanan ini saat reservasi.`
      ].join('\n')
    };
  }

  checkConsultationNudge(tenantId, maxMinutes = 20) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) return null;

    const now = Date.now();
    for (const appt of this.db.appointments.values()) {
      if (appt.tenant_id === tenantId && appt.status === 'IN_CONSULTATION' && appt.consultation_started_at) {
        const elapsedMinutes = (now - new Date(appt.consultation_started_at).getTime()) / (60 * 1000);
        if (elapsedMinutes >= maxMinutes) {
          return {
            triggered: true,
            appointment_id: appt.id,
            patient_name: appt.customer_name,
            elapsed_minutes: Math.round(elapsedMinutes),
            message: `⚠️ *SMART NUDGE:* Konsultasi dengan *${appt.customer_name}* sudah berjalan ${Math.round(elapsedMinutes)} menit. Ketik *DONE* jika sudah selesai untuk memanggil pasien berikutnya.`
          };
        }
      }
    }
    return { triggered: false };
  }
}

module.exports = {
  DoctorCopilotEngine
};
