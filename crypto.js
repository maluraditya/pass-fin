// AES-256-GCM encryption using Web Crypto (runs in Node 19+/modern browsers)
// Key material is derived from process.env.SECRET_ENCRYPTION_KEY (base64 or utf-8)

const ENC_ALGO = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV for GCM

function getRawKeyBytes() {
  const key = process.env.SECRET_ENCRYPTION_KEY || 'dev-insecure-key-change-me';
  try {
    // try base64 decode first
    return Buffer.from(key, 'base64');
  } catch (e) {
    return Buffer.from(key, 'utf-8');
  }
}

async function importAesKey() {
  const webcrypto = getCrypto();
  const raw = getRawKeyBytes();
  const raw32 = raw.length === 32 ? raw : Buffer.concat([raw, Buffer.alloc(Math.max(0, 32 - raw.length))]).slice(0,32);
  return webcrypto.subtle.importKey('raw', raw32, ENC_ALGO, false, ['encrypt', 'decrypt']);
}

function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto?.subtle) return window.crypto;
  // eslint-disable-next-line no-undef
  return globalThis.crypto || require('crypto').webcrypto;
}

export async function encryptText(plain) {
  if (plain == null) return '';
  const webcrypto = getCrypto();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importAesKey();
  const enc = new TextEncoder().encode(String(plain));
  const cipherBuf = await webcrypto.subtle.encrypt({ name: ENC_ALGO, iv }, key, enc);
  const out = Buffer.concat([Buffer.from(iv), Buffer.from(new Uint8Array(cipherBuf))]).toString('base64');
  return out;
}

export async function decryptText(cipher) {
  if (!cipher) return '';
  const webcrypto = getCrypto();
  // Tolerate legacy plaintext values (not base64 or too short)
  let raw;
  try {
    raw = Buffer.from(cipher, 'base64');
  } catch {
    return cipher;
  }
  if (!raw || raw.length <= IV_LENGTH) {
    // Not in expected IV||ciphertext format; likely plaintext
    return cipher;
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const data = raw.subarray(IV_LENGTH);
  const key = await importAesKey();
  const plainBuf = await webcrypto.subtle.decrypt({ name: ENC_ALGO, iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

