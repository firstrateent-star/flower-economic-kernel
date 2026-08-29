import crypto from 'node:crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
