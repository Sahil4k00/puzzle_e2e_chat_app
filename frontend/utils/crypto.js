import { absoluteAssetUrl } from "./api";
import { identityStorageKey, readJson, roomKeyStorageKey, writeJson } from "./storage";

const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;

function ensureBrowserCrypto() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is only available in the browser");
  }

  return window.crypto;
}

function bytesToBase64(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function base64ToBytes(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function importPublicKey(publicKeyBase64) {
  return ensureBrowserCrypto().subtle.importKey(
    "spki",
    base64ToBytes(publicKeyBase64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );
}

async function importPrivateKey(privateKeyBase64) {
  return ensureBrowserCrypto().subtle.importKey(
    "pkcs8",
    base64ToBytes(privateKeyBase64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

async function importAesKey(rawKeyBase64) {
  return ensureBrowserCrypto().subtle.importKey(
    "raw",
    base64ToBytes(rawKeyBase64),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export async function generateIdentityKeyPair() {
  const cryptoApi = ensureBrowserCrypto();
  const keyPair = await cryptoApi.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await cryptoApi.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await cryptoApi.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: bytesToBase64(new Uint8Array(publicKey)),
    privateKey: bytesToBase64(new Uint8Array(privateKey))
  };
}

export async function ensureIdentityForEmail(email) {
  const key = identityStorageKey(email);
  const storedIdentity = readJson(key);

  if (storedIdentity?.publicKey && storedIdentity?.privateKey) {
    return storedIdentity;
  }

  const generatedIdentity = await generateIdentityKeyPair();
  writeJson(key, generatedIdentity);
  return generatedIdentity;
}

export function getStoredIdentity(email) {
  return readJson(identityStorageKey(email));
}

export async function createRoomSessionKey() {
  const cryptoApi = ensureBrowserCrypto();
  const key = await cryptoApi.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
  const rawKey = await cryptoApi.subtle.exportKey("raw", key);

  return bytesToBase64(new Uint8Array(rawKey));
}

export function getStoredRoomSessionKey(roomId) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(roomKeyStorageKey(roomId));
}

export function persistRoomSessionKey(roomId, sessionKey) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(roomKeyStorageKey(roomId), sessionKey);
}

export async function encryptRoomKeyForPublicKey(sessionKeyBase64, recipientPublicKeyBase64) {
  const publicKey = await importPublicKey(recipientPublicKeyBase64);
  const encrypted = await ensureBrowserCrypto().subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    base64ToBytes(sessionKeyBase64)
  );

  return bytesToBase64(new Uint8Array(encrypted));
}

export async function decryptRoomKeyEnvelope(encryptedSessionKeyBase64, privateKeyBase64) {
  const privateKey = await importPrivateKey(privateKeyBase64);
  const decrypted = await ensureBrowserCrypto().subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(encryptedSessionKeyBase64)
  );

  return bytesToBase64(new Uint8Array(decrypted));
}

export async function encryptTextMessage(plainText, sessionKeyBase64) {
  const aesKey = await importAesKey(sessionKeyBase64);
  const iv = ensureBrowserCrypto().getRandomValues(new Uint8Array(12));
  const encrypted = await ensureBrowserCrypto().subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(plainText)
  );

  return {
    encryptedContent: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    algorithm: "AES-GCM"
  };
}

export async function decryptTextMessage({ encryptedContent, iv }, sessionKeyBase64) {
  const aesKey = await importAesKey(sessionKeyBase64);
  const decrypted = await ensureBrowserCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(iv)
    },
    aesKey,
    base64ToBytes(encryptedContent)
  );

  return decoder.decode(decrypted);
}

export async function encryptAttachmentFile(file, sessionKeyBase64) {
  const aesKey = await importAesKey(sessionKeyBase64);
  const iv = ensureBrowserCrypto().getRandomValues(new Uint8Array(12));
  const plainBuffer = await file.arrayBuffer();
  const encryptedBuffer = await ensureBrowserCrypto().subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plainBuffer
  );

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    encryptedFile: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iv: bytesToBase64(iv),
    algorithm: "AES-GCM"
  };
}

export async function decryptAttachmentToObjectUrl(message, sessionKeyBase64) {
  if (!message?.attachment?.url || !message?.iv) {
    return null;
  }

  const response = await fetch(absoluteAssetUrl(message.attachment.url));

  if (!response.ok) {
    throw new Error("Unable to download encrypted attachment");
  }

  const encryptedBuffer = await response.arrayBuffer();
  const aesKey = await importAesKey(sessionKeyBase64);
  const decryptedBuffer = await ensureBrowserCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(message.iv)
    },
    aesKey,
    encryptedBuffer
  );

  const blob = new Blob([decryptedBuffer], {
    type: message.attachment.mimeType || "application/octet-stream"
  });

  return URL.createObjectURL(blob);
}
