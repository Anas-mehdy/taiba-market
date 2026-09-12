import crypto from 'crypto';

const PIN_SECRET = process.env.STORE_PIN_SECRET || 'tayba-market-pin-secret-key-2026-safe-secure-token';
const ALGORITHM = 'aes-256-cbc';
// Generate a deterministic 32-byte key and 16-byte IV base from PIN_SECRET
const KEY = crypto.createHash('sha256').update(PIN_SECRET).digest();
const IV = crypto.createHash('md5').update(PIN_SECRET).digest();

/**
 * Normalizes Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to standard Western digits (0-9).
 * Also trims all whitespace.
 */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
}

/**
 * Encrypts the plain PIN so that it can be stored securely in the database
 * without exposing the clear-text PIN to anyone with read access.
 */
export function encryptPin(plainPin: string): string {
  try {
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
    let encrypted = cipher.update(plainPin, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (err) {
    console.error('Error encrypting PIN:', err);
    return plainPin;
  }
}

/**
 * Decrypts the stored PIN back to plain text for the authenticated admin dashboard.
 */
export function decryptPin(encryptedPin: string): string {
  try {
    // If it's already a short number (e.g. legacy or unencrypted 4-digit PIN), return as is
    if (/^\d{3,10}$/.test(encryptedPin)) {
      return encryptedPin;
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(encryptedPin, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error decrypting PIN, returning raw:', err);
    return encryptedPin;
  }
}

/**
 * Creates a signed session token for visitors.
 * Format: `version.signature`
 * When the admin updates the PIN, the version changes and all old tokens instantly become invalid.
 */
export function createSessionToken(version: string = '1'): string {
  const hmac = crypto.createHmac('sha256', PIN_SECRET);
  hmac.update(`tayba_session_v_${version}`);
  const signature = hmac.digest('hex');
  return `${version}.${signature}`;
}

/**
 * Validates whether a given session token matches the expected signature and current version.
 */
export function verifySessionToken(token: string | undefined | null, currentVersion: string = '1'): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [tokenVersion, tokenSignature] = parts;
  
  // If the admin incremented the version, old tokens are rejected
  if (tokenVersion !== currentVersion) return false;
  
  const hmac = crypto.createHmac('sha256', PIN_SECRET);
  hmac.update(`tayba_session_v_${currentVersion}`);
  const expectedSignature = hmac.digest('hex');
  
  if (tokenSignature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(tokenSignature), Buffer.from(expectedSignature));
}
