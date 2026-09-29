/**
 * EXACTLY-ONCE IDEMPOTENCY SERVICE
 * PRD Section 7: Idempotency Key Handling & 7 Concurrency Scenarios
 */

const crypto = require('crypto');

class IdempotencyService {
  constructor(db) {
    this.db = db;
    this.inFlightLocks = new Map(); // Composite key `${tenantId}:${key}`
  }

  calculatePayloadHash(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Execute an operation with strict exactly-once semantics
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.idempotencyKey
   * @param {Object} params.payload
   * @param {Function} params.fn Operation returning Promise<{ status: number, body: any }>
   * @returns {Promise<{ status: number, body: any, cached: boolean }>}
   */
  async execute({ tenantId, idempotencyKey, payload, fn }) {
    if (!idempotencyKey) {
      // Without idempotency key, execute directly
      const result = await fn();
      return { ...result, cached: false };
    }

    const lockKey = `${tenantId}:${idempotencyKey}`;
    const payloadHash = this.calculatePayloadHash(payload);
    const now = new Date();

    // Scenario 4: Concurrent in-flight request check
    if (this.inFlightLocks.has(lockKey)) {
      const err = new Error(`Concurrent in-flight request detected for key [${idempotencyKey}]`);
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_FLIGHT';
      throw err;
    }

    // Check existing record
    const existing = this.db.getIdempotencyRecord(tenantId, idempotencyKey);

    if (existing) {
      const expiresAt = new Date(existing.expires_at);

      // Scenario 5: Expired key (> 24 hours) -> purge & treat as fresh
      if (now > expiresAt) {
        this.db.idempotencyRecords.delete(existing.id);
      } else {
        // Scenario 3: Same key + different payload within valid window -> 409 Conflict
        if (existing.payload_hash !== payloadHash) {
          const err = new Error(`Idempotency key [${idempotencyKey}] was already used with a different payload.`);
          err.statusCode = 409;
          err.code = 'IDEMPOTENCY_PAYLOAD_MISMATCH';
          throw err;
        }

        // Scenario 2: Same key + identical payload -> return cached response
        if (existing.response_status && existing.response_status < 400) {
          return {
            status: existing.response_status,
            body: existing.response_body,
            cached: true
          };
        }

        // Scenario 6: Prior request failed / errored (5xx or 4xx) -> allow retry by dropping old record
        this.db.idempotencyRecords.delete(existing.id);
      }
    }

    // Acquire in-flight lock
    this.inFlightLocks.set(lockKey, Date.now());

    try {
      // Scenario 1: First time execution
      const result = await fn();

      // Record successful result in database with 24-hour expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      this.db.saveIdempotencyRecord({
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        payload_hash: payloadHash,
        response_status: result.status || 200,
        response_body: result.body,
        expires_at: expiresAt
      });

      return {
        status: result.status || 200,
        body: result.body,
        cached: false
      };
    } finally {
      // Release in-flight lock
      this.inFlightLocks.delete(lockKey);
    }
  }
}

module.exports = {
  IdempotencyService
};
