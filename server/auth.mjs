// The kit's one admin (lenzi, 2026-11-12: "pagina admin per abilitare la modifica (unico utente).
// L'endpoint pubblico mostra solo le info."): a user and a password from the environment
// (KIT_ADMIN_USER, KIT_ADMIN_PASSWORD, in .env), a signed cookie once signed in. Nothing is kept on
// the server: the cookie carries when it ends and a signature made with the credentials, so a
// restart keeps the session and a new password ends it. A plain Node module, no dependencies.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'kit_session';
const WEEK = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK = 60 * 1000;

const digest = (text) => createHash('sha256').update(text).digest();

/** The same answer in the same time, whatever the texts' lengths. */
function same(a, b) {
  return timingSafeEqual(digest(String(a)), digest(String(b)));
}

/**
 * @param {{ user?: string, password?: string, now?: () => number }} options
 * `configured` is false without both: then nobody can sign in, and nothing can be saved.
 */
export function createAuth({ user = '', password = '', now = Date.now } = {}) {
  const configured = user !== '' && password !== '';
  const key = digest(`${user}\n${password}`);
  const sign = (expires) => createHmac('sha256', key).update(`${user}.${expires}`).digest('base64url');
  /** Wrong attempts, by address: five, then a minute of nothing. */
  const failures = new Map();

  return {
    configured,
    user: configured ? user : null,

    /** How long this address must wait before trying again, in seconds (0: it can try). */
    locked(address) {
      const entry = failures.get(address);
      if (!entry || entry.count < MAX_FAILURES) return 0;
      const left = entry.until - now();
      if (left <= 0) {
        failures.delete(address);
        return 0;
      }
      return Math.ceil(left / 1000);
    },

    /** The session's token for the right user and password, or null. */
    signIn(address, givenUser, givenPassword) {
      // both compared, always: the time says nothing about which one is wrong
      const right = same(givenUser, user) & same(givenPassword, password);
      if (!configured || !right) {
        const entry = failures.get(address) ?? { count: 0, until: 0 };
        entry.count += 1;
        entry.until = now() + LOCK;
        failures.set(address, entry);
        return null;
      }
      failures.delete(address);
      const expires = now() + WEEK;
      return { token: `${expires}.${sign(expires)}`, maxAge: WEEK / 1000 };
    },

    /** Whether a cookie header carries a session that is ours and not over. */
    signedIn(cookieHeader) {
      if (!configured) return false;
      const token = readCookie(cookieHeader, COOKIE);
      if (!token) return false;
      const dot = token.indexOf('.');
      const expires = Number(token.slice(0, dot));
      if (dot < 1 || !Number.isSafeInteger(expires) || expires <= now()) return false;
      return same(token.slice(dot + 1), sign(expires));
    },
  };
}

/** One cookie's value from a Cookie header. */
export function readCookie(header, name) {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const equals = part.indexOf('=');
    if (equals > 0 && part.slice(0, equals).trim() === name) return part.slice(equals + 1).trim();
  }
  return null;
}

/** The Set-Cookie value: script cannot read it, other sites cannot send it. `maxAge` 0 removes it. */
export function sessionCookie(token, maxAge, secure) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
