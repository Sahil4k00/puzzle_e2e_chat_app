export const AUTH_STORAGE_KEY = "puzzle-chat:auth";

export function readJson(key, fallback = null) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

export function writeJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export function identityStorageKey(email) {
  return `puzzle-chat:identity:${email.toLowerCase()}`;
}

export function roomKeyStorageKey(roomId) {
  return `puzzle-chat:room-key:${roomId}`;
}
