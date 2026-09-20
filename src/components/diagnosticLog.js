/**
 * VUMA Store — Diagnostic Logger (TEMPORARY)
 * Minimal shared event log, rendered directly on-screen, so we can
 * see exact events without needing ADB or video upload. Remove this
 * file and its usages once the category-tap bug is found and fixed.
 */

let logs = [];
let listeners = [];

export function diagLog(msg) {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  logs = [...logs, `${time}  ${msg}`].slice(-40);
  listeners.forEach((fn) => fn());
}

export function getDiagLogs() {
  return logs;
}

export function subscribeDiagLog(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function clearDiagLogs() {
  logs = [];
  listeners.forEach((fn) => fn());
}