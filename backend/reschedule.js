/**
 * CUSTOMER SELF-SERVICE RESCHEDULING (ATOMIC SWAP)
 * PRD Section 9: State transitions, Cutoff constraints (H-2 hours), Max reschedule limits
 */

class RescheduleService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Reschedule an appointment atomically
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.appointmentId
   * @param {string} params.newStartTime ISO String
   * @param {string} [params.customerPhone] Optional verification
   * @returns {Object} { success: boolean, originalAppointment, newAppointment }
   */
  async rescheduleAppointment({ tenantId, appointmentId, newStartTime, customerPhone }) {
    const tenant = this.db.tenants.get(tenantId);
    if (!tenant) {
      const err = new Error(`Tenant ${tenantId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const original = this.db.appointments.get(appointmentId);
    if (!original || original.tenant_id !== tenantId) {
      const err = new Error(`Appointment ${appointmentId} not found for this practice`);
      err.statusCode = 404;
      throw err;
    }

    if (customerPhone && original.customer_phone !== customerPhone) {
      const err = new Error('Customer phone verification failed');
      err.statusCode = 403;
      throw err;
    }

    // 1. Status check: Only CONFIRMED appointments can be rescheduled
    if (original.status !== 'CONFIRMED') {
      const err = new Error(`Appointment cannot be rescheduled because its status is ${original.status}`);
      err.statusCode = 400;
      err.code = 'INVALID_STATUS_FOR_RESCHEDULE';
      throw err;
    }

    // 2. Count limit check
    const maxCount = tenant.max_reschedule_count || 2;
    if (original.reschedule_count >= maxCount) {
      const err = new Error(`Batas maksimal perubahan jadwal (${maxCount}x) telah tercapai untuk reservasi ini.`);
      err.statusCode = 400;
      err.code = 'MAX_RESCHEDULE_EXCEEDED';
      throw err;
    }

    // 3. Cutoff window check: H-2 hours (or tenant.reschedule_cutoff_hours)
    const cutoffHours = tenant.reschedule_cutoff_hours !== undefined ? tenant.reschedule_cutoff_hours : 2;
    const now = new Date();
    const origStart = new Date(original.start_time);
    const cutoffThreshold = new Date(origStart.getTime() - cutoffHours * 60 * 60 * 1000);

    if (now > cutoffThreshold) {
      const err = new Error(`Perubahan jadwal ditutup ${cutoffHours} jam sebelum waktu praktek. Silakan hubungi langsung resepsionis.`);
      err.statusCode = 400;
      err.code = 'RESCHEDULE_CUTOFF_EXCEEDED';
      throw err;
    }

    // Calculate new start and end times based on service duration
    const service = this.db.services.get(original.service_id);
    const duration = service ? service.duration_minutes : 30;
    const targetStart = new Date(newStartTime);

    if (isNaN(targetStart.getTime()) || targetStart <= now) {
      const err = new Error('Waktu reservasi baru harus berada di masa mendatang');
      err.statusCode = 400;
      err.code = 'INVALID_TARGET_TIME';
      throw err;
    }

    const targetEnd = new Date(targetStart.getTime() + duration * 60 * 1000);

    // 4. Atomic Swap: execute inside transactional lock
    // Check overlap for new target time, ignoring the current original appointment (since it will be swapped)
    const hasOverlap = this.db.checkSlotOverlap(tenantId, targetStart.toISOString(), targetEnd.toISOString(), original.id);
    if (hasOverlap) {
      const err = new Error(`Jadwal pada ${targetStart.toISOString()} telah terisi. Silakan pilih slot lain.`);
      err.statusCode = 409;
      err.code = 'SLOT_OVERLAP';
      throw err;
    }

    // Perform atomic state updates
    // A. Update original to RESCHEDULED
    original.status = 'RESCHEDULED';
    original.updated_at = new Date().toISOString();

    // B. Insert new appointment
    try {
      const newAppt = this.db.createAppointment({
        tenant_id: tenantId,
        service_id: original.service_id,
        customer_name: original.customer_name,
        customer_phone: original.customer_phone,
        start_time: targetStart.toISOString(),
        end_time: targetEnd.toISOString(),
        status: 'CONFIRMED',
        parent_booking_id: original.id,
        reschedule_count: original.reschedule_count + 1
      });

      return {
        success: true,
        original_appointment_id: original.id,
        new_appointment: newAppt
      };
    } catch (swapErr) {
      // Rollback original status in case of failure
      original.status = 'CONFIRMED';
      throw swapErr;
    }
  }
}

module.exports = {
  RescheduleService
};
