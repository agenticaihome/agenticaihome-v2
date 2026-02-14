// ============================================================================
// AgenticAiHome SDK — Cryptographic Utilities
// ============================================================================

/**
 * Compute blake2b-256 hash of input data.
 * Uses the SubtleCrypto API where available, falls back to manual implementation.
 * @param data - Raw bytes to hash
 * @returns 32-byte hash
 */
export function blake2b256(data: Uint8Array): Uint8Array {
  // In production, use @fleet-sdk/crypto's blake2b256
  // This is a placeholder that delegates to the fleet-sdk crypto module
  try {
    const { blake2b256: fleetBlake2b } = require('@fleet-sdk/crypto');
    return fleetBlake2b(data);
  } catch {
    throw new Error(
      'blake2b256 requires @fleet-sdk/crypto. Install it with: npm install @fleet-sdk/crypto'
    );
  }
}

/**
 * Create an input commitment: H(input || salt).
 * Used to commit to task input without revealing it on-chain.
 * @param input - Raw input data
 * @param salt - Random salt bytes
 * @returns 32-byte commitment hash
 */
export function createCommitment(input: Uint8Array, salt: Uint8Array): Uint8Array {
  const combined = new Uint8Array(input.length + salt.length);
  combined.set(input, 0);
  combined.set(salt, input.length);
  return blake2b256(combined);
}

/**
 * Verify a commitment against input and salt.
 * @param commitment - Previously created commitment
 * @param input - Original input data
 * @param salt - Original salt
 * @returns true if commitment matches
 */
export function verifyCommitment(
  commitment: Uint8Array,
  input: Uint8Array,
  salt: Uint8Array
): boolean {
  const expected = createCommitment(input, salt);
  return arraysEqual(commitment, expected);
}

/**
 * Create a rating commitment: H(rating || salt).
 * @param rating - Rating value (1-5)
 * @param salt - Random salt bytes
 * @returns 32-byte commitment hash
 */
export function createRatingCommitment(rating: number, salt: Uint8Array): Uint8Array {
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
  const ratingBytes = new Uint8Array([rating]);
  return createCommitment(ratingBytes, salt);
}

/**
 * Generate cryptographically random bytes.
 * @param length - Number of bytes
 * @returns Random byte array
 */
export function randomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    globalThis.crypto.getRandomValues(buf);
    return buf;
  }
  // Node.js fallback
  const { randomBytes: nodeRandom } = require('crypto');
  return new Uint8Array(nodeRandom(length));
}

/**
 * Convert a hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a UTF-8 string to Uint8Array.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Compare two byte arrays for equality.
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
