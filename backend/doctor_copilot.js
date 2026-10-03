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

    const normalizedCmd = (commandText || '').trim().toUpperCase();

    // Check if practice subscription has expired
    if (tenant.subscription_until && new Date(tenant.subscription_until) < new Date()) {
      return {
        action: 'SUBSCRIPTION_EXPIRED',
        reply: `⚠️ *MASA LANGGANAN BERAKHIR*\n\nPaket langganan untuk *${tenant.name}* telah berakhir pada ${tenant.subscription_until.slice(0, 10)}.\n\nSilakan perpanjang langganan Anda melalui tagihan Mayar atau hubungi admin agar asisten AI kembali aktif melayani pasien.`
      };
    }

    // 1. Command: NEXT / BERIKUTNYA / PANGGIL
    if (/^(NEXT|BERIKUTNYA|PANGGIL)/i.test(normalizedCmd) || normalizedCmd === 'NEXT') {
      return this.handleNextPatient(tenant);
    }

    // 2. Command: DONE / SELESAI
    if (/^(DONE|SELESAI)/i.test(normalizedCmd)) {
      return this.handleCompletePatient(tenant);
    }

    // 3. Command: STATUS / ANTREAN / DAFTAR / JADWAL / REKAP
    if (/(STATUS|ANTREAN|DAFTAR|JADWAL|REKAP|HARI INI|LIST)/i.test(normalizedCmd)) {
      return this.handleQueueStatus(tenant);
    }

    // 4. Command: DASHBOARD / RINGKASAN / INSIGHT / OMSET
    if (/(DASHBOARD|RINGKASAN|INSIGHT|OMSET|PENDAPATAN)/i.test(normalizedCmd)) {
      return this.handleDashboardInsight(tenant);
    }

    // 5. Command: TUTUP / ISTIRAHAT / PAUSE
    if (/(TUTUP|ISTIRAHAT|PAUSE)/i.test(normalizedCmd)) {
      tenant.is_accepting_patients = false;
      tenant.updated_at = new Date().toISOString();
      return {
        action: 'TOGGLE_PRACTICE',
        status: 'CLOSED',
        reply: `🛑 *PRAKTEK DITUTUP SEMENTARA*\n\nPenerimaan reservasi baru dihentikan sementara waktu. Pasien yang mencoba booking via WhatsApp akan diinformasikan secara otomatis bahwa dokter sedang rehat.\n\nKetik *BUKA* kapan saja untuk mengaktifkan kembali.`
      };
    }

    // 6. Command: BUKA / AKTIF / RESUME
    if (/(BUKA|AKTIF|RESUME)/i.test(normalizedCmd)) {
      tenant.is_accepting_patients = true;
      tenant.updated_at = new Date().toISOString();
      return {
        action: 'TOGGLE_PRACTICE',
        status: 'OPEN',
        reply: `🟢 *PRAKTEK TELAH DIBUKA KEMBALI*\n\nZeroWeb AI Receptionist aktif kembali menerima reservasi pasien baru.`
      };
    }

    // Fallback menu assistance
    return {
      action: 'HELP',
      reply: [
        `👨‍⚕️ *KOPILOT DOKTER - PERINTAH TERSEDIA*`,
        `----------------------------------------`,
        `👉 *NEXT* : Panggil pasien antrean berikutnya`,
        `👉 *DONE* : Selesaikan pasien yang sedang diperiksa`,
        `👉 *STATUS* atau *JADWAL* : Lihat semua jadwal pasien hari ini`,
        `👉 *DASHBOARD* atau *REKAP* : Ringkasan statistik & omset hari ini`,
        `👉 *TUTUP* : Hentikan sementara reservasi baru`,
        `👉 *BUKA* : Aktifkan kembali reservasi baru`,
        `----------------------------------------`
      ].join('\n')
    };
  }

  handleNextPatient(tenant) {
    const today = new Date().toISOString().slice(0, 10);

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
    const queue = Array.from(this.db.appointments.values())
      .filter(a => a.tenant_id === tenant.id && a.status === 'CONFIRMED' && a.start_time.startsWith(today))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (queue.length === 0) {
      return {
        action: 'QUEUE_EMPTY',
        reply: `✅ *ANTREAN HARI INI HABIS!*\n\nTidak ada pasien menunggu lagi untuk hari ini (${today}). Kerja bagus, Dok!`
      };
    }

    const nextPatient = queue[0];
    nextPatient.status = 'IN_CONSULTATION';
    nextPatient.consultation_started_at = new Date().toISOString();
    nextPatient.updated_at = new Date().toISOString();

    const service = this.db.services.get(nextPatient.service_id);
    const serviceName = service ? service.name : 'Pemeriksaan Umum';

    const reply = [
      `🔔 *PASIEN BERIKUTNYA DIPANGGIL*`,
      `----------------------------------------`,
      `👤 Pasien : *${nextPatient.customer_name}*`,
      `📱 Telepon : ${nextPatient.customer_phone}`,
      `🩺 Layanan : *${serviceName}*`,
      `⏰ Jadwal : ${new Date(nextPatient.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      `🔢 ID Reservasi : \`${nextPatient.id.slice(0, 8)}\``,
      previousPatient ? `\n*(Pasien sebelumnya ${previousPatient.customer_name} telah ditandai SELESAI)*` : '',
      `\nKetik *DONE* bila pemeriksaan selesai, atau *NEXT* untuk langsung panggil pasien selanjutnya.`
    ].filter(Boolean).join('\n');

    return {
      action: 'PATIENT_CALLED',
      current_patient: nextPatient,
      reply
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

    return {
      action: 'PATIENT_COMPLETED',
      completed_patient: completedPatient,
      remaining_count: remaining,
      reply: `✅ Pasien *${completedPatient.customer_name}* selesai diperiksa.\n\nSisa antrean hari ini: *${remaining} pasien*.\nKetik *NEXT* untuk memanggil antrean berikutnya.`
    };
  }

  handleQueueStatus(tenant) {
    const today = new Date().toISOString().slice(0, 10);
    const todayAppts = Array.from(this.db.appointments.values())
      .filter(a => a.tenant_id === tenant.id && a.start_time.startsWith(today))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (todayAppts.length === 0) {
      return {
        action: 'STATUS',
        count: 0,
        reply: `📅 Belum ada jadwal pasien untuk hari ini (${today}).`
      };
    }

    const lines = todayAppts.map((a, idx) => {
      const timeStr = new Date(a.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const statusIcon = a.status === 'COMPLETED' ? '✅' : a.status === 'IN_CONSULTATION' ? '🩺' : a.status === 'CANCELLED' ? '❌' : '⏳';
      return `${idx + 1}. [${timeStr}] ${statusIcon} *${a.customer_name}* (${a.status})`;
    });

    return {
      action: 'STATUS',
      count: todayAppts.length,
      reply: [
        `📋 *DAFTAR ANTREAN HARI INI (${today})*`,
        `Praktek: *${tenant.name}*`,
        `----------------------------------------`,
        ...lines,
        `----------------------------------------`,
        `Keterangan: 🩺 Sedang Konsultasi | ⏳ Menunggu | ✅ Selesai`
      ].join('\n')
    };
  }

  handleDashboardInsight(tenant) {
    const today = new Date().toISOString().slice(0, 10);
    const todayAppts = Array.from(this.db.appointments.values())
      .filter(a => a.tenant_id === tenant.id && a.start_time.startsWith(today));

    let completed = 0;
    let waiting = 0;
    let totalRevenue = 0;

    for (const a of todayAppts) {
      if (a.status === 'COMPLETED') completed++;
      if (a.status === 'CONFIRMED' || a.status === 'IN_CONSULTATION') waiting++;
      if (a.status !== 'CANCELLED') {
        const srv = this.db.services.get(a.service_id);
        if (srv) totalRevenue += srv.price;
      }
    }

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'bar',
      data: {
        labels: ['Selesai', 'Menunggu', 'Batal'],
        datasets: [{
          label: 'Pasien Hari Ini',
          data: [completed, waiting, todayAppts.length - (completed + waiting)],
          backgroundColor: ['#10b981', '#3b82f6', '#ef4444']
        }]
      }
    }))}`;

    return {
      action: 'DASHBOARD',
      metrics: {
        total: todayAppts.length,
        completed,
        waiting,
        estimated_revenue: totalRevenue,
        is_accepting: tenant.is_accepting_patients
      },
      chart_url: chartUrl,
      reply: [
        `📊 *RINGKASAN & INSIGHT PRAKTEK*`,
        `Praktek : *${tenant.name}*`,
        `Status  : ${tenant.is_accepting_patients ? '🟢 BUKA (Menerima Pasien)' : '🛑 TUTUP'}`,
        `----------------------------------------`,
        `👥 Total Pasien Hari Ini : *${todayAppts.length}*`,
        `✅ Sudah Selesai         : *${completed}*`,
        `⏳ Menunggu/Berjalan     : *${waiting}*`,
        `💰 Estimasi Omzet Hari Ini: *Rp ${totalRevenue.toLocaleString('id-ID')}*`,
        `----------------------------------------`,
        `📈 Visual Chart: ${chartUrl}`
      ].join('\n')
    };
  }

  /**
   * Smart Nudge: Check if any active consultation exceeds max threshold (e.g. 20 mins)
   */
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
