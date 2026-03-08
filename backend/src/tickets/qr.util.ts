import * as crypto from 'crypto';

export interface QRPayload {
  t: string; // ticketId
  s: string; // showId
  exp: number; // expiration (unix timestamp)
}

export class QrUtil {
  /**
   * Generates a securely signed QR token.
   * Format: version.base64(payload).signature
   */
  static generateSignedToken(payload: QRPayload, secret: string): string {
    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const base64Payload = payloadBuffer.toString('base64');
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(base64Payload)
      .digest('hex');

    return `v1.${base64Payload}.${signature}`;
  }

  /**
   * Generates the SHA-256 hash of the entire token for database persistence.
   * Do NOT store full tokens in DB, only hashes to protect isolated lookups.
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Strictly validates a token. Parses payload and cryptographically
   * ensures the signature matches via constant-time timingSafeEqual validation.
   */
  static validateToken(token: string, secret: string): { isValid: boolean; payload?: QRPayload } {
    if (!token || typeof token !== 'string') return { isValid: false };

    const parts = token.split('.');
    // Must exactly match version.rawPayload.HMAC
    if (parts.length !== 3) return { isValid: false };

    const [version, base64Payload, incomingSignature] = parts;

    // Reject unsupported versions early
    if (version !== 'v1') return { isValid: false };

    // 1. Recompute HMAC against the raw payload part isolated
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(base64Payload)
      .digest('hex');

    // 2. IMPORTANT: Constant-time comparison to prevent timing padding attacks
    // Provide uniform buffers mapped explicitly over utf-8 strings
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const incomingBuffer = Buffer.from(incomingSignature, 'utf8');

    // Reject unequal lengths instantly before timingSafeEqual to avoid crashes
    if (expectedBuffer.length !== incomingBuffer.length) {
      return { isValid: false };
    }

    if (!crypto.timingSafeEqual(expectedBuffer, incomingBuffer)) {
      return { isValid: false };
    }

    // 3. Signature matched safely! Decode payload.
    try {
      const decodedString = Buffer.from(base64Payload, 'base64').toString('utf8');
      const payload: QRPayload = JSON.parse(decodedString);
      
      // Basic runtime structural checks
      if (!payload.t || !payload.s || !payload.exp) {
        return { isValid: false };
      }

      return { isValid: true, payload };
    } catch (e) {
      return { isValid: false };
    }
  }
}
