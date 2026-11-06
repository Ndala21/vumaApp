/**
 * VUMA Store - report and hide.
 *
 * Apple (App Store rule 1.2) and Google want every app that shows things written by
 * other people to let a customer (1) report it and (2) hide the person who wrote it,
 * and the team must answer reports quickly. This file is the app's side of that:
 *
 *   sendReport()   report a review, a product, a seller or a person
 *   blockUser()    hide a person (their reviews disappear for this customer)
 *   unblockUser()  show them again
 *   useBlocked()   the list of hidden people, kept up to date on every screen
 *   filterBlocked() takes the hidden people's items out of a list
 *
 * The server keeps the lists (so they follow the customer to a new phone) and e-mails
 * the VUMA team for every report.
 */
import { useEffect, useState } from 'react';
import { get, post, del } from '../api/client';

// Same keys as the server (apps/safety/models.py).
export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'abusive', label: 'Abusive or hateful' },
  { key: 'inappropriate', label: 'Sexual or violent' },
  { key: 'fake', label: 'Fake or misleading' },
  { key: 'illegal', label: 'Illegal or dangerous goods' },
  { key: 'other', label: 'Something else' },
];

export const REPORT_TITLES = {
  review: 'Report this review',
  product: 'Report this product',
  seller: 'Report this seller',
  user: 'Report this person',
};

// A short, plain sentence for any failure. The server's own words win when it sent some.
export function reportErrorText(err, fallback = 'Could not send. Please try again.') {
  if (!err) return fallback;
  if (err.type === 'SESSION_EXPIRED') return 'Please sign in again and try once more.';
  if (err.type === 'NETWORK_ERROR' || err.type === 'TIMEOUT') return 'No internet connection. Please try again.';
  if (err.status === 429 || err.type === 'RATE_LIMITED') return 'Too many reports. Please try again later.';
  const data = err.errors;
  if (data && typeof data.error === 'string' && data.error) return data.error;
  if (err.status >= 500 || err.type === 'SERVER_ERROR') return 'The server is busy. Please try again in a moment.';
  return fallback;
}

export async function sendReport({ kind, targetId, reason, details }) {
  const data = await post('safety/reports/', {
    kind,
    target_id: String(targetId),
    reason: reason || 'other',
    details: details || '',
  });
  return { already: !!(data && data.already_reported), message: (data && data.message) || '' };
}

// ── The hidden people (one list for the whole app) ───────────────────
let _ids = [];
let _people = [];
const _listeners = new Set();

function _set(ids, people) {
  _ids = ids;
  _people = people;
  _listeners.forEach((fn) => { try { fn(); } catch (e) { /* a screen that is gone */ } });
}

function _apply(data) {
  const ids = data && Array.isArray(data.blocked) ? data.blocked.map(String) : [];
  const people = data && Array.isArray(data.people)
    ? data.people.filter((p) => p && p.id).map((p) => ({ id: String(p.id), name: String(p.name || '') }))
    : [];
  _set(ids, people);
}

export function getBlockedIds() { return _ids; }
export function getBlockedPeople() { return _people; }

export function clearBlocked() {
  if (_ids.length || _people.length) _set([], []);
}

export async function loadBlocked() {
  try {
    _apply(await get('safety/blocks/'));
  } catch (e) { /* offline: keep what we have, the screens still work */ }
  return _ids;
}

// These two throw when the server says no, so the screen can tell the customer.
export async function blockUser(userId) {
  _apply(await post('safety/blocks/', { user_id: String(userId) }));
  return _ids;
}

export async function unblockUser(userId) {
  _apply(await del('safety/blocks/' + encodeURIComponent(String(userId)) + '/'));
  return _ids;
}

// Items written by someone hidden are left out. Items with no writer id stay.
export function filterBlocked(items, ids, idOf = (x) => x && x.user_id) {
  if (!Array.isArray(items)) return [];
  if (!ids || !ids.length) return items;
  const hidden = new Set(ids.map(String));
  return items.filter((x) => {
    const id = idOf(x);
    return id === undefined || id === null || !hidden.has(String(id));
  });
}

// Screens call this once; it loads the list for a signed-in customer, clears it for a guest,
// and re-renders the screen whenever someone is hidden or shown again anywhere in the app.
export function useBlocked(isAuthenticated) {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  useEffect(() => {
    if (isAuthenticated) loadBlocked();
    else clearBlocked();
  }, [isAuthenticated]);
  return { ids: _ids, people: _people };
}
