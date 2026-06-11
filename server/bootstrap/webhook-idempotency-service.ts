import { randomUUID } from 'node:crypto';

export interface WebhookProcessingRecord {
  readonly webhookId: string;
  readonly transmissionId: string;
  readonly orderId: string;
  readonly processedAt: number;
  readonly paymentId: string;
  readonly status: 'success' | 'failure';
  readonly errorMessage?: string;
}

export interface WebhookIdempotencyState {
  readonly records: Map<string, WebhookProcessingRecord>;
}

/**
 * WebhookIdempotencyService enforces exactly-once webhook processing.
 * - Prevents duplicate event handling from replayed webhooks
 * - Tracks transmission IDs to detect PayPal webhook retries
 * - Cleans stale records after 24 hours to prevent memory bloat
 */
export class WebhookIdempotencyService {
  private readonly state: WebhookIdempotencyState;
  private readonly maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupIntervalMs = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.state = {
      records: new Map()
    };
    this.startCleanupInterval();
  }

  /**
   * Check if a webhook transmission has already been processed.
   * Returns the previous result if found, otherwise null.
   */
  public checkDuplicate(transmissionId: string): WebhookProcessingRecord | null {
    const record = this.state.records.get(transmissionId);
    if (!record) {
      return null;
    }

    // If record is stale, treat as new
    if (Date.now() - record.processedAt > this.maxAgeMs) {
      this.state.records.delete(transmissionId);
      return null;
    }

    return record;
  }

  /**
   * Mark a webhook transmission as processed.
   * Call this AFTER successful webhook handling.
   */
  public recordSuccess(
    transmissionId: string,
    orderId: string,
    paymentId: string
  ): WebhookProcessingRecord {
    const record: WebhookProcessingRecord = {
      webhookId: randomUUID(),
      transmissionId,
      orderId,
      processedAt: Date.now(),
      paymentId,
      status: 'success'
    };

    this.state.records.set(transmissionId, record);
    return record;
  }

  /**
   * Mark a webhook transmission as failed.
   * Call this if webhook processing fails.
   */
  public recordFailure(
    transmissionId: string,
    orderId: string,
    errorMessage: string
  ): WebhookProcessingRecord {
    const record: WebhookProcessingRecord = {
      webhookId: randomUUID(),
      transmissionId,
      orderId,
      processedAt: Date.now(),
      paymentId: '',
      status: 'failure',
      errorMessage
    };

    this.state.records.set(transmissionId, record);
    return record;
  }

  /**
   * Validate webhook timestamp to detect old replays.
   * PayPal webhooks are typically sent within 5 seconds of event creation.
   * Allow up to 5 minutes of clock skew.
   */
  public validateTimestamp(transmissionTimeHeader: string | undefined): {
    valid: boolean;
    reason?: string;
  } {
    if (!transmissionTimeHeader) {
      return { valid: false, reason: 'Missing paypal-transmission-time header' };
    }

    try {
      const transmissionTime = new Date(transmissionTimeHeader).getTime();
      const now = Date.now();
      const ageSec = (now - transmissionTime) / 1000;
      const maxAgeSec = 5 * 60; // 5 minutes

      if (ageSec < -30) {
        // Clock skew: transmission time is in the future
        return { valid: false, reason: `Webhook timestamp is in the future (skew: ${ageSec}s)` };
      }

      if (ageSec > maxAgeSec) {
        return { valid: false, reason: `Webhook timestamp too old (age: ${ageSec}s, max: ${maxAgeSec}s)` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Failed to parse transmission time: ${String(error)}` };
    }
  }

  /**
   * Get processing history for a specific order (for reconciliation).
   */
  public getOrderHistory(orderId: string): WebhookProcessingRecord[] {
    const records: WebhookProcessingRecord[] = [];
    for (const record of this.state.records.values()) {
      if (record.orderId === orderId) {
        records.push(record);
      }
    }
    return records;
  }

  /**
   * Cleanup stale records periodically.
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const entriesToDelete: string[] = [];

      for (const [transmissionId, record] of this.state.records.entries()) {
        if (now - record.processedAt > this.maxAgeMs) {
          entriesToDelete.push(transmissionId);
        }
      }

      for (const transmissionId of entriesToDelete) {
        this.state.records.delete(transmissionId);
      }

      if (entriesToDelete.length > 0) {
        console.log(`[WebhookIdempotency] Cleaned up ${entriesToDelete.length} stale records`);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Get total processed webhook count (for metrics/debugging).
   */
  public getStats(): {
    totalRecords: number;
    successCount: number;
    failureCount: number;
  } {
    let successCount = 0;
    let failureCount = 0;

    for (const record of this.state.records.values()) {
      if (record.status === 'success') {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      totalRecords: this.state.records.size,
      successCount,
      failureCount
    };
  }
}
