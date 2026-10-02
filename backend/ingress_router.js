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
  resolveDoctorTenant(senderPhone) {
    const cleanPhone = senderPhone.replace(/\D/g, '');
    for (const tenant of this.db.tenants.values()) {
      if (tenant.owner_phone.replace(/\D/g, '') === cleanPhone) {
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

    // Save/update session
    this.db.saveSession(cleanPhone, {
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

    // Check Reschedule intent: RESCHEDULE_{appointment_id}
    const reschedMatch = cleanText.match(/^RESCHEDULE_([a-zA-Z0-9-]+)/i);
    if (reschedMatch) {
      const apptId = reschedMatch[1];
      return {
        recipient_type: 'PATIENT',
        tenant: targetTenant,
        action: 'PROMPT_RESCHEDULE_SLOT',
        appointment_id: apptId,
        message: `Silakan pilih waktu pengganti baru untuk reservasi Anda. (Ketik tanggal & jam yang diinginkan, misal: YYYY-MM-DD HH:mm)`
      };
    }

    // Default Patient Welcome & Service Catalog Menu
    const services = this.db.getServicesByTenant(targetTenant.id);
    const serviceList = services.map((s, i) => `${i + 1}. *${s.name}* (${s.duration_minutes} menit - Rp ${s.price.toLocaleString('id-ID')})`).join('\n');

    return {
      recipient_type: 'PATIENT',
      tenant: targetTenant,
      response_type: 'MENU',
      message: [
        `🏥 *SELAMAT DATANG DI ${targetTenant.name.toUpperCase()}*`,
        `Resepsionis Otonom AI siap membantu reservasi Anda secara cepat & mudah.`,
        `----------------------------------------`,
        `📋 *Layanan Tersedia:*`,
        serviceList || 'Pemeriksaan Dokter',
        `----------------------------------------`,
        `Silakan balas dengan nama lengkap dan pilihan layanan untuk memilih jam konsultasi yang tersedia.`
      ].join('\n')
    };
  }
}

module.exports = {
  IngressRouter
};
