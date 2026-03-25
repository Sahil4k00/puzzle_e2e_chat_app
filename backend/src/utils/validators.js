import crypto from "crypto";

import { createHttpError } from "./httpError.js";

export function requireString(value, fieldName, { min = 1, max = 500 } = {}) {
  if (typeof value !== "string") {
    throw createHttpError(400, `${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < min || trimmed.length > max) {
    throw createHttpError(
      400,
      `${fieldName} must be between ${min} and ${max} characters`
    );
  }

  return trimmed;
}

export function requireEmail(email) {
  const normalized = requireString(email, "email", { min: 5, max: 160 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw createHttpError(400, "email must be valid");
  }

  return normalized;
}

export function requirePassword(password) {
  return requireString(password, "password", { min: 8, max: 120 });
}

export function requirePositiveInteger(value, fieldName, { min = 1, max = 100000 } = {}) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw createHttpError(400, `${fieldName} must be an integer between ${min} and ${max}`);
  }

  return numeric;
}

export function normalizeAnswer(answer) {
  return requireString(answer, "answer", { min: 1, max: 200 }).toLowerCase();
}

export function hashAnswer(answer) {
  return crypto.createHash("sha256").update(answer).digest("hex");
}